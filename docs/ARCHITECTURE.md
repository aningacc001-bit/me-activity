# Architecture

## Runtime

```text
React dashboard (read-only)
        |
        v
Node HTTP API /api/v1  ----  ME PASS adapter (disabled until protocol is verified)
        |                     report/payment/admin handlers (fail closed)
        v
PostgreSQL / Supabase (RLS for user rows; service-only indexer writes)
        ^
        |
Persistent worker: CometBFT RPC -> raw blocks -> protobuf decoder -> normalized records
```

The API process and persistent indexer worker are separate. The current Node server is dependency-light; `pg` is loaded only by the worker. The browser UI uses React 18 and Chart.js from version-pinned CDNs. Fixtures live in `src/demo/fixtures.mjs` and are served only when `DEMO_MODE=true` outside production.

## Trust boundaries

- Browser input is never proof of identity, wallet ownership, classification, payment or admin rights.
- The network adapter reads only configured endpoint URLs and checks the observed chain ID.
- Raw blocks, transaction bytes and event payloads are retained separately from user-wallet matches and financial aggregates.
- The indexer is expected to use a restricted service credential; end users get read-only database access with RLS. The migration grants no end-user write privileges.
- Production API data routes remain unavailable until a signature-verifying ME PASS adapter and server session middleware are integrated.
- Payment order creation and report generation cannot run as a paid production flow until on-chain verification and an approved recipient are implemented.

## Data path

1. Scan a finalized/safe block height from the configured CometBFT RPC.
2. Persist raw block and transaction data idempotently.
3. Decode known transaction envelopes and retain unknown payloads unchanged.
4. Match public addresses only after the identity/ownership service establishes a verified wallet row.
5. Classify only evidence-backed transfers; default all unsupported types to `unknown`.
6. Read balances from an authoritative chain query and save the source/height. Reconcile snapshots against indexed transfer records without fabricating balances.
7. Build per-user, per-network, per-asset aggregates and propagate coverage state into reports.

## Current limitations

The present scanner writes blocks, transactions and generic events to PostgreSQL, but it is not a complete transaction/event indexer. It does not yet derive wallet links, decode all staking/bridge/MRC messages, query trusted balances, write daily user aggregates, or provide transaction history through production APIs. These require verified schemas and authenticated ownership context.
