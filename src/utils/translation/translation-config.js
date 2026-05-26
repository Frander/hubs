export const TRANSLATION_WS_URL = "wss://ws.pupillae28.com:50161/v1/translate/stream";
export const TRANSLATION_LOGIN_URL = "https://spacemail.pupillae28.com:50161/login";

export const TRANSLATION_LOGIN_CREDENTIALS = {
  username: "spacemail",
  password: "123456"
};

export const TRANSLATION_TOKEN_STORAGE_KEY = "translation_token";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" }
];

export const DEFAULT_SOURCE_LANG = "es";
export const DEFAULT_TARGET_LANG = "en";
