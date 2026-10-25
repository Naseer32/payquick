export const CURRENCIES = {
  USDC: "USDC"
};

/**
 * Arc Testnet chain ID (decimal).
 * Source: shared/src/constants.js
 */
export const ARC_TESTNET_CHAIN_ID = 5042002;

/**
 * Arc Testnet JSON-RPC endpoint.
 * Set ARC_TESTNET_RPC_URL in the environment to override.
 * When RPC_PROXY_BASE_URL and RPC_PROXY_CHAINS are present (Arc Studio),
 * the proxy URL is constructed automatically in rpcCall() inside checkout.js.
 */
export const ARC_TESTNET_RPC_URL =
  process.env.ARC_TESTNET_RPC_URL || "https://rpc.arc.testnet"; // arc-studio-allow-onchain-literal

/**
 * PaymentTracker contract address on Arc Testnet.
 * Set PAYMENT_TRACKER_ADDRESS in the environment.
 * When absent, verification falls back to direct native-transfer checks.
 */
export const PAYMENT_TRACKER_ADDRESS =
  process.env.PAYMENT_TRACKER_ADDRESS || null;

/**
 * keccak256 topic for the PaymentSent event.
 * Set PAYMENT_SENT_TOPIC in the environment when the contract is deployed.
 * Value must match the deployed ABI exactly.
 */
export const PAYMENT_SENT_TOPIC =
  process.env.PAYMENT_SENT_TOPIC || null;
