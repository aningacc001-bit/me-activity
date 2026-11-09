# Accounting Rules

## Amount representation

Use unsigned raw base-unit decimal strings at API boundaries and PostgreSQL `NUMERIC(78,0)` in storage. `src/domain/accounting.mjs` uses `BigInt` for arithmetic and only formats after applying the asset's verified decimals. Never aggregate different asset IDs or use JavaScript floating point for token accounting.

## Classification

Supported category vocabulary: received, sent, internal transfer, reward, staking deposit, staking withdrawal, staking reward, swap, bridge deposit, bridge withdrawal, network fee, contract interaction, NFT activity, mint, burn, refund, reversal, unknown.

- A failed transaction contributes no successful transfer total.
- An internal transfer requires both endpoints to be in the same user's verified-wallet set and is excluded from external received/sent totals.
- A transfer is classified only when the chain evidence identifies the operation. A known contract call without a supported event stays a contract interaction and does not enter received/sent totals; unsupported message types/events stay unknown.
- Network fees are recorded in their actual fee asset and separate from transfer amounts.
- Reward/staking/swap/bridge flows require module-specific event evidence, use separate category totals, and must not be re-counted as ordinary receives/sends.
- NFTs are separate objects, not fungible balances or portfolio totals.
- Unknown assets remain visible with network + denom/contract identity and an unverified flag.
- Current balances come from trusted chain state queries/reconciled snapshots; they are not calculated as received minus sent.
- Fiat totals require a timestamped, attributable price source and stay separate from token-denominated totals.

`classifyTransfer` implements basic success, verified-wallet, internal-transfer and explicit reward/staking evidence cases. It is a primitive, not a complete chain classifier.
