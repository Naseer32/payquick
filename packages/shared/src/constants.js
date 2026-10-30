/**
 * Shared constants for PayQuick.
 * Used by both the web app and the API.
 */

export const NETWORKS = {
  ARC_TESTNET: {
    name: "Arc Testnet",
    chainId: 5042002
  },
  ARC_MAINNET: {
    name: "Arc",
    chainId: 5042
  }
};

/** @deprecated Use NETWORKS.ARC_TESTNET */
export const NETWORK = NETWORKS.ARC_TESTNET;

export const CURRENCIES = {
  USDC: "USDC"
};

export const INVOICE_STATUS = {
  PENDING: "pending",
  CHECKING: "checking",
  PAID: "paid",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed"
};
