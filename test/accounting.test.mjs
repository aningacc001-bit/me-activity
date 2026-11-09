import test from "node:test";
import assert from "node:assert/strict";
import { assertRawAmount, classifyFee, classifyTransfer, formatRawAmount, reconcileBalance } from "../src/domain/accounting.mjs";

test("raw token amounts use exact integer arithmetic", () => {
  assert.equal(assertRawAmount("900719925474099312345"), 900719925474099312345n);
  assert.equal(formatRawAmount("123456789", 6), "123.456789");
  assert.throws(() => assertRawAmount("1.2"), /integer strings/);
});

test("failed transactions are excluded even when their amount is absent", () => {
  assert.deepEqual(classifyTransfer({ code: 7 }), { category:"unknown", includeInTotals:false, reason:"failed_transaction" });
});

test("incoming and outgoing transfers are matched to verified wallets", () => {
  assert.equal(classifyTransfer({code:0,from:"outside",to:"owned",amount:"200",assetKey:"net:umec",verifiedWallets:["owned"]}).category,"received");
  assert.equal(classifyTransfer({code:0,from:"owned",to:"outside",amount:"200",assetKey:"net:umec",verifiedWallets:["owned"]}).category,"sent");
});

test("transfers between verified user wallets are internal", () => {
  const result = classifyTransfer({code:0,from:"a",to:"b",amount:"10",assetKey:"net:umec",verifiedWallets:["a","b"]});
  assert.equal(result.category,"internal_transfer");
  assert.equal(result.includeInTotals,false);
});

test("fees retain the actual fee asset", () => {
  assert.deepEqual(classifyFee({code:0,amount:"125",denom:"umec"}), {category:"network_fee",includeInTotals:false,includeInCategoryTotal:true,assetKey:"umec",amount:"125"});
  assert.equal(classifyFee({code:1,amount:"125",denom:"umec"}),null);
});

test("reward and staking categories require explicit evidence", () => {
  assert.equal(classifyTransfer({code:0,from:"",to:"owned",amount:"7",assetKey:"n:a",verifiedWallets:["owned"],evidenceType:"reward"}).category,"reward");
  assert.equal(classifyTransfer({code:0,from:"owned",to:"contract",amount:"7",assetKey:"n:a",verifiedWallets:["owned"],evidenceType:"staking_deposit"}).category,"staking_deposit");
  assert.equal(classifyTransfer({code:0,from:"x",to:"owned",amount:"7",verifiedWallets:["owned"]}).reason,"unresolved_asset");
});

test("swap, bridge and contract events do not leak into received or sent totals",()=>{
  const swap=classifyTransfer({code:0,from:"router",to:"owned",amount:"7",assetKey:"n:a",verifiedWallets:["owned"],evidenceType:"swap"});
  const bridge=classifyTransfer({code:0,from:"bridge",to:"owned",amount:"9",assetKey:"n:b",verifiedWallets:["owned"],evidenceType:"bridge_withdrawal"});
  const contract=classifyTransfer({code:0,from:"owned",to:"contract",amount:"9",assetKey:"n:b",verifiedWallets:["owned"],contractInteraction:true});
  assert.equal(swap.includeInTotals,false);assert.equal(swap.category,"swap");
  assert.equal(bridge.includeInTotals,false);assert.equal(bridge.category,"bridge_withdrawal");
  assert.equal(contract.category,"contract_interaction");
});

test("current balance reconciliation compares authoritative snapshots", () => {
  assert.equal(reconcileBalance({trustedRawBalance:"100",indexedRawBalance:"100"}).matches,true);
  assert.equal(reconcileBalance({trustedRawBalance:"100",indexedRawBalance:"99"}).matches,false);
});
