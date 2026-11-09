# Database Schema

Migrations: `migrations/001_initial_schema.sql` creates the schema; `migrations/002_verified_testnet_seed.sql` seeds only the testnet Hub RPC/REST endpoints and the testnet native MEC metadata verified during research. They target Supabase PostgreSQL (`auth.users`, `auth.uid()`) and use `NUMERIC(78,0)` for base-unit quantities. Raw transaction/block JSON is separate from wallet-specific matches and classifications.

## Tables

- Identity and wallet: `users`, `identity_links`, `wallets`, `wallet_ownership`, `wallet_authorizations`, `user_sessions`, `authorization_events`.
- Network and asset registry: `networks`, `network_endpoints`, `assets`, `asset_metadata`, `asset_prices`.
- Chain data: `blocks`, `transactions`, `chain_events`, `token_transfers`.
- User accounting: `transaction_wallets`, `transaction_classifications`, `classification_evidence`, `balances`, `daily_aggregates`, `reconciliation_records`.
- Operations: `scan_cursors`, `sync_jobs`, `indexer_health`, `audit_logs`.
- Monetization/reports: `reports`, `report_requests`, `payment_orders`, `payment_transactions`, `subscriptions`, `subscription_events`.

## Access model

- Row-level security is enabled on user-owned data. Select policies bind to `auth.uid()`; admin reads call `app.is_admin()` against a server-provisioned user role.
- `authenticated` receives `SELECT` only. It receives no direct `INSERT`, `UPDATE` or `DELETE`; verified API/service-role workflows are the only intended writers. Never pass the Supabase service-role key to a browser.
- Public chain tables hold public blockchain facts. Endpoint, cursor, health, audit and user-specific tables have restricted policies.
- A production database deploy must test all policies using two distinct users and an unauthenticated role. The migration has not been applied against a live Supabase instance in this environment.

## Constraints and migration notes

- Asset identity is `(network_id, denom)` or `(network_id, lower(contract_address))`, never symbol alone.
- Blocks are unique by network, height and hash; one canonical block per network/height is enforced with a partial unique index.
- Transaction/event uniqueness makes block rescans idempotent.
- Payment transaction hashes are unique per network and one confirmed payment can be bound to only one order.
- `report_requests` receives its order foreign key after `payment_orders` is created in this migration.
- Run migrations using a privileged migration connection. Do not grant end-user write privileges to bypass row policies.
