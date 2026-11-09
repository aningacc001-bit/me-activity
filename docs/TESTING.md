# Testing

Run `node --test`. The suite exercises raw-unit arithmetic, transaction classification, internal transfers, failed transactions, fees, explicit reward/staking evidence, unknown assets, balance reconciliation, protobuf decoding, idempotent block scanning, retry and reorganization behavior, identity claims/state/session/ownership checks, payment validation and CSV escaping.

The test suite can run without npm using Node's built-in test runner. The app's PostgreSQL migration and RLS policies were not executed against a live database in this workspace; their behavior is not claimed as tested. No ME PASS provider, mainnet or live payment test credentials were available. E2E browser checks cover the development dashboard only.

## Required before release

- Add provider contract tests for successful/invalid/expired/revoked ME PASS authorization and multiple/unauthorized wallets.
- Add live testnet integration fixtures for block duplicates/gaps/timeouts/deep reorg/backfill/live sync, known message types, token/NFT/staking/bridge events and trusted balance queries.
- Add PostgreSQL integration tests for migrations, numeric precision, duplicate ingestion, per-user report isolation and RLS using two users plus admin/non-admin roles.
- Add payment verifier tests against an approved network with correct/wrong amount/recipient/network, failed/expired/reversed/duplicate transactions and exactly-once entitlement generation.
- Add report tests for PDF/XLSX generation, signed expiring links, coverage masks and paid/unpaid behavior.
- Add browser tests at desktop and mobile widths, accessibility checks and API authorization tests.
