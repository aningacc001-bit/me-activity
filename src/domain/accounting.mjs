const INTEGER = /^\d+$/;

export function assertRawAmount(value) {
  if (typeof value !== "string" || !INTEGER.test(value)) {
    throw new TypeError("Token amounts must be unsigned integer strings in base units");
  }
  return BigInt(value);
}

export function formatRawAmount(raw, decimals) {
  const value = assertRawAmount(raw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new RangeError("Invalid asset decimals");
  const digits = value.toString().padStart(decimals + 1, "0");
  if (decimals === 0) return digits;
  const whole = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function classifyTransfer(input) {
  const { code, from, to, amount, assetKey, verifiedWallets = [], evidenceType, contractInteraction = false } = input;
  if (code !== 0) return { category: "unknown", includeInTotals: false, reason: "failed_transaction" };
  const raw = assertRawAmount(amount);
  if (!assetKey) return { category: "unknown", includeInTotals: false, reason: "unresolved_asset" };

  const specialCategories = new Set(["reward","staking_deposit","staking_withdrawal","staking_reward","swap","bridge_deposit","bridge_withdrawal","nft_activity","mint","burn","refund","reversal"]);
  if (specialCategories.has(evidenceType)) return { category:evidenceType, includeInTotals:false, includeInCategoryTotal:true, assetKey, amount:raw.toString() };
  if (contractInteraction) return { category:"contract_interaction", includeInTotals:false, includeInCategoryTotal:false, reason:"contract_operation_requires_specific_evidence" };

  const owned = new Set(verifiedWallets);
  const senderOwned = owned.has(from);
  const recipientOwned = owned.has(to);
  if (senderOwned && recipientOwned) return { category: "internal_transfer", includeInTotals: false, includeInCategoryTotal:false, assetKey, amount: raw.toString() };
  if (recipientOwned) return { category: "received", includeInTotals: true, includeInCategoryTotal:true, assetKey, amount: raw.toString() };
  if (senderOwned) return { category: "sent", includeInTotals: true, includeInCategoryTotal:true, assetKey, amount: raw.toString() };
  return { category: "unknown", includeInTotals: false, reason: "wallet_not_matched" };
}

export function classifyFee({ code, amount, denom }) {
  if (code !== 0 || amount == null || denom == null) return null;
  const raw = assertRawAmount(amount);
  return { category: "network_fee", includeInTotals:false, includeInCategoryTotal:true, assetKey: denom, amount: raw.toString() };
}

export function reconcileBalance({ trustedRawBalance, indexedRawBalance }) {
  const trusted = assertRawAmount(trustedRawBalance);
  const indexed = assertRawAmount(indexedRawBalance);
  return { trustedRawBalance: trusted.toString(), indexedRawBalance: indexed.toString(), matches: trusted === indexed };
}
