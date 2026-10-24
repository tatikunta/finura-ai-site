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
 * /v1/account/*. MOCK_MODE / ?mock=1 never apply on finuraai.org production hosts.
 */
window.FINURA_CONFIG = Object.freeze({
  API_BASE: "https://finura-api-245877296154.asia-south1.run.app",
  /** Only /demo/* paths are allowed from the browser demo client. */
  DEMO_PREFIX: "/demo",
  /** Path relative to API_BASE; empty string disables bootstrap. */
  BOOTSTRAP_PATH: "/demo/bootstrap",
  REQUEST_TIMEOUT_MS: 25000,

  /**
   * When true, Free → sign-up. Paid plans stay early-access until BILLING_ENABLED.
   * When false, all pricing CTAs keep early-access / contact-sales behaviour.
   */
  SELF_SERVE_ENABLED: true,
  /** When false, paid plans keep early-access CTAs (no Razorpay Checkout). */
  BILLING_ENABLED: false,

  /**
   * Cloudflare Turnstile site key (public). Empty string disables the widget
   * on auth + contact/lead forms. Secret key lives only on the API.
   */
  TURNSTILE_SITE_KEY: "",

  /**
   * When true, show Data export / Delete account on /app/.
   * Routes (ECRP rev 00009 / PR #17): GET /v1/account/data-export,
   * DELETE /v1/account with X-Confirm-Delete: DELETE.
   */
  ACCOUNT_PRIVACY_ENABLED: true,

  /**
   * Local / screenshot mock for /v1/account/* (localhost or ?mock=1 only).
   * Ignored on finuraai.org / www.finuraai.org — production always hits the live API.
   */
  MOCK_MODE: false,

  /**
   * Firebase web app config (public client values — not secrets).
   * Analytics (measurementId) intentionally omitted — Skip Analytics.
   */
  FIREBASE: Object.freeze({
    apiKey: "AIzaSyBKzOFW9h1D1hHsij5NcgGKOYbJmbm7zUY",
    authDomain: "finura-ecrp-20f2.firebaseapp.com",
    projectId: "finura-ecrp-20f2",
    storageBucket: "finura-ecrp-20f2.firebasestorage.app",
    messagingSenderId: "245877296154",
    appId: "1:245877296154:web:7c6feb797bdd82e7b4d5a3",
  }),
});
