import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { loadConfig } from "./config.mjs";
import { demoData } from "./demo/fixtures.mjs";
import { completeHistoryCsv } from "./reports/csv.mjs";
import { financialReportPdf } from "./reports/pdf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const config = loadConfig();
const reports = new Map();
const ipBuckets = new Map();
const maxBodyBytes = 100_000;
const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon" };

function json(res, status, payload) {
  res.writeHead(status, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" });
  res.end(JSON.stringify(payload));
}

function limited(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || "unknown";
  const bucket = ipBuckets.get(key) || { started:now, count:0 };
  if (now - bucket.started > 60_000) { bucket.started = now; bucket.count = 0; }
  bucket.count += 1;
  ipBuckets.set(key, bucket);
  return bucket.count > 180;
}

async function bodyJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("Request body too large"), { statusCode:413 });
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid JSON body"), { statusCode:400 }); }
}

function authRequired(res) {
  json(res, 401, { error:"Authentication required", code:"AUTH_NOT_CONFIGURED", message:"ME PASS authorization is unavailable until the official provider protocol is verified." });
}

function responseData(data) { return { data, demo:true, readOnly:true }; }

async function api(req, res, url, appConfig) {
  const route = `${req.method} ${url.pathname}`;
  if (route === "GET /api/v1/health") {
    return json(res, 200, { status:"degraded", app:"ME ACTIVITY", demoMode:appConfig.demoMode, database:appConfig.databaseUrl?"configured":"not_configured", mePass:"unavailable", mainnet:"unconfigured", payments:appConfig.paymentEnabled?"disabled_pending_verification":"disabled" });
  }
  if (route === "GET /api/v1/me/pricing") {
    return json(res, 200, { report:{ amount:appConfig.reportPrice, asset:"MEC", enabled:false, note:"Payment disabled pending verified destination and chain verifier." }, dailyPremium:{ amount:appConfig.dailySubscriptionPrice, asset:"MEC", enabled:false, note:"Daily subscription price is not configured." } });
  }
  if (route === "POST /api/v1/me/identity/connect") return json(res, 503, { error:"ME PASS authorization adapter unavailable", code:"IDENTITY_PROVIDER_NOT_VERIFIED" });
  if (route === "GET /api/v1/me/identity/callback") return json(res, 503, { error:"No authorization callback is configured", code:"IDENTITY_PROVIDER_NOT_VERIFIED" });
  if (["POST /api/v1/me/identity/refresh","POST /api/v1/me/identity/disconnect","POST /api/v1/me/wallets/link"].includes(route)) return authRequired(res);
  if (route === "POST /api/v1/me/payment-orders") return json(res, 503, { error:"Live MEC payments are disabled", code:"PAYMENTS_DISABLED" });
  if (route === "GET /api/v1/me/payment-history" || route === "GET /api/v1/me/subscription") return authRequired(res);
  if (route.startsWith("/api/v1/admin")) return json(res, 403, { error:"Administrator authorization is unavailable", code:"ADMIN_AUTH_REQUIRED" });

  const dataRoutes = new Map([
    ["/api/v1/me/profile", () => demoData.profile],
    ["/api/v1/me/identity", () => demoData.profile],
    ["/api/v1/me/overview", () => demoData],
    ["/api/v1/me/wallets", () => demoData.wallets],
    ["/api/v1/me/assets", () => demoData.assets],
    ["/api/v1/me/balances", () => demoData.assets.map(({id,symbol,balance}) => ({id,symbol,balance}))],
    ["/api/v1/me/transactions", () => demoData.transactions],
    ["/api/v1/me/received", () => demoData.transactions.filter((tx) => tx.direction === "in")],
    ["/api/v1/me/sent", () => demoData.transactions.filter((tx) => tx.direction === "out")],
    ["/api/v1/me/rewards", () => demoData.rewards],
    ["/api/v1/me/staking", () => demoData.staking],
    ["/api/v1/me/bridges", () => demoData.transactions.filter((tx) => tx.category.toLowerCase().includes("bridge"))],
    ["/api/v1/me/analytics", () => ({ monthly:demoData.monthly, assets:demoData.assets, networks:demoData.networks })],
    ["/api/v1/me/coverage", () => demoData.coverage],
    ["/api/v1/me/reports", () => [...reports.values()].map(({csv,...report}) => report)],
  ]);

  if (url.pathname.match(/^\/api\/v1\/me\/reports\/[^/]+\/download$/) && req.method === "GET") {
    if (!appConfig.demoMode) return authRequired(res);
    const id = url.pathname.split("/")[5];
    const report = reports.get(id);
    if (!report || report.expiresAt <= Date.now()) return json(res, 404, { error:"Report link expired or unavailable" });
    res.writeHead(200, { "content-type":report.contentType, "content-disposition":`attachment; filename=${report.fileName}`, "cache-control":"private, no-store", "x-content-type-options":"nosniff" });
    return res.end(report.content);
  }

  if (route === "POST /api/v1/me/reports") {
    if (!appConfig.demoMode) return authRequired(res);
    const request = await bodyJson(req);
    const format = request.format === "pdf" ? "pdf" : "csv";
    const id = randomBytes(18).toString("base64url");
    const now = Date.now();
    const summary = {
      meIdReference:demoData.profile.displayName,
      verificationDate:demoData.profile.verificationAt,
      wallets:demoData.wallets.filter((wallet)=>wallet.verified).map((wallet)=>wallet.address),
      networks:demoData.networks.map((network)=>network.id),
      period:"All available sample history",
      coverageStatus:demoData.coverage.status,
      coverageNote:demoData.coverage.reason,
      transactionCount:demoData.transactions.length,
      generatedAt:new Date(now).toISOString(),
      receivedTotals:demoData.assets.filter((asset)=>asset.kind!=="NFT").map((asset)=>[asset.symbol,asset.received]),
      sentTotals:demoData.assets.filter((asset)=>asset.kind!=="NFT").map((asset)=>[asset.symbol,asset.sent]),
      rewardSummary:`${demoData.rewards.length} illustrative records`,
      stakingSummary:`${demoData.staking.length} illustrative records`,
    };
    const rows=demoData.transactions.map((tx)=>({ timestamp:tx.timestamp, network:"mechain_400-1", wallet:tx.wallet, category:tx.category, asset:tx.asset, amountRaw:tx.amount, txHash:tx.txHash, status:tx.status }));
    const content=format==="pdf"?financialReportPdf(summary):completeHistoryCsv(summary,rows);
    const report = { id, name:"ME ACTIVITY development sample", createdAt:new Date(now).toISOString(), expiresAt:now+15*60_000, demo:true, status:"ready", content, contentType:format==="pdf"?"application/pdf":"text/csv; charset=utf-8", fileName:format==="pdf"?"me-activity-demo.pdf":"me-activity-demo.csv" };
    reports.set(id, report);
    return json(res, 201, { id, name:report.name, status:report.status, demo:true, downloadUrl:`/api/v1/me/reports/${id}/download`, expiresAt:new Date(report.expiresAt).toISOString() });
  }

  if (req.method === "GET" && dataRoutes.has(url.pathname)) {
    if (!appConfig.demoMode) return authRequired(res);
    return json(res, 200, responseData(dataRoutes.get(url.pathname)()));
  }
  if (route === "GET /api/v1/me/reports" || route.startsWith("GET /api/v1/me/transactions/") || route.startsWith("GET /api/v1/me/wallets/") || route.startsWith("GET /api/v1/me/payment-orders/")) {
    if (!appConfig.demoMode) return authRequired(res);
    return json(res, 404, { error:"Record not found" });
  }
  return json(res, 404, { error:"Not found", code:"ROUTE_NOT_FOUND" });
}

async function staticFile(req, res, url, appConfig) {
  let pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (pathname === "/demo-data.js") {
    if (!appConfig.demoMode) return json(res, 404, { error:"Not found" });
    res.writeHead(200, { "content-type":"text/javascript; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" });
    return res.end(`window.ME_ACTIVITY_DEMO=true;window.ME_ACTIVITY_DATA=${JSON.stringify(demoData)};`);
  }
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root,"index.html")) return json(res, 404, { error:"Not found" });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return json(res, 404, { error:"Not found" });
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type":mime[ext] || "application/octet-stream", "cache-control":ext===".html"?"no-store":"public, max-age=300", "x-content-type-options":"nosniff" });
    if (req.method === "HEAD") return res.end();
    return res.end(await readFile(filePath));
  } catch { return json(res, 404, { error:"Not found" }); }
}

export function createAppServer({ appConfig = config } = {}) {
  return createServer(async (req, res) => {
    res.setHeader("x-content-type-options","nosniff");
    res.setHeader("referrer-policy","strict-origin-when-cross-origin");
    res.setHeader("x-frame-options","DENY");
    res.setHeader("permissions-policy","camera=(), microphone=(), geolocation=()");
    res.setHeader("content-security-policy","default-src 'self'; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if (limited(req)) return json(res, 429, { error:"Rate limit exceeded" });
    if (!["GET","HEAD","POST"].includes(req.method)) return json(res, 405, { error:"Method not allowed" });
    let url;
    try { url = new URL(req.url, `http://${req.headers.host || "localhost"}`); }
    catch { return json(res, 400, { error:"Invalid URL" }); }
    if (url.pathname.startsWith("/api/")) {
      try { return await api(req,res,url,appConfig); }
      catch (error) { return json(res, error.statusCode || 500, { error:error.statusCode ? error.message : "Internal service error" }); }
    }
    return staticFile(req,res,url,appConfig);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (config.nodeEnv === "production" && config.demoMode) throw new Error("Demo fixtures cannot be enabled in production");
  if (config.nodeEnv === "production" && !config.databaseUrl) throw new Error("DATABASE_URL is required in production");
  const server = createAppServer();
  server.listen(config.port, config.host, () => console.log(`ME ACTIVITY listening on http://${config.host}:${config.port} (${config.demoMode?"development sample mode":"read-only / no identity provider"})`));
}
