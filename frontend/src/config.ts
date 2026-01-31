/**
 * Frontend config. Ports and API base URL are injected at build time from project root config.json.
 * Use VITE_* env in .env to override (e.g. production API URL).
 */
const getEnv = (key: string, fallback: string = '') =>
  typeof import.meta.env[key] !== 'undefined' ? String(import.meta.env[key]) : fallback

export const config = {
  /** Frontend dev server port (from config.json) */
  appPort: getEnv('VITE_APP_PORT', '25916'),
  /** API base URL; empty means same origin (use Vite proxy in dev). Set in production if API is on another host. */
  apiBaseUrl: getEnv('VITE_API_BASE_URL', ''),
}

/** Base URL for API requests: same origin when empty (proxy or same server). */
export const apiBase = config.apiBaseUrl || ''
