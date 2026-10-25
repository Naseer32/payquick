/**
 * blockchain.js
 *
 * Browser-side blockchain helpers.
 *
 * Arc native USDC decimal note:
 *  - eth_getBalance (used by getNativeBalance) returns values in 18-decimal
 *    wei format, identical to Ethereum. Divide by 10^18 to get a human-readable
 *    USDC amount. Confirmed empirically: a ~1220 USDC wallet returns
 *    0x423087730cf559f000 (≈1.22e21), which divided by 1e18 = 1220.98 USDC.
 *  - ERC-20 balanceOf (not used here) uses 6 decimals.
 *  - parseUnits for sendTransaction value must also use 18 to match what the
 *    RPC expects in the `value` field.
 *  - wallet_addEthereumChain nativeCurrency.decimals must be 18 so MetaMask
 *    displays the correct human-readable amount.
 */

const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_TESTNET_CHAIN_ID_HEX = "0x4cef52";

// eth_getBalance and tx `value` field use 18-decimal wei on Arc Testnet.
const ARC_NATIVE_DECIMALS = 18;

const ARC_TESTNET_CONFIG = {
  chainId: ARC_TESTNET_CHAIN_ID_HEX,
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: ARC_NATIVE_DECIMALS
  },
  rpcUrls: ["https://rpc.testnet.arc.io"], // arc-studio-allow-onchain-literal
  blockExplorerUrls: ["https://testnet.arcscan.app"]
};

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

export function isArcTestnet(chainId) {
  return Number.parseInt(chainId, 16) === ARC_TESTNET_CHAIN_ID;
}

export async function ensureArcTestnet() {
  const provider = getEthereumProvider();

  let chainId = await provider.request({ method: "eth_chainId" });

  if (isArcTestnet(chainId)) return chainId;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }]
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw new Error(error?.message || "Unable to switch wallet to Arc Testnet.");
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ARC_TESTNET_CONFIG]
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }]
    });
  }

  chainId = await provider.request({ method: "eth_chainId" });

  if (!isArcTestnet(chainId)) {
    throw new Error("Wallet could not be switched to Arc Testnet.");
  }

  return chainId;
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

  // eth_getBalance returns 18-decimal wei on Arc Testnet (same as Ethereum).
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
  if (!toAddress) throw new Error("Recipient address is required.");
  if (!amount || Number(amount) <= 0) throw new Error("Enter a valid amount to send.");

  // tx `value` field uses 18-decimal wei on Arc Testnet, matching eth_getBalance.
  const amountInBaseUnits = BigInt(Math.round(Number(amount) * 10 ** ARC_NATIVE_DECIMALS));
  const amountHex = "0x" + amountInBaseUnits.toString(16);

  return provider.request({
    method: "eth_sendTransaction",
    params: [{ from: fromAddress, to: toAddress, value: amountHex }]
  });
}
