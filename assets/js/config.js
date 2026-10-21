/**
 * FINURA site → Mumbai demo API config.
 * Edit API_BASE only. Never put tokens or secrets here (GitHub Pages is public).
 *
 * Demo auth (coordinate with PR A):
 * - Preferred: public /demo/* routes (rate-limited, CORS locked) — no bearer.
 * - Optional: GET /demo/bootstrap mints a short-lived demo-scoped token for the
 *   browser session. Ashish configures that on Cloud Run; this file stays token-free.
 */
window.FINURA_CONFIG = Object.freeze({
  API_BASE: "https://finura-api-245877296154.asia-south1.run.app",
  /** Only /demo/* paths are allowed from the browser client. */
  DEMO_PREFIX: "/demo",
  /** Path relative to API_BASE; empty string disables bootstrap. */
  BOOTSTRAP_PATH: "/demo/bootstrap",
  REQUEST_TIMEOUT_MS: 25000,
});
