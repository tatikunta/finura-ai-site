/**
 * FINURA site → Mumbai API + self-serve config.
 * Edit API_BASE / Firebase web config only. Never put tokens, service-account
 * keys, or Razorpay secrets here (GitHub Pages is public).
 *
 * Demo auth (coordinate with PR A):
 * - Preferred: public /demo/* routes (rate-limited, CORS locked) — no bearer.
 * - Optional: GET /demo/bootstrap mints a short-lived demo-scoped token for the
 *   browser session. Ashish configures that on Cloud Run; this file stays token-free.
 *
 * Self-serve (Phases 2–4): Firebase ID tokens → Authorization: Bearer on
 * /v1/account/*. Feature flags default OFF until Cloud Run enables the backend.
 */
window.FINURA_CONFIG = Object.freeze({
  API_BASE: "https://finura-api-245877296154.asia-south1.run.app",
  /** Only /demo/* paths are allowed from the browser demo client. */
  DEMO_PREFIX: "/demo",
  /** Path relative to API_BASE; empty string disables bootstrap. */
  BOOTSTRAP_PATH: "/demo/bootstrap",
  REQUEST_TIMEOUT_MS: 25000,

  /**
   * When false (default), pricing CTAs keep early-access / contact-sales behaviour.
   * When true, Free → sign-up; paid plans → sign-up then Razorpay checkout.
   */
  SELF_SERVE_ENABLED: false,
  /** When false, billing UI explains that checkout is not live yet. */
  BILLING_ENABLED: false,

  /**
   * Local / screenshot mock for /v1/account/* when the live self-serve API is
   * not deployed. Also enabled automatically on localhost, or via ?mock=1.
   * Never used for real Firebase credentials or payment secrets.
   */
  MOCK_MODE: false,

  /**
   * Firebase web app config (public client values — not secrets).
   * Replace placeholders after creating the web app in Firebase Console.
   */
  FIREBASE: Object.freeze({
    apiKey: "YOUR_FIREBASE_WEB_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_FIREBASE_APP_ID",
    messagingSenderId: "YOUR_SENDER_ID",
  }),
});
