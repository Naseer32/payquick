/**
 * api.js
 *
 * HTTP client for the PayQuick API.
 *
 * Merges remote improvements (AbortController timeout, 204 handling, cleaner
 * error messages) with audit fix (removed production debug console.log calls
 * that were leaking API URLs and wallet addresses to the browser console).
 */

const API_URL = (
  import.meta.env.VITE_API_URL || "https://payquick.onrender.com"
).trim();

// Render free instances can take a while to wake up, so the timeout is generous.
const TIMEOUT_MS = 45000;

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("payquick_session");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response;

    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(
          "The server took too long to respond. It may be waking up, so try again in a few seconds."
        );
      }
      throw new Error(
        "Can't reach the PayQuick server. Check your connection and try again."
      );
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const err = new Error(
        body?.error ||
          body?.detail?.message ||
          body?.detail?.code ||
          `Request failed (${response.status})`
      );
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export function saveSession(token) {
  if (!token) return;
  localStorage.setItem("payquick_session", token);
}

export function clearSession() {
  localStorage.removeItem("payquick_session");
}
