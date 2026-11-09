# API Reference

Base prefix: `/api/v1`. These are ME ACTIVITY routes, not official ME PASS APIs. JSON errors use `{ "error", "code" }` where available. Authenticated financial routes currently return 401 outside development sample mode. The UI never treats development fixtures as chain facts.

## Implemented

- `GET /health`
- `GET /me/profile`, `/me/identity`, `/me/wallets`, `/me/assets`, `/me/balances`, `/me/transactions`, `/me/received`, `/me/sent`, `/me/rewards`, `/me/staking`, `/me/bridges`, `/me/analytics`, `/me/coverage`, `/me/overview`, `/me/reports`
- `GET /me/pricing`
- `POST /me/identity/connect` and `GET /me/identity/callback` return 503 until the documented ME PASS partner API's missing origin, authorization handoff, signing, and callback details are verified and implemented.
- `POST /me/payment-orders` returns 503; payments are disabled.
- `POST /me/reports` creates a development-only sample CSV with a 15-minute expiring link. Non-demo mode requires authentication and does not bypass report payment.
- Unknown record routes return 404; admin routes return 403 until server-side admin authorization is configured.

## Planned authenticated routes

`POST /me/identity/refresh`, `POST /me/identity/disconnect`, `POST /me/wallets/link`, `GET/DELETE /me/wallets/{walletId}`, `GET /me/transactions/{transactionId}`, `GET /me/reports/{reportId}`, `GET /me/reports/{reportId}/download`, `GET /me/payment-orders/{orderId}`, `GET /me/payment-history`, and `GET /me/subscription` are specified by product design but are not live account services in this scaffold.

All path IDs and filters must be validated server-side. Pagination must have bounded page size and stable ordering. Production handlers must derive user ID only from the validated server session, not a request parameter/header.
