import {
  TRANSLATION_LOGIN_URL,
  TRANSLATION_LOGIN_CREDENTIALS,
  TRANSLATION_TOKEN_STORAGE_KEY
} from "./translation-config";

export async function fetchTranslationToken() {
  const res = await fetch(TRANSLATION_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TRANSLATION_LOGIN_CREDENTIALS)
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error("Login response missing token");
  return data.token;
}

export async function getTranslationToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(TRANSLATION_TOKEN_STORAGE_KEY);
    if (cached) {
      try {
        const { token, fetchedAt } = JSON.parse(cached);
        if (token && Date.now() - fetchedAt < 50 * 60 * 1000) {
          return token;
        }
      } catch {
        // fall through to refresh
      }
    }
  }
  const token = await fetchTranslationToken();
  localStorage.setItem(
    TRANSLATION_TOKEN_STORAGE_KEY,
    JSON.stringify({ token, fetchedAt: Date.now() })
  );
  return token;
}
