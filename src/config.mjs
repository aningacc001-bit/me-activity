export function loadConfig(env = process.env) {
  const demoMode = env.DEMO_MODE === "true" && env.NODE_ENV !== "production";
  const reportPrice = env.MEC_REPORT_PRICE || "0.01";
  if (!/^\d+(?:\.\d+)?$/.test(reportPrice)) throw new Error("MEC_REPORT_PRICE must be a decimal string");

  return {
    nodeEnv: env.NODE_ENV || "development",
    host: env.HOST || "127.0.0.1",
    port: Number(env.PORT || 3000),
    demoMode,
    databaseUrl: env.DATABASE_URL || "",
    databaseSsl: env.DATABASE_SSL === "true",
    networkId: env.NETWORK_ID || "mechain_400-1",
    testnetRpcUrl: env.TESTNET_RPC_URL || "",
    testnetRestUrl: env.TESTNET_REST_URL || "",
    mainnetRpcUrl: env.MAINNET_RPC_URL || "",
    paymentEnabled: env.MEC_PAYMENT_ENABLED === "true",
    reportPrice,
    dailySubscriptionPrice: env.MEC_DAILY_SUBSCRIPTION_PRICE || null,
  };
}
