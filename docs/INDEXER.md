# Indexer

## Worker

Run `node src/indexer/run.mjs` as a persistent worker, not inside a short-lived HTTP/serverless handler. It requires `DATABASE_URL`, the verified testnet RPC URL, applied migrations and an explicit positive `INDEX_START_HEIGHT`; it deliberately does not default to scanning millions of blocks. It checks `/status` chain ID, respects a configurable confirmation buffer, scans in batches, retries transient requests with exponential delay, and commits each block atomically.

## Current capabilities

- Reads CometBFT `/status`, `/block` and `/block_results`.
- Stores raw block JSON and raw transaction base64 separately from decoded messages and event attributes.
- Decodes the protobuf `TxRaw` envelope and standard Cosmos `MsgSend`/`MsgMultiSend`; unknown messages remain encoded.
- Uses network/block/transaction/event uniqueness constraints for safe rescans.
- Checks the current cursor's hash and marks displaced blocks noncanonical when a reorganization is detected.
- Stores scan cursors transactionally with block ingestion.

## Not implemented yet

- A full protocol-specific decoder for Ethermint EVM transactions/logs, Wasm/MRC execute events, IBC/MBC/bridge/Rollup/DA data, staking/reward state, NFT ownership and unknown token discovery.
- A verified ME ID timestamp-to-block resolver, wallet ownership matcher, trusted current-balance reader, asset registry ingestion, or user aggregate writer.
- Deep reorg/finality strategy, archival-history guarantees, range gap monitoring, worker leases, distributed locking, Prometheus metrics and an operational alerting stack.

Before mainnet use, replay a known fixture corpus, validate event order/amounts against independent node queries, test reorgs, and publish the exact supported network/asset coverage. Unknowns must not be dropped or labeled as successful financial totals.
