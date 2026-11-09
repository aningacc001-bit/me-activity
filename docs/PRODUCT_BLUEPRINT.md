# Product Blueprint

## Product

ME ACTIVITY is a read-only view of the financial activity associated with an authenticated ME ID. It must distinguish current state (balances) from event-derived lifetime flows (received, sent, rewards, fees, staking) and must expose coverage limits beside every aggregate.

## User experience

- Connect only through an official, documented ME PASS authorization method.
- Include only wallets with verifiable ownership and network scope.
- Start history at the verified ME ID timestamp only when the wallet association at that timestamp can also be established.
- Show per-network, per-denomination/contract records; never combine unlike units or include NFTs in fungible totals.
- Export only the data the account is authorized to access. Mark partial coverage on screen and in every report.
- Keep all signing, sending, staking, swapping and payment execution out of the read-only experience.

## Delivery boundaries

The current UI has all requested navigation sections and interactive search/range controls. In sample mode, figures are fixtures and have a persistent development banner. The actual ME PASS, report-payment, admin, and live-data capabilities remain unavailable until the production gates below are fulfilled.

## Release gates

1. Meta Earth supplies an approved third-party identity protocol, client registration, scopes, issuer metadata, claim definitions and test account.
2. An authorized integration establishes exact ME ID verification/association timestamps and an auditable wallet-ownership proof.
3. Meta Earth confirms mainnet chain ID, RPC/REST/WebSocket endpoints, explorer URL and supported Rollup/DA APIs.
4. Indexer decoders and reorg/backfill behavior are validated against real testnet fixtures and independently reconciled balances.
5. Production PostgreSQL/Supabase, session validation, RLS integration tests, secrets, backups, retention and monitoring are provisioned.
6. MEC payment network, recipient/contract, amount precision, confirmation/reversal policy and legal review are approved. No funds or contracts are deployed by this project.
7. Accessibility, dependency/SAST scans, privacy review, load tests and independent security review pass.
