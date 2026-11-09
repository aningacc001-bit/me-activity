import { loadConfig } from "../config.mjs";
import { createPostgresStore } from "./postgres-store.mjs";
import { BlockScanner, CometBftAdapter } from "./scanner.mjs";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for the persistent indexer");
if (!config.testnetRpcUrl) throw new Error("TESTNET_RPC_URL is required; do not substitute an unverified endpoint");
const startHeight = Number(process.env.INDEX_START_HEIGHT);
if (!Number.isSafeInteger(startHeight) || startHeight < 1) throw new Error("Set INDEX_START_HEIGHT explicitly after selecting the required backfill boundary");

const store = await createPostgresStore(config.databaseUrl, config.databaseSsl);
const adapter = new CometBftAdapter({ rpcUrl: config.testnetRpcUrl, expectedChainId: config.networkId });
const scanner = new BlockScanner({
  adapter,
  store,
  networkId: config.networkId,
  startHeight,
  confirmations: Number(process.env.INDEX_CONFIRMATIONS || 1),
});
const pollMs = Number(process.env.INDEX_POLL_MS || 4000);
let stopped = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopped = true; });

while (!stopped) {
  try {
    const result = await scanner.syncOnce({ maxBlocks: 20 });
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
    if (!result.scanned) await new Promise((resolve) => setTimeout(resolve, pollMs));
  } catch (error) {
    console.error(JSON.stringify({ at: new Date().toISOString(), error: error.message }));
    await new Promise((resolve) => setTimeout(resolve, Math.min(pollMs * 2, 30000)));
  }
}
await store.close();
