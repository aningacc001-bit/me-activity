export async function createPostgresStore(databaseUrl, ssl = false) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: databaseUrl, ssl: ssl ? { rejectUnauthorized: true } : false, max: 6 });
  await pool.query("select 1");

  return {
    pool,
    async getCursor(networkId) {
      const { rows } = await pool.query("select height from app.scan_cursors where network_id = $1 and stream = 'hub'", [networkId]);
      return rows[0] ? Number(rows[0].height) : null;
    },
    async getBlockHash(networkId, height) {
      const { rows } = await pool.query("select hash from app.blocks where network_id = $1 and height = $2 and canonical", [networkId, height]);
      return rows[0]?.hash || null;
    },
    async rollbackFrom(networkId, height) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("update app.blocks set canonical = false where network_id = $1 and height >= $2", [networkId, height]);
        await client.query("update app.scan_cursors set height = $2 where network_id = $1 and stream = 'hub'", [networkId, height - 1]);
        await client.query("insert into app.reconciliation_records (network_id, kind, details) values ($1, 'reorg', $2::jsonb)", [networkId, JSON.stringify({ fromHeight: height, detectedAt: new Date().toISOString() })]);
        await client.query("commit");
      } catch (error) { await client.query("rollback"); throw error; }
      finally { client.release(); }
    },
    async setCursor(networkId, height) {
      await pool.query("insert into app.scan_cursors (network_id, stream, height, updated_at) values ($1, 'hub', $2, now()) on conflict (network_id, stream) do update set height = excluded.height, updated_at = now()", [networkId, height]);
    },
    async commitBlock(input) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const inserted = await client.query("insert into app.blocks (network_id, height, hash, block_time, raw_block, canonical) values ($1,$2,$3,$4,$5::jsonb,true) on conflict (network_id,height,hash) do update set block_time=excluded.block_time, raw_block=excluded.raw_block, canonical=true returning id", [input.networkId, input.height, input.hash, input.time, JSON.stringify(input.raw)]);
        if (inserted.rows[0]) {
          for (const tx of input.transactions) {
            const stored = await client.query("insert into app.transactions (network_id, block_id, tx_index, tx_hash, code, raw_tx, decoded_tx, tx_time) values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) on conflict (network_id,tx_hash) do update set block_id=excluded.block_id, tx_index=excluded.tx_index, code=excluded.code, raw_tx=excluded.raw_tx, decoded_tx=excluded.decoded_tx, tx_time=excluded.tx_time returning id", [input.networkId, inserted.rows[0].id, tx.index, tx.hash, tx.code, JSON.stringify({ base64: tx.rawBase64, events: tx.events }), JSON.stringify(tx.decoded), tx.timestamp]);
            if (!stored.rows[0]) continue;
            for (const [eventIndex, event] of tx.events.entries()) {
              await client.query("insert into app.chain_events (network_id, transaction_id, event_index, event_type, attributes) values ($1,$2,$3,$4,$5::jsonb) on conflict (transaction_id,event_index) do nothing", [input.networkId, stored.rows[0].id, eventIndex, event.type || "unknown", JSON.stringify(event.attributes || [])]);
            }
          }
        }
        await client.query("insert into app.scan_cursors (network_id, stream, height, updated_at) values ($1, 'hub', $2, now()) on conflict (network_id, stream) do update set height = greatest(app.scan_cursors.height, excluded.height), updated_at = now()", [input.networkId, input.height]);
        await client.query("commit");
      } catch (error) { await client.query("rollback"); throw error; }
      finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
}
