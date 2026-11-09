# ME PASS Integration

## Verified public documentation

The [ME Pass Open Platform](https://mepassportal-open.mec.me/en-US) publishes an [Authorization API guide](https://mepassportal-open.mec.me/en-US/docs/article_5), last updated 2026-08-01. It documents a partner-server authorization API; this is not OAuth/OIDC. The portal's own [developer login](https://mepassportal-open.mec.me/en-US/login) uses a QR code, but that QR flow is for developers signing in to the portal and must not be reused as an end-user DApp flow.

The guide describes this partner flow:

1. The partner server requests a single-use, short-lived `authCode` by POSTing `appCode`, `scope`, millisecond `timestamp`, `nonce`, and HMAC-SHA256 `sign`.
2. The partner client starts user authorization with the `authCode`.
3. ME Open Platform calls the application's preconfigured callback with `accessToken`, `code`, `used`, `result`, and `cancelResult`.
4. The partner server queries `userAuthInfo` using the access token and decrypts the returned user data with the application `secretKey`.

The documentation says `secretKey` is server-only. Its example authorization payload includes personally identifying fields (name, phone, email) as well as `address`, `meid`, and `authTime`; ME ACTIVITY must request the narrowest supported scope and avoid retaining unnecessary data.

## Details still requiring confirmation

The public guide is not sufficient to safely enable the integration:

- It gives API paths under `/customer/openWeb/app/auth`, but no API origin. Its Node example instead calls `/openWeb/app/auth`, omitting `/customer`.
- It does not specify the client-side authorization URL, QR payload, or supported browser/app handoff for partner applications.
- The HMAC canonical string is printed with a multiplication sign immediately before `tamp={timestamp}`. The example repeats this spelling. Do not silently assume the intended `&timestamp=` form.
- The callback table calls `code` an authorization code, while `userAuthInfo` says its query parameter named `code` must contain the `accessToken`.
- Callback result types are inconsistent between the prose and example. Callback authenticity, token lifetime/revocation, and all retry semantics are not fully specified.
- The guide says AES and its examples use AES-256-ECB with a UTF-8 secret padded/truncated to 32 bytes, but does not specify an integrity/authentication mechanism. This must be confirmed before relying on decrypted identity claims.

Do not infer the partner API origin from the portal host or reuse the portal's internal `/api/portal/.../developerLogin` routes. Do not enable authentication based only on this guide.

## Current implementation boundary

`src/auth/me-pass.mjs` contains generic PKCE/state/nonce and verified-claim primitives, but those are not the partner API protocol described above. No API call, QR display, callback processing, token exchange, or identity decryption is implemented. The application remains fail-closed and returns 503 for ME PASS authorization until the missing details are confirmed and provider-contract tests pass.

Before implementation, obtain an approved app registration (`appCode` and `secretKey`), the partner API origin and exact paths, the end-user authorization handoff, and written confirmation of the signing string, callback token semantics, callback verification, token expiry/revocation, and encryption format. Keep credentials out of browser code and logs; never request or accept seed phrases, wallet passwords, or private keys. ME PASS identity authorization must not be described as signing or moving funds.

The portal's [public support page](https://mepassportal-open.mec.me/en-US/tech-support/contact-us) lists `devsupport@mec.me` for technical questions. It asks developers to include a wallet address in support requests; share that only directly with the official team if comfortable, and never send a mnemonic or private key.
