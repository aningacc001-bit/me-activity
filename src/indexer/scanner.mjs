import { decodeBlockTransactions } from "./cosmos-decode.mjs";

export class CometBftAdapter {
  constructor({ rpcUrl, expectedChainId, timeoutMs = 12000, fetchImpl = fetch }) {
    if (!rpcUrl) throw new Error("A verified RPC endpoint is required");
    this.rpcUrl = rpcUrl.replace(/\/$/, "");
    this.expectedChainId = expectedChainId;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async get(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.rpcUrl}${path}`, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async status() {
    const response = await this.get("/status");
    const result = response.result;
    if (!result?.node_info?.network || !result?.sync_info?.latest_block_height) throw new Error("RPC status response is incomplete");
    if (this.expectedChainId && result.node_info.network !== this.expectedChainId) throw new Error(`Wrong chain: expected ${this.expectedChainId}, got ${result.node_info.network}`);
    return { chainId: result.node_info.network, latestHeight: Number(result.sync_info.latest_block_height), catchingUp: result.sync_info.catching_up };
  }

  async block(height) {
    const encodedHeight = encodeURIComponent(String(height));
    const [block, results] = await Promise.all([this.get(`/block?height=${encodedHeight}`), this.get(`/block_results?height=${encodedHeight}`)]);
    return { block, results };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class BlockScanner {
  constructor({ adapter, store, networkId, startHeight = 1, confirmations = 1, retryLimit = 3, retryBaseMs = 100 }) {
    this.adapter = adapter;
    this.store = store;
    this.networkId = networkId;
    this.startHeight = startHeight;
    this.confirmations = confirmations;
    this.retryLimit = retryLimit;
    this.retryBaseMs = retryBaseMs;
  }

  async fetchWithRetry(height) {
    let error;
    for (let attempt = 0; attempt < this.retryLimit; attempt += 1) {
      try { return await this.adapter.block(height); }
      catch (caught) {
        error = caught;
        if (attempt + 1 < this.retryLimit) await sleep(this.retryBaseMs * (2 ** attempt));
      }
    }
    throw error;
  }

  async syncOnce({ maxBlocks = 10 } = {}) {
    const status = await this.adapter.status();
    const safeHeight = Math.max(0, status.latestHeight - this.confirmations + 1);
    let cursor = await this.store.getCursor(this.networkId);
    if (cursor == null) cursor = this.startHeight - 1;

    if (cursor >= this.startHeight) {
      const current = await this.fetchWithRetry(cursor);
      const observedHash = current.block?.result?.block_id?.hash;
      const storedHash = await this.store.getBlockHash(this.networkId, cursor);
      if (!observedHash) throw new Error(`RPC returned no block hash at indexed cursor ${cursor}`);
      if (!storedHash || storedHash !== observedHash) {
        await this.store.rollbackFrom(this.networkId, cursor);
        cursor -= 1;
      }
    }

    let scanned = 0;
    while (cursor < safeHeight && scanned < maxBlocks) {
      const height = cursor + 1;
      const response = await this.fetchWithRetry(height);
      const block = response.block?.result;
      const blockHash = block?.block_id?.hash;
      const actualHeight = Number(block?.block?.header?.height);
      if (!blockHash || actualHeight !== height) throw new Error(`Invalid block response for height ${height}`);
      const transactions = decodeBlockTransactions(response.block.result, response.results.result);
      await this.store.commitBlock({ networkId: this.networkId, height, hash: blockHash, time: block.block.header.time, raw: response.block.result, transactions });
      cursor = height;
      scanned += 1;
    }
    await this.store.setCursor(this.networkId, cursor);
    return { networkId: this.networkId, cursor, latestHeight: status.latestHeight, scanned, catchingUp: status.catchingUp };
  }
}
