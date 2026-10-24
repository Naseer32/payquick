const API_URL =
  (import.meta.env.VITE_API_URL || "https://payquick-v2.onrender.com").trim();

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("payquick_session");
  const url = `${API_URL}${path}`;

  console.log("PayQuick API request:", {
    url,
    method: options.method || "GET"
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {}),
        ...(options.headers || {})
      }
    });

    console.log("PayQuick API response:", response.status, url);

    if (!response.ok) {
      const error = await response.json().catch(() => null);

      throw new Error(
  error?.error ||
  error?.detail?.message ||
  error?.detail?.code ||
  `API request failed: ${response.status}`
);
    }

    return response.json();
  } catch (error) {
    console.error("PayQuick API request failed:", {
      url,
      error
    });

    throw error;
  }
}

export function saveSession(token) {
  localStorage.setItem("payquick_session", token);
}

export function clearSession() {
  localStorage.removeItem("payquick_session");
}
