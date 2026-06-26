import { API_URL } from "./utils";

export async function wakeBackend(maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${API_URL}/health`, {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) return true;
      lastError = new Error(`Health check failed (${res.status})`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }

  throw lastError || new Error("Backend unavailable");
}

export async function apiFetch(path, options = {}, retries = 1) {
  await wakeBackend();

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${API_URL}${path}`, options);

      let data;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || `Request failed (${res.status})`);
        }
        data = { text };
      }

      if (!res.ok) {
        throw new Error(
          data.detail || data.error || `Request failed (${res.status})`
        );
      }

      return data;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await wakeBackend();
        continue;
      }
    }
  }

  if (lastError?.message === "Failed to fetch") {
    throw new Error(
      "Cannot reach the API server. The backend may be waking up — wait a moment and click Retry."
    );
  }

  throw lastError || new Error("Request failed");
}
