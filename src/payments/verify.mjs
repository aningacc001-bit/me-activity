const INTEGER = /^\d+$/;

export function verifyPayment({ payment, order, alreadyProcessed = false, now = Date.now(), requiredConfirmations = 1 }) {
  if (!payment || !order) return { ok: false, reason: "missing_payment_or_order" };
  if (!payment.recipient || !order.recipient) return { ok: false, reason: "missing_recipient" };
  if (alreadyProcessed) return { ok: false, reason: "duplicate_payment" };
  if (order.status !== "pending") return { ok: false, reason: "order_not_pending" };
  if (!Number.isFinite(order.expiresAt) || order.expiresAt <= now) return { ok: false, reason: "expired_order" };
  if (payment.networkId !== order.networkId) return { ok: false, reason: "wrong_network" };
  if (payment.recipient.toLowerCase() !== order.recipient.toLowerCase()) return { ok: false, reason: "wrong_recipient" };
  if (!INTEGER.test(payment.amountRaw) || payment.amountRaw !== order.amountRaw) return { ok: false, reason: "wrong_amount" };
  if (payment.code !== 0 || payment.status !== "confirmed" || payment.confirmations < requiredConfirmations) return { ok: false, reason: "unconfirmed_or_failed" };
  if (!payment.txHash || !payment.blockHash) return { ok: false, reason: "missing_chain_proof" };
  return { ok: true, txHash: payment.txHash, blockHash: payment.blockHash };
}

export function dailySubscriptionExpiry(confirmedAt) {
  const confirmed = new Date(confirmedAt);
  if (!Number.isFinite(confirmed.getTime())) throw new TypeError("Invalid payment confirmation time");
  return new Date(confirmed.getTime() + 24 * 60 * 60 * 1000);
}

export function reportOrderAmount() {
  return { display: "0.01 MEC", raw: null, enabled: false, reason: "MEC base-unit precision and payment destination are not yet verified" };
}
