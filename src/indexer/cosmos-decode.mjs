import { createHash } from "node:crypto";

function readVarint(buffer, start) {
  let value = 0n;
  let shift = 0n;
  let offset = start;
  while (offset < buffer.length) {
    const byte = buffer[offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, offset };
    shift += 7n;
    if (shift > 70n) throw new Error("Invalid protobuf varint");
  }
  throw new Error("Truncated protobuf varint");
}

function fields(buffer) {
  const result = [];
  let offset = 0;
  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    offset = tag.offset;
    const number = Number(tag.value >> 3n);
    const wire = Number(tag.value & 7n);
    if (number === 0) throw new Error("Invalid protobuf field number");
    if (wire === 0) {
      const item = readVarint(buffer, offset);
      result.push({ number, wire, value: item.value });
      offset = item.offset;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (offset + size > buffer.length) throw new Error("Truncated fixed-width protobuf field");
      result.push({ number, wire, value: buffer.subarray(offset, offset + size) });
      offset += size;
    } else if (wire === 2) {
      const length = readVarint(buffer, offset);
      offset = length.offset;
      const size = Number(length.value);
      if (!Number.isSafeInteger(size) || offset + size > buffer.length) throw new Error("Truncated length-delimited protobuf field");
      result.push({ number, wire, value: buffer.subarray(offset, offset + size) });
      offset += size;
    } else {
      throw new Error(`Unsupported protobuf wire type ${wire}`);
    }
  }
  return result;
}

function all(list, number) { return list.filter((field) => field.number === number); }
function first(list, number) { return list.find((field) => field.number === number); }
function text(field) { return field ? field.value.toString("utf8") : ""; }
function coin(buffer) {
  const item = fields(buffer);
  return { denom: text(first(item, 1)), amount: text(first(item, 2)) };
}

function decodeMessage(typeUrl, bytes) {
  const message = fields(bytes);
  if (typeUrl === "/cosmos.bank.v1beta1.MsgSend") {
    return { type: "bank_send", from: text(first(message, 1)), to: text(first(message, 2)), amounts: all(message, 3).map((item) => coin(item.value)) };
  }
  if (typeUrl === "/cosmos.bank.v1beta1.MsgMultiSend") {
    const decodeParty = (buffer) => {
      const party = fields(buffer);
      return { address: text(first(party, 1)), coins: all(party, 2).map((item) => coin(item.value)) };
    };
    return { type: "bank_multi_send", inputs: all(message, 1).map((item) => decodeParty(item.value)), outputs: all(message, 2).map((item) => decodeParty(item.value)) };
  }
  return { type: "unknown", typeUrl, rawBase64: bytes.toString("base64") };
}

export function decodeTxRaw(encoded) {
  const raw = Buffer.from(encoded, "base64");
  const rawFields = fields(raw);
  const body = first(rawFields, 1)?.value;
  const authInfo = first(rawFields, 2)?.value;
  if (!body) throw new Error("TxRaw body bytes are missing");
  const bodyFields = fields(body);
  const messages = all(bodyFields, 1).map(({ value }) => {
    const any = fields(value);
    const typeUrl = text(first(any, 1));
    const messageValue = first(any, 2)?.value;
    if (!typeUrl || !messageValue) return { type: "unknown", typeUrl: typeUrl || null, rawBase64: value.toString("base64") };
    return decodeMessage(typeUrl, messageValue);
  });
  let fee = [];
  if (authInfo) {
    const feeField = first(fields(authInfo), 2);
    if (feeField) fee = all(fields(feeField.value), 1).map(({ value }) => coin(value));
  }
  return { memo: text(first(bodyFields, 2)), messages, fees: fee, rawBase64: encoded };
}

export function decodeBlockTransactions(block, blockResults) {
  const txs = block?.block?.data?.txs || [];
  const results = blockResults?.results?.txs_results || [];
  return txs.map((rawTx, index) => {
    const result = results[index] || {};
    let decoded;
    try { decoded = decodeTxRaw(rawTx); }
    catch (error) { decoded = { messages: [], fees: [], decodeError: error.message, rawBase64: rawTx }; }
    return {
      index,
      hash: createHash("sha256").update(Buffer.from(rawTx, "base64")).digest("hex").toUpperCase(),
      code: result.code == null ? -1 : Number(result.code),
      resultMissing: result.code == null,
      log: result.log || "",
      timestamp: block.block.header.time,
      rawBase64: rawTx,
      decoded,
      events: result.events || [],
    };
  });
}

export const protobufInternals = { fields, readVarint };
