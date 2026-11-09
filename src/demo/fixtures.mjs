export const demoData = {
  profile: {
    id: "demo-user",
    displayName: "ME ID ·•••• 4821",
    verificationAt: "2024-04-18T09:42:00Z",
    identityStatus: "demo",
  },
  networks: [{ id: "mechain_400-1", name: "ME Testnet", status: "demo" }],
  coverage: {
    status: "partial",
    earliestIndexedBlock: "5210000",
    latestIndexedBlock: "5230897",
    requestedFrom: "2024-04-18T09:42:00Z",
    missingRanges: [],
    reason: "Illustrative development fixture only. No user history has been indexed.",
  },
  wallets: [
    { id: "wallet-1", address: "me1q8n7w...9k3d", network: "ME Testnet", associationDate: "2024-04-18", verified: true, sync: "Demo", lastBlock: "5230897", assets: 2 },
    { id: "wallet-2", address: "me1m4p2a...6v1x", network: "ME Testnet", associationDate: "2024-05-02", verified: true, sync: "Demo", lastBlock: "5230897", assets: 1 },
    { id: "wallet-3", address: "me1d9c5f...2r8b", network: "ME Testnet", associationDate: "2024-06-11", verified: false, sync: "Unverified", lastBlock: "—", assets: 0 },
  ],
  assets: [
    { id: "mechain_400-1:umec", name: "MEC", symbol: "MEC", kind: "Native", balance: "32,480.00", received: "48,200.00", sent: "15,720.00", verified: true, change: "+4.8%" },
    { id: "mechain_400-1:demo-usdc", name: "Demo USD Coin", symbol: "dUSDC", kind: "Fungible", balance: "1,248.50", received: "2,100.00", sent: "851.50", verified: false, change: "—" },
    { id: "mechain_400-1:demo-nft", name: "ME Pass Art #08", symbol: "NFT", kind: "NFT", balance: "1 item", received: "1", sent: "0", verified: false, change: "—" },
  ],
  transactions: [
    { timestamp: "2026-11-08T14:12:00Z", category: "Received", asset: "MEC", amount: "+1,250.00", wallet: "me1q8n7w...9k3d", txHash: "A19F…D02C", status: "Success", direction: "in" },
    { timestamp: "2026-11-07T09:34:00Z", category: "Sent", asset: "MEC", amount: "−480.00", wallet: "me1q8n7w...9k3d", txHash: "81C2…A640", status: "Success", direction: "out" },
    { timestamp: "2026-11-05T18:06:00Z", category: "Reward", asset: "MEC", amount: "+34.18", wallet: "me1m4p2a...6v1x", txHash: "D61B…8F9A", status: "Success", direction: "in" },
    { timestamp: "2026-11-03T11:21:00Z", category: "Staking deposit", asset: "MEC", amount: "−2,000.00", wallet: "me1m4p2a...6v1x", txHash: "0BA4…C18E", status: "Success", direction: "out" },
    { timestamp: "2026-10-30T16:40:00Z", category: "Bridge withdrawal", asset: "dUSDC", amount: "+250.00", wallet: "me1q8n7w...9k3d", txHash: "B710…3F15", status: "Success", direction: "in" },
    { timestamp: "2026-10-28T07:52:00Z", category: "Network fee", asset: "MEC", amount: "−0.02", wallet: "me1q8n7w...9k3d", txHash: "53E1…1B77", status: "Success", direction: "out" },
  ],
  monthly: [
    { month: "Jun", received: 3200, sent: 1700 }, { month: "Jul", received: 4700, sent: 2600 },
    { month: "Aug", received: 3900, sent: 2100 }, { month: "Sep", received: 5600, sent: 3300 },
    { month: "Oct", received: 4400, sent: 2900 }, { month: "Nov", received: 5100, sent: 2400 },
  ],
  rewards: [{ date: "Nov 05, 2026", type: "Staking reward", asset: "MEC", amount: "34.18", wallet: "me1m4p2a...6v1x" }, { date: "Oct 22, 2026", type: "Ecosystem reward", asset: "MEC", amount: "18.50", wallet: "me1q8n7w...9k3d" }],
  staking: [{ date: "Nov 03, 2026", type: "Deposit", asset: "MEC", amount: "2,000.00", status: "Active" }, { date: "Oct 10, 2026", type: "Reward", asset: "MEC", amount: "12.14", status: "Claimed" }],
};
