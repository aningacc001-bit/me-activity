# ME ACTIVITY

Read-only financial analytics for the Meta Earth ecosystem. This repository contains a React dashboard, a versioned Node API, PostgreSQL/Supabase migration, a CometBFT block scanner, a limited Cosmos transaction decoder, accounting primitives, a CSV report path, and automated unit/API tests.

**Integration status:** this is a runnable development foundation, not a production financial service. The ME PASS third-party login protocol, verified mainnet node URLs, complete historical/event coverage, production database authorization, and MEC payment destination are not publicly documented in the sources reviewed. Those paths fail closed. Development fixtures are visibly labelled and are never returned when `NODE_ENV=production`.

## Run the sample dashboard

Requirements: Node.js 20+. The React and Chart.js runtime is loaded from pinned public CDNs; an internet connection is needed for those libraries and fonts.

```sh
cp .env.example .env
node --env-file=.env src/server.mjs
```

Open `http://localhost:3000`. The sample dataset is illustrative, is isolated in `src/demo/fixtures.mjs`, and is enabled only outside production. No wallet is connected and no chain data is represented as real.

## Tests

```sh
node --test
```

`pg` is required to run the persistent indexer after installing dependencies. `npm install` is the standard install command in an environment with npm. The indexer requires PostgreSQL migrations and the verified testnet RPC URL. It does not run as part of the web request process.

## Deployment readiness

Do not deploy this as a live financial product until the gates in [Deployment](docs/DEPLOYMENT.md) are cleared. In particular, no production sign-in, user-data API, MEC payment, or mainnet scanning is enabled by this scaffold.

## Documentation

- [Product blueprint](docs/PRODUCT_BLUEPRINT.md)
- [Meta Earth integration research](docs/META_EARTH_INTEGRATION_RESEARCH.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Indexer](docs/INDEXER.md)
- [ME PASS integration](docs/ME_PASS_INTEGRATION.md)
- [Accounting rules](docs/ACCOUNTING_RULES.md)
- [API reference](docs/API_REFERENCE.md)
- [Payments](docs/PAYMENTS.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
