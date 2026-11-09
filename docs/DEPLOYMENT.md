# Deployment

## Local development

1. Use Node.js 20 or newer and install the `pg` package (`npm install`) in a normal Node environment.
2. Copy `.env.example` to `.env`; keep `DEMO_MODE=true` only for development.
3. Run `node --env-file=.env src/server.mjs` and open `http://localhost:3000`.
4. Run `node --test`.

The React and Chart.js runtime and display fonts are loaded from pinned public CDNs in the development UI.

## Persistent indexer

Provision PostgreSQL/Supabase, apply versioned SQL migrations, configure the verified testnet RPC and explicitly set `INDEX_START_HEIGHT` before running `node src/indexer/run.mjs` as a persistent worker with a service-only database role. Do not start the worker as a serverless request. Provide monitoring, durable logs, restart policy, backups and RPC throttling before backfill.

## Production blockers

- The current server does not implement a real session-backed ME PASS callback or a production database repository for the application API.
- Public research did not confirm a mainnet chain ID or RPC/REST endpoints. Leave mainnet variables blank until Meta Earth confirms them.
- Do not enable `MEC_PAYMENT_ENABLED`; payment verification/destination is not an integrated service.
- Demo fixtures and all user financial APIs must remain unavailable to unauthenticated production users.
- The dashboard's external CDN assets need a reviewed/self-hosted build strategy and CSP/SRI controls before hardened production deployment.

Vercel may host a built frontend, but the API and indexer require persistent server/worker services. Run the indexer separately from serverless frontend/API functions. Set secrets in the hosting provider only; never commit `.env`.
