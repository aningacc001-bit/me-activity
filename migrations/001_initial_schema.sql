begin;

create extension if not exists pgcrypto;
create schema if not exists app;
revoke all on schema app from public;

create table app.users (
  id uuid primary key references auth.users(id) on delete cascade,
  masked_me_id text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app.networks (
  id text primary key,
  chain_id text not null unique,
  name text not null,
  layer text not null check (layer in ('hub','rollup','da','other')),
  is_enabled boolean not null default false,
  explorer_base_url text,
  created_at timestamptz not null default now()
);

create table app.network_endpoints (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  endpoint_type text not null check (endpoint_type in ('rpc','rest','grpc','websocket')),
  base_url text not null,
  verified_at timestamptz,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (network_id, endpoint_type, base_url)
);

create table app.identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  provider text not null,
  subject_hash text not null,
  masked_me_id text,
  verification_status text not null default 'unknown' check (verification_status in ('unknown','pending','verified','revoked')),
  verified_at timestamptz,
  claims_version text,
  created_at timestamptz not null default now(),
  unique (provider, subject_hash),
  unique (user_id, provider)
);

create table app.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  network_id text not null references app.networks(id),
  address text not null,
  label text,
  association_date timestamptz,
  status text not null default 'pending' check (status in ('pending','verified','rejected','revoked')),
  first_seen_block bigint,
  last_indexed_block bigint,
  sync_status text not null default 'pending' check (sync_status in ('pending','syncing','synced','partial','failed','unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, network_id, address),
  check (first_seen_block is null or first_seen_block > 0),
  check (last_indexed_block is null or last_indexed_block > 0)
);

create table app.wallet_ownership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  wallet_id uuid not null references app.wallets(id) on delete cascade,
  method text not null check (method in ('me_pass','signature','on_chain_binding','manual_review')),
  proof_reference text,
  verified boolean not null default false,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (wallet_id, method),
  check (not verified or verified_at is not null)
);

create table app.wallet_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  wallet_id uuid not null references app.wallets(id) on delete cascade,
  provider text not null,
  scopes text[] not null default '{}',
  authorization_reference_hash text,
  status text not null check (status in ('pending','active','expired','revoked','failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table app.assets (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  kind text not null check (kind in ('native','fungible','mrc20','nft','staking','liquid_staking','wrapped','bridged','rollup','unknown')),
  denom text,
  contract_address text,
  name text,
  symbol text,
  decimals smallint check (decimals between 0 and 36),
  verified boolean not null default false,
  registry_source text,
  first_seen_block bigint,
  created_at timestamptz not null default now(),
  check (denom is not null or contract_address is not null or kind = 'unknown')
);
create unique index assets_network_denom_uq on app.assets(network_id, denom) where denom is not null;
create unique index assets_network_contract_uq on app.assets(network_id, lower(contract_address)) where contract_address is not null;

create table app.asset_metadata (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references app.assets(id) on delete cascade,
  source text not null,
  locale text not null default 'en',
  metadata jsonb not null default '{}',
  verified boolean not null default false,
  fetched_at timestamptz not null default now(),
  unique (asset_id, source, locale)
);

create table app.asset_prices (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references app.assets(id),
  quote_currency text not null,
  price numeric(38,18) not null check (price >= 0),
  source text not null,
  observed_at timestamptz not null,
  unique (asset_id, quote_currency, source, observed_at)
);

create table app.blocks (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  height bigint not null check (height > 0),
  hash text not null,
  parent_hash text,
  block_time timestamptz not null,
  raw_block jsonb not null,
  canonical boolean not null default true,
  indexed_at timestamptz not null default now(),
  unique (network_id, height, hash)
);
create unique index blocks_one_canonical_height on app.blocks(network_id, height) where canonical;
create index blocks_network_time_idx on app.blocks(network_id, block_time desc);

create table app.transactions (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  block_id uuid not null references app.blocks(id),
  tx_index integer not null check (tx_index >= 0),
  tx_hash text,
  code integer not null default 0,
  tx_time timestamptz not null,
  raw_tx jsonb not null,
  decoded_tx jsonb not null default '{}',
  memo text,
  unique (network_id, block_id, tx_index),
  unique (network_id, tx_hash)
);
create index transactions_time_idx on app.transactions(network_id, tx_time desc);
create index transactions_hash_idx on app.transactions(tx_hash);

create table app.chain_events (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  transaction_id uuid not null references app.transactions(id) on delete cascade,
  event_index integer not null check (event_index >= 0),
  event_type text not null,
  attributes jsonb not null default '[]',
  unique (transaction_id, event_index)
);
create index chain_events_type_idx on app.chain_events(network_id, event_type);

create table app.token_transfers (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  transaction_id uuid not null references app.transactions(id) on delete cascade,
  event_index integer not null,
  asset_id uuid references app.assets(id),
  raw_denom text,
  contract_address text,
  from_address text,
  to_address text,
  amount_raw numeric(78,0) not null check (amount_raw >= 0),
  classification text not null default 'unknown',
  evidence jsonb not null default '{}',
  unique (transaction_id, event_index)
);
create index token_transfers_from_idx on app.token_transfers(network_id, from_address);
create index token_transfers_to_idx on app.token_transfers(network_id, to_address);
create index token_transfers_asset_idx on app.token_transfers(asset_id);

create table app.transaction_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  transaction_id uuid not null references app.transactions(id) on delete cascade,
  wallet_id uuid not null references app.wallets(id) on delete cascade,
  direction text not null check (direction in ('in','out','fee','both')),
  matched_at timestamptz not null default now(),
  unique (user_id, transaction_id, wallet_id, direction)
);

create table app.transaction_classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users(id) on delete cascade,
  transaction_id uuid not null references app.transactions(id) on delete cascade,
  category text not null check (category in ('received','sent','internal_transfer','reward','staking_deposit','staking_withdrawal','staking_reward','swap','bridge_deposit','bridge_withdrawal','network_fee','contract_interaction','nft_activity','mint','burn','refund','reversal','unknown')),
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  rule_version text not null,
  created_at timestamptz not null default now(),
  unique (user_id, transaction_id, rule_version)
);

create table app.classification_evidence (
  id uuid primary key default gen_random_uuid(),
  classification_id uuid not null references app.transaction_classifications(id) on delete cascade,
  evidence_type text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);

create table app.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  wallet_id uuid not null references app.wallets(id) on delete cascade,
  asset_id uuid not null references app.assets(id),
  block_id uuid references app.blocks(id),
  amount_raw numeric(78,0) not null check (amount_raw >= 0),
  source text not null,
  observed_at timestamptz not null,
  unique (wallet_id, asset_id, block_id, source)
);
create index balances_user_asset_idx on app.balances(user_id, asset_id, observed_at desc);

create table app.daily_aggregates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  network_id text not null references app.networks(id),
  asset_id uuid not null references app.assets(id),
  day date not null,
  category text not null,
  received_raw numeric(78,0) not null default 0,
  sent_raw numeric(78,0) not null default 0,
  transaction_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, network_id, asset_id, day, category)
);
create index daily_aggregates_user_day_idx on app.daily_aggregates(user_id, day desc);

create table app.scan_cursors (
  network_id text not null references app.networks(id),
  stream text not null,
  height bigint not null default 0 check (height >= 0),
  updated_at timestamptz not null default now(),
  primary key (network_id, stream)
);

create table app.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  network_id text references app.networks(id),
  user_id uuid references app.users(id) on delete cascade,
  kind text not null,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  attempts integer not null default 0,
  payload jsonb not null default '{}',
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.indexer_health (
  id uuid primary key default gen_random_uuid(),
  network_id text not null references app.networks(id),
  service text not null,
  status text not null check (status in ('healthy','degraded','down')),
  latest_height bigint,
  latest_block_time timestamptz,
  checked_at timestamptz not null default now(),
  details jsonb not null default '{}'
);

create table app.reconciliation_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users(id) on delete cascade,
  network_id text references app.networks(id),
  wallet_id uuid references app.wallets(id) on delete cascade,
  asset_id uuid references app.assets(id),
  kind text not null,
  expected_raw numeric(78,0),
  observed_raw numeric(78,0),
  details jsonb not null default '{}',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  report_type text not null,
  format text not null check (format in ('csv','pdf','xlsx')),
  status text not null check (status in ('pending_payment','queued','generating','ready','failed','expired')),
  storage_key text,
  download_token_hash text,
  period_start timestamptz,
  period_end timestamptz,
  coverage_status text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.report_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  report_id uuid references app.reports(id) on delete set null,
  payment_order_id uuid,
  request_payload jsonb not null default '{}',
  status text not null check (status in ('awaiting_payment','queued','generating','ready','failed','expired')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table app.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  order_kind text not null check (order_kind in ('daily_subscription','report')),
  network_id text references app.networks(id),
  asset_id uuid references app.assets(id),
  recipient text,
  amount_raw numeric(78,0) check (amount_raw >= 0),
  price_display text not null,
  status text not null check (status in ('pending','confirmed','failed','expired','reversed')),
  unique_order_key uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table app.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.payment_orders(id),
  network_id text not null references app.networks(id),
  tx_hash text not null,
  block_hash text,
  amount_raw numeric(78,0) not null check (amount_raw >= 0),
  recipient text not null,
  status text not null check (status in ('pending','confirmed','failed','reversed')),
  confirmations integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (network_id, tx_hash),
  unique (order_id)
);

create table app.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  order_id uuid not null unique references app.payment_orders(id),
  plan text not null,
  status text not null check (status in ('active','expired','cancelled','reversed')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table app.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  subscription_id uuid not null references app.subscriptions(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  request_id text,
  created_at timestamptz not null default now()
);

create table app.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table app.authorization_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users(id) on delete cascade,
  provider text not null,
  event_type text not null,
  state_hash text,
  result text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table app.report_requests add constraint report_requests_payment_order_fk foreign key (payment_order_id) references app.payment_orders(id);

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = app, public
as $$ select exists (select 1 from app.users where id = auth.uid() and role = 'admin') $$;

alter table app.users enable row level security;
create policy users_self_select on app.users for select using (id = auth.uid() or app.is_admin());
create policy users_self_update on app.users for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'identity_links','wallets','wallet_ownership','wallet_authorizations','transaction_wallets',
    'balances','daily_aggregates','reports','report_requests','payment_orders',
    'subscriptions','subscription_events','user_sessions','authorization_events'
  ] loop
    execute format('alter table app.%I enable row level security', table_name);
    execute format('create policy owner_select on app.%I for select using (user_id = auth.uid() or app.is_admin())', table_name);
    execute format('create policy owner_insert on app.%I for insert with check (user_id = auth.uid() or app.is_admin())', table_name);
    execute format('create policy owner_update on app.%I for update using (user_id = auth.uid() or app.is_admin()) with check (user_id = auth.uid() or app.is_admin())', table_name);
    execute format('create policy owner_delete on app.%I for delete using (user_id = auth.uid() or app.is_admin())', table_name);
  end loop;
end $$;

alter table app.transaction_classifications enable row level security;
create policy classification_owner_select on app.transaction_classifications for select using (user_id = auth.uid() or app.is_admin());
create policy classification_owner_write on app.transaction_classifications for all using (user_id = auth.uid() or app.is_admin()) with check (user_id = auth.uid() or app.is_admin());

alter table app.reconciliation_records enable row level security;
create policy reconciliation_owner_select on app.reconciliation_records for select using (user_id = auth.uid() or app.is_admin());
create policy reconciliation_owner_write on app.reconciliation_records for all using (user_id = auth.uid() or app.is_admin()) with check (user_id = auth.uid() or app.is_admin());

alter table app.audit_logs enable row level security;
create policy audit_admin_select on app.audit_logs for select using (app.is_admin());
create policy audit_admin_insert on app.audit_logs for insert with check (app.is_admin());

alter table app.classification_evidence enable row level security;
create policy evidence_owner_select on app.classification_evidence for select using (
  exists (
    select 1 from app.transaction_classifications c
    where c.id = classification_id and (c.user_id = auth.uid() or app.is_admin())
  )
);

alter table app.sync_jobs enable row level security;
create policy sync_job_owner_select on app.sync_jobs for select using (user_id = auth.uid() or app.is_admin());
alter table app.indexer_health enable row level security;
create policy indexer_health_admin_select on app.indexer_health for select using (app.is_admin());
alter table app.scan_cursors enable row level security;
create policy scan_cursor_admin_select on app.scan_cursors for select using (app.is_admin());
alter table app.network_endpoints enable row level security;
create policy endpoint_admin_select on app.network_endpoints for select using (app.is_admin());

revoke all on all tables in schema app from public;
grant usage on schema app to authenticated;
grant select on all tables in schema app to authenticated;
alter default privileges in schema app revoke all on tables from public;

commit;
