export const TRANSLATION_WS_URL = "wss://ws.pupillae28.com:50161/v1/translate/stream";
export const TRANSLATION_LOGIN_URL = "https://spacemail.pupillae28.com:50161/login";

export const TRANSLATION_LOGIN_CREDENTIALS = {
  username: "spacemail",
  password: "123456"
};

export const TRANSLATION_TOKEN_STORAGE_KEY = "translation_token";

export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" }
];

export const DEFAULT_SOURCE_LANG = "es";
export const DEFAULT_TARGET_LANG = "en";
