// Talks to the Arc JSON-RPC node(s) for the payment checks.
//
// - ARC_RPC_URLS (optional, comma-separated) overrides the default node and lets you list
//   backups, tried in order. Without it, the default below is used.
// - Each request has a timeout, so a dead node can't hang a request.
// - HTTP errors and JSON-RPC errors count as failures and move on to the next node.
//   A null result is a valid answer (for example, a receipt that isn't mined yet).

// Default RPC is driven by ACTIVE_RPC_URL from constants so it switches with ARC_NETWORK.
// arc-studio-allow-onchain-literal
import { ACTIVE_RPC_URL } from "../constants.js";
const DEFAULT_RPC_URLS = [ACTIVE_RPC_URL];
const TIMEOUT_MS = 10000;

function getRpcUrls() {
  const configured = (process.env.ARC_RPC_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_RPC_URLS;
}

// Only the host is logged, because a node URL can contain an access key.
function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown host";
  }
}

export async function arcRpc(method, params = []) {
  let lastError;

  for (const url of getRpcUrls()) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error("RPC responded with HTTP " + response.status);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error("RPC error: " + (data.error.message || data.error.code));
      }

      return data.result;
    } catch (error) {
      lastError = error;
      console.error("Arc RPC failed (" + hostOf(url) + "):", error.message);
    }
  }

  const failure = new Error("Could not reach the Arc network");
  failure.code = "ARC_RPC_UNAVAILABLE";
  failure.cause = lastError;
  throw failure;
}
