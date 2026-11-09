begin;

insert into app.networks (id, chain_id, name, layer, is_enabled)
values ('mechain_400-1', 'mechain_400-1', 'ME Hub Testnet', 'hub', true)
on conflict (id) do update set chain_id = excluded.chain_id, name = excluded.name, layer = excluded.layer, is_enabled = excluded.is_enabled;

insert into app.network_endpoints (network_id, endpoint_type, base_url, verified_at, is_enabled)
values
  ('mechain_400-1', 'rpc', 'https://beta-hub-26657.explorer-testnet.me', now(), true),
  ('mechain_400-1', 'rest', 'https://beta-hub-1317.explorer-testnet.me', now(), true)
on conflict (network_id, endpoint_type, base_url) do update set verified_at = excluded.verified_at, is_enabled = excluded.is_enabled;

insert into app.assets (network_id, kind, denom, name, symbol, decimals, verified, registry_source)
values ('mechain_400-1', 'native', 'umec', 'MEC', 'MEC', 8, true, 'testnet REST denom metadata probe 2026-11-09')
on conflict do nothing;

commit;
