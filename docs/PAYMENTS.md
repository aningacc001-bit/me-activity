# Payments

## Status: disabled

No payment contract, destination, mainnet network configuration, finality policy or reversal mechanism was verified. The UI and API do not initiate transactions, display a fake destination, or activate a subscription. No payment contract was deployed.

The per-report product requirement is exactly **0.01 MEC per report request**; this is the configured display price. The raw base-unit value is not submitted because no production network/recipient is approved. Daily Premium price is unset and must be administrator-configurable after deployment.

## Verification boundary

`src/payments/verify.mjs` is a pure validation primitive. A production verifier must independently read a committed transaction from a trusted node/indexer and validate chain, exact recipient, exact raw amount, transaction result, order expiry, confirmations/finality, unique transaction hash and one-order/one-report binding. Frontend approval or transaction hash alone is not payment confirmation.

After confirmation, a report order produces one report request and a private expiring download URL. A daily subscription begins at confirmed payment time and expires exactly 24 hours later. Duplicate orders/transactions, underpayment, overpayment, wrong network/recipient, failed, expired or reversed transactions cannot unlock access. Reversals must revoke/subsequently mark the associated entitlement and create an audit event.

No funds are moved by this application. Never request private keys or seed phrases; any future wallet payment must be a user-approved wallet flow and remain separately authorized from analytics.
