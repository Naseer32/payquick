/**
 * blockchain.js
 *
 * Browser-side blockchain helpers. Network is driven by VITE_ARC_NETWORK
 * ("testnet" or "mainnet"), set at build time. Falls back to "testnet".
 *
 * Arc native USDC decimal note:
 *  - eth_getBalance returns 18-decimal wei (same as Ethereum).
 *    Confirmed empirically: a wallet with ~1220 USDC returns 0x423087730cf559f000;
 *    divided by 1e18 = 1220.98 USDC.
 *  - ERC-20 balanceOf uses 6 decimals (not used here).
 *  - tx `value` and parseUnits must use 18 to match eth_getBalance.
 *  - wallet_addEthereumChain nativeCurrency.decimals = 18 so wallets display
 *    the correct human-readable amount.
 */

const ARC_NETWORK = (import.meta.env.VITE_ARC_NETWORK || "testnet").trim().toLowerCase();
export const IS_MAINNET = ARC_NETWORK === "mainnet";

// Chain IDs
const ARC_TESTNET_CHAIN_ID     = 5042002;
const ARC_TESTNET_CHAIN_ID_HEX = "0x4cef52";
const ARC_MAINNET_CHAIN_ID     = 5042;
const ARC_MAINNET_CHAIN_ID_HEX = "0x13b2";

export const ACTIVE_CHAIN_ID     = IS_MAINNET ? ARC_MAINNET_CHAIN_ID     : ARC_TESTNET_CHAIN_ID;
export const ACTIVE_CHAIN_ID_HEX = IS_MAINNET ? ARC_MAINNET_CHAIN_ID_HEX : ARC_TESTNET_CHAIN_ID_HEX;
export const ACTIVE_NETWORK_NAME = IS_MAINNET ? "Arc"                     : "Arc Testnet";

// eth_getBalance and tx `value` field use 18-decimal wei on both Arc networks.
const ARC_NATIVE_DECIMALS = 18;

const ARC_TESTNET_CHAIN_CONFIG = {
  chainId: ARC_TESTNET_CHAIN_ID_HEX,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: ARC_NATIVE_DECIMALS },
  rpcUrls: ["https://rpc.testnet.arc.io"],           // arc-studio-allow-onchain-literal
  blockExplorerUrls: ["https://explorer.testnet.arc.io"]
};

const ARC_MAINNET_CHAIN_CONFIG = {
  chainId: ARC_MAINNET_CHAIN_ID_HEX,
  chainName: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: ARC_NATIVE_DECIMALS },
  rpcUrls: ["https://rpc.mainnet.arc.io"],           // arc-studio-allow-onchain-literal
  blockExplorerUrls: ["https://arcscan.app"]
};

const ACTIVE_CHAIN_CONFIG = IS_MAINNET ? ARC_MAINNET_CHAIN_CONFIG : ARC_TESTNET_CHAIN_CONFIG;

export function getEthereumProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No compatible wallet found. Please install or open a compatible wallet."
    );
  }
  return window.ethereum;
}

export async function connectWallet() {
  const provider = getEthereumProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("No wallet account returned.");
  }

  return accounts[0];
}

export async function getChainId() {
  const provider = getEthereumProvider();
  return provider.request({ method: "eth_chainId" });
}

export function isActiveChain(chainId) {
  return Number.parseInt(chainId, 16) === ACTIVE_CHAIN_ID;
}

/** @deprecated Use isActiveChain() — kept for compatibility */
export function isArcTestnet(chainId) {
  return isActiveChain(chainId);
}

export async function ensureArcNetwork() {
  const provider = getEthereumProvider();

  let chainId = await provider.request({ method: "eth_chainId" });

  if (isActiveChain(chainId)) return chainId;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ACTIVE_CHAIN_ID_HEX }]
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw new Error(
        error?.message || `Unable to switch wallet to ${ACTIVE_NETWORK_NAME}.`
      );
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ACTIVE_CHAIN_CONFIG]
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ACTIVE_CHAIN_ID_HEX }]
    });
  }

  chainId = await provider.request({ method: "eth_chainId" });

  if (!isActiveChain(chainId)) {
    throw new Error(`Wallet could not be switched to ${ACTIVE_NETWORK_NAME}.`);
  }

  return chainId;
}

/** @deprecated Use ensureArcNetwork() — kept for compatibility */
export async function ensureArcTestnet() {
  return ensureArcNetwork();
}

export async function signMessage(message, walletAddress) {
  const provider = getEthereumProvider();

  if (!walletAddress) {
    throw new Error("Wallet address is required to sign the message.");
  }

  return provider.request({
    method: "personal_sign",
    params: [message, walletAddress.toLowerCase()]
  });
}

export async function getNativeBalance(walletAddress) {
  const provider = getEthereumProvider();

  if (!walletAddress) {
    throw new Error("Wallet address is required to fetch balance.");
  }

  const balanceHex = await provider.request({
    method: "eth_getBalance",
    params: [walletAddress, "latest"]
  });

  // eth_getBalance returns 18-decimal wei on both Arc networks (same as Ethereum).
  const balanceRaw = BigInt(balanceHex);
  const divisor = BigInt(10) ** BigInt(ARC_NATIVE_DECIMALS);
  const whole = balanceRaw / divisor;
  const fraction = balanceRaw % divisor;
  const fractionStr = fraction.toString().padStart(ARC_NATIVE_DECIMALS, "0").slice(0, 2);

  return parseFloat(whole.toString() + "." + fractionStr);
}

export async function sendNativeTransfer(fromAddress, toAddress, amount) {
  const provider = getEthereumProvider();

  if (!fromAddress) throw new Error("Sender wallet address is required.");
  if (!toAddress)   throw new Error("Recipient address is required.");
  if (!amount || Number(amount) <= 0) throw new Error("Enter a valid amount to send.");

  // tx `value` uses 18-decimal wei, matching eth_getBalance on both Arc networks.
  const amountInBaseUnits = BigInt(Math.round(Number(amount) * 10 ** ARC_NATIVE_DECIMALS));
  const amountHex = "0x" + amountInBaseUnits.toString(16);

  return provider.request({
    method: "eth_sendTransaction",
    params: [{ from: fromAddress, to: toAddress, value: amountHex }]
  });
}
