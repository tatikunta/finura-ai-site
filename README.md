# finura-ai-site

Static marketing + live demo + self-serve console for [finuraai.org](https://finuraai.org/) (GitHub Pages).

## Config (no secrets)

```js
// assets/js/config.js
API_BASE: "https://finura-api-245877296154.asia-south1.run.app"
SELF_SERVE_ENABLED: true    // Free → sign-up; paid stay early-access until billing
BILLING_ENABLED: false      // Razorpay Checkout gate
TURNSTILE_SITE_KEY: ""      // Cloudflare Turnstile site key; empty = off
ACCOUNT_PRIVACY_ENABLED: true   // Export GET /v1/account/data-export; delete DELETE /v1/account + X-Confirm-Delete
MOCK_MODE: false            // localhost / ?mock=1 only — never on finuraai.org
FIREBASE: { apiKey, authDomain, projectId, appId, … }  // public web config
```

Never commit API tokens, Firebase Admin keys, Turnstile secrets, or Razorpay secrets. GitHub Pages is public. Mock mode is blocked on `finuraai.org` / `www.finuraai.org`.

## Surfaces

| Path | Purpose |
|------|---------|
| `/demo/` | Public demo → `/demo/*` Mumbai API |
| `/pricing/` | Self-serve plans (INR/USD, FAQ; Free signup + paid waitlist) |
| `/contact/` | Early access / contact sales form → `POST /demo/leads` |
| `/auth/` | Firebase Google + email + forgot-password (mock on localhost only) |
| `/app/` | Account dashboard: overview, keys, usage, billing, team |
| `/app/playground/` | No-code decision playground |
| `/docs/` | API quickstart, curl/JS, credits, `GET /readyz`, 402/429 |
| `/legal/terms/` `/legal/privacy/` `/legal/refund/` | Draft legal pages (pending review) |
| `/terms/` `/privacy/` `/refund/` | Redirect stubs → `/legal/…` |
| `/enterprise/*` | Bank / contact-sales packaging |
| `/robots.txt` `/sitemap.xml` `/favicon.ico` | SEO / crawlers |

Dashboard calls `/v1/account/*` with `Authorization: Bearer <Firebase ID token>`. Until Cloud Run self-serve flags ship, use **mock mode** on localhost / `?mock=1` only (never on production hosts).

## Live demo → Mumbai API

Browser demo client (`assets/js/demo-api.js`) calls **only** `/demo/*`. Lead forms post to `POST /demo/leads` and open mailto only if that post fails. Optional Turnstile token is sent as `turnstile_token` when `TURNSTILE_SITE_KEY` is set.

## GitHub Pages deploy

- Custom domain: `CNAME` → `finuraai.org`
- Workflow: `.github/workflows/pages.yml` deploys on push to `main`
- Source: repository root (static files). No build step, no env secrets required for the site.
- Dependabot: `.github/dependabot.yml` keeps Actions up to date.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080/pricing/
# open http://localhost:8080/auth/?mock=1
```

On localhost, auth + `/v1/account/*` use the in-browser mock automatically so you can screenshot the console without the self-serve API deployed.
