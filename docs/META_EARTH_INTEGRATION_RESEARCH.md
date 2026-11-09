# Meta Earth Integration Research

Research was performed by opening the official public resources listed below and probing the user-supplied testnet RPC/REST endpoints. Endpoint status was checked on 2026-11-09 UTC. A reachable endpoint is not, by itself, proof of a production SLA or an official endorsement for this application.

## Verified

- The official GitHub organization exposes `me-hub`, `me-docs`, `meta-earth-js-sdk`, `meta-earth`, a Cosmos SDK fork, and a CometBFT fork: [openmetaearth](https://github.com/openmetaearth).
- ME Hub is described in its README as the settlement layer. The official network-details page describes a modular execution/Rollup layer, ME Hub settlement, and a data-availability layer. Hub consensus uses Tendermint/CometBFT; Rollups may have their own execution/network APIs. Hub-to-Rollup state submission and asset bridging are described at a high level, but not as an exhaustive analytics API: [Network Details](https://docs.mec.me/docs/getting-started-for-developers/network-details/).
- The official testnet RPC `https://beta-hub-26657.explorer-testnet.me/status` returned HTTP 200 and reported network `mechain_400-1`, CometBFT `0.37.5`, live height `5,230,897`, earliest height `1`, and `catching_up=false`. The official REST node-info route `https://beta-hub-1317.explorer-testnet.me/cosmos/base/tendermint/v1beta1/node_info` returned HTTP 200 and reported the same chain ID and `me-hub` application. These are the only node URLs configured by default.
- The testnet REST denom-metadata endpoint returned native denomination `umec`, display/name/symbol `MEC`, with display exponent 8. This validates the testnet unit metadata response, not the mainnet's current token registry or payment target.
- The supplied gRPC URL `https://beta-da-9090.explorer-testnet.me:9090` is recorded as user-provided. DNS resolution failed from this environment and a working gRPC service/reflection contract or DA query coverage could not be confirmed.
- The ME Hub repository contains public protobuf modules for `did`, `kyc`, `wstaking`, `rollapp`, `eibc`, `wnft` and other modules. The KYC query proto exposes public query routes including `/metaearth/kyc/protocol`, `/metaearth/kyc/DID`, `/metaearth/kyc/KYC`, and `/metaearth/kyc/QuerySubAccountDidResponse`. The DID proto exposes `/metaearth/did/did`. These are on-chain query APIs, not a ME PASS third-party sign-in protocol.
- The official JS SDK README documents `getMeIdByAddress`, `getMeIdByDid`, and `getMeIdBySubAccount`, balance and transaction queries, and flexible/fixed-term staking queries. It supports `testnet`/`mainnet` SDK mode; it says mainnet EVM operations require an explicitly configured EVM RPC and chain ID. SDK transaction methods can sign/broadcast, so this read-only app must use query paths only: [meta-earth-js-sdk](https://github.com/openmetaearth/meta-earth-js-sdk).
- The public `metaearth/wstaking` protobuf exposes stake/unstake, reward-withdrawal, fixed-deposit and fixed-deposit-withdrawal message/query families. The SDK documents HUB-layer staking queries such as delegation and delegation rewards. No exhaustive normalized transaction-event fixture set was verified.
- ME addresses use the `me1` Bech32 prefix according to the official [Account Details](https://docs.mec.me/docs/getting-started-for-developers/account-details/) documentation. The same page describes ME PASS as an official mobile wallet and mentions transaction signing; it does not describe a third-party DApp authorization protocol.
- The user-supplied [ME Pass Open Platform](https://mepassportal-open.mec.me/en-US) publishes an [Authorization API guide](https://mepassportal-open.mec.me/en-US/docs/article_5), last updated 2026-08-01. It documents a partner-server auth-code, callback/access-token, and encrypted user-info flow. This is not OAuth/OIDC; its API origin, client authorization handoff, and several signing/callback details remain unresolved (see `docs/ME_PASS_INTEGRATION.md`).
- Official token docs define MRC-20 as a WASM fungible-token contract interface with Uint128/string amounts and balance/token-info queries. MRC-721 defines NFT ownership, token IDs, transfers and metadata queries. These are contract standards, not a complete historical event feed: [MRC-20](https://docs.mec.me/docs/development-guides/mrc-token/mrc20-token-contract/), [MRC-721](https://docs.mec.me/docs/development-guides/mrc-token/mrc721-nft-contract/).
- The ME PASS product page describes identity authorization/management, one ME ID per person and ME ID verification benefits: [ME PASS](https://www.mec.me/en-US/me-pass).
- The explorer site rendered a public ME Explorer page, but its displayed home statistics and recent activity showed dashes/“No Data” during inspection. It cannot currently be treated as a dependable transaction-history API from that page alone: [ME Explorer](https://explorer.mec.me/).

## Not established; do not guess

- The partner authorization API's base origin, registered-app credentials, end-user QR/app handoff, exact HMAC canonical string, callback `code` semantics/authenticity, token lifetime/revocation contract, and complete authenticated-encryption details.
- An ME ID verification timestamp, wallet association date, complete list of associated addresses, or a supported proof that a wallet was associated at the ME ID verification time. Public DID/KYC query shape alone does not establish these fields.
- A verified mainnet chain ID. The user-suggested `me-chain` was not confirmed by the reviewed public network configuration. The local-development chain ID in the ME Hub README is not evidence of mainnet.
- A verified mainnet RPC, REST, WebSocket, gRPC, Rollup node, DA node, explorer transaction URL, rate limits, archival retention, or indexer SLA.
- A comprehensive official asset registry and mappings for every Rollup, wrapped/bridged token, MRC-20 contract, NFT, staking derivative and unknown denomination.
- Complete public event contracts and decoding rules for all reward/staking/bridge/swap/refund/reversal paths. Source protobufs identify many message/query types, but event matching and historical completeness still require schema-specific fixtures and chain verification.
- An official MEC payment recipient/contract, payment API, finality policy, reversal semantics, or an audited payment contract.

## Implementation consequences

- ME PASS connect and wallet authorization remain unavailable until the partner API's missing integration details are confirmed; the UI does not generate a fake QR code.
- Mainnet variables are blank. Network adapters must validate `node_info.network` against an independently verified chain ID before scanning.
- The testnet Hub REST/RPC routes can be used for authorized read-only development queries. The initial scanner only scans raw Hub blocks and decodes standard Cosmos `MsgSend`/`MsgMultiSend`; unknown transactions/events remain raw and unclassified.
- No testnet data is presented as production financial data. Production demo mode is rejected, and non-demo user financial routes require authentication.
- The report amount is displayed/configurable as exactly `0.01 MEC`, but payment activation remains disabled. Daily subscription price remains unset.
