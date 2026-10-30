/**
 * constants.js
 *
 * All chain and network constants for the PayQuick API.
 * Network is selected by the ARC_NETWORK environment variable:
 *   ARC_NETWORK=testnet  (default) — Arc Testnet, chain ID 5042002
 *   ARC_NETWORK=mainnet            — Arc Mainnet,  chain ID 5042
 *
 * Never hardcode chain IDs, RPC URLs, or contract addresses in other files.
 * Import from here so there is one place to audit.
 */

export const CURRENCIES = {
  USDC: "USDC"
};

const ARC_NETWORK = (process.env.ARC_NETWORK || "testnet").trim().toLowerCase();
export const IS_MAINNET = ARC_NETWORK === "mainnet";

// ── Chain IDs ──────────────────────────────────────────────────────────────

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;

/**
 * Chain ID for the currently active network.
 * Set ARC_NETWORK=mainnet to switch to Arc Mainnet.
 */
export const ACTIVE_CHAIN_ID = IS_MAINNET ? ARC_MAINNET_CHAIN_ID : ARC_TESTNET_CHAIN_ID;

/** Human-readable network name shown in error messages and logs. */
export const ACTIVE_NETWORK_NAME = IS_MAINNET ? "Arc Mainnet" : "Arc Testnet";

// ── RPC endpoints ──────────────────────────────────────────────────────────

/**
 * Arc Testnet RPC endpoint.
 * Override with ARC_TESTNET_RPC_URL in the environment.
 * When RPC_PROXY_BASE_URL and RPC_PROXY_CHAINS are present (Arc Studio),
 * the proxy URL is constructed automatically in the RPC helper.
 */
export const ARC_TESTNET_RPC_URL =
  process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io"; // arc-studio-allow-onchain-literal

/**
 * Arc Mainnet RPC endpoint.
 * Override with ARC_MAINNET_RPC_URL in the environment.
 * Required when ARC_NETWORK=mainnet.
 */
export const ARC_MAINNET_RPC_URL =
  process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io"; // arc-studio-allow-onchain-literal

/** RPC URL for the currently active network. */
export const ACTIVE_RPC_URL = IS_MAINNET ? ARC_MAINNET_RPC_URL : ARC_TESTNET_RPC_URL;

// ── Contract addresses ─────────────────────────────────────────────────────

/**
 * PaymentTracker contract address on Arc Testnet.
 * Set PAYMENT_TRACKER_ADDRESS_TESTNET in the environment.
 * When absent, verification falls back to direct native-transfer checks.
 */
export const PAYMENT_TRACKER_ADDRESS_TESTNET =
  process.env.PAYMENT_TRACKER_ADDRESS_TESTNET ||
  process.env.PAYMENT_TRACKER_ADDRESS || // legacy fallback
  null;

/**
 * PaymentTracker contract address on Arc Mainnet.
 * Set PAYMENT_TRACKER_ADDRESS_MAINNET in the environment.
 * Must be set before ARC_NETWORK=mainnet is used in production.
 */
export const PAYMENT_TRACKER_ADDRESS_MAINNET =
  process.env.PAYMENT_TRACKER_ADDRESS_MAINNET || null;

/** Contract address for the currently active network. */
export const ACTIVE_PAYMENT_TRACKER_ADDRESS = IS_MAINNET
  ? PAYMENT_TRACKER_ADDRESS_MAINNET
  : PAYMENT_TRACKER_ADDRESS_TESTNET;

/**
 * keccak256 topic for the PaymentSent event.
 * Set PAYMENT_SENT_TOPIC in the environment when the contract is deployed.
 * Must match the deployed ABI exactly. Same topic hash on both networks
 * when the same contract ABI is used.
 */
export const PAYMENT_SENT_TOPIC =
  process.env.PAYMENT_SENT_TOPIC || null;

// ── Arc USDC (ERC-20) ──────────────────────────────────────────────────────

/**
 * Arc USDC ERC-20 contract address — same address on both Arc Testnet and Mainnet.
 * Used for contract-mode payment verification (balanceOf / Transfer event checks).
 * NOT used for native transfer verification (eth_getBalance path).
 */
export const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000"; // arc-studio-allow-onchain-literal

/**
 * Arc USDC ERC-20 decimals — 6. Used for contract-mode amount verification only.
 * eth_getBalance and tx `value` use 18-decimal wei (ARC_NATIVE_WEI_DECIMALS).
 */
export const ARC_USDC_DECIMALS = 6;

/**
 * Arc native wei decimals for eth_getBalance and tx `value` fields.
 * Both Arc Testnet and Mainnet return 18-decimal wei from eth_getBalance,
 * identical to Ethereum. Confirmed empirically on Arc Testnet.
 */
export const ARC_NATIVE_WEI_DECIMALS = 18;
