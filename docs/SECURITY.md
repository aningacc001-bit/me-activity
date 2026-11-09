# Security

## Controls in this repository

- No code path requests wallet secrets or signs user transactions.
- Demo data is opt-in and forcibly disabled under `NODE_ENV=production`.
- Financial API routes require an authenticated production identity; the missing identity adapter returns explicit 503/401 instead of granting access.
- Node responses set CSP, frame, MIME-sniffing, referrer and permissions headers; request bodies are bounded and a per-process rate limit is applied.
- Report preview links use cryptographically random IDs, private/no-store responses and a 15-minute expiry.
- Accounting uses `BigInt`/decimal strings; CSV cells are quoted and formula-prefixed values neutralized.
- Database migration uses `NUMERIC(78,0)`, foreign keys, uniqueness and RLS; clients receive SELECT only, with no user write privileges.

## Production work required

- Implement provider-backed signature validation, PKCE callback/state/nonce binding, secure `HttpOnly; Secure; SameSite` cookies, CSRF protection, session rotation/revocation and encrypted token storage.
- Apply RLS using a non-bypass authenticated role; keep service-role/indexer credentials server-only and separate. Verify user and admin access with separate accounts.
- Add a persistent distributed rate limiter, audit trail for admin access, request IDs, structured redacted logs, secret rotation, dependency scanning, backups/restore drills, object-storage encryption and retention policy.
- Validate transaction data against trusted RPCs; defend against RPC poisoning, reorgs, malicious contract metadata, SSRF and unsafe external image/metadata URLs.
- Do not trust frontend roles, payment results, report IDs or ownership flags. Admin role assignment must be performed out of band by a protected database procedure.

The current server is a development scaffold and is not a security-audited or production-authenticated financial service.
