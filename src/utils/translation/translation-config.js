export const TRANSLATION_WS_URL = "wss://ws.pupillae28.com:50161/v1/translate/stream";
export const TRANSLATION_LOGIN_URL = "https://spacemail.pupillae28.com:50161/login";

export const TRANSLATION_LOGIN_CREDENTIALS = {
  username: "spacemail",
  password: "123456"
};

export const TRANSLATION_TOKEN_STORAGE_KEY = "translation_token";

export const SUPPORTED_LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "cs", label: "Čeština" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "ro", label: "Română" },
  { code: "ru", label: "Русский" },
  { code: "th", label: "ไทย" },
  { code: "tr", label: "Türkçe" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" }
];

export const DEFAULT_SOURCE_LANG = "es";
export const DEFAULT_TARGET_LANG = "en";
