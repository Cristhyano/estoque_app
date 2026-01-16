type RuntimeConfig = {
  apiBaseUrl?: string;
  origin?: "web" | "desktop";
};

const runtimeConfig = (globalThis as { __APP_CONFIG__?: RuntimeConfig })
  .__APP_CONFIG__;

const apiBaseUrl =
  runtimeConfig?.apiBaseUrl ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001";

const appOrigin = runtimeConfig?.origin || "web";

export { apiBaseUrl, appOrigin };
