# finura-ai-site

Static marketing + live demo + self-serve console for [finuraai.org](https://finuraai.org/) (GitHub Pages).

## Config (no secrets)

```js
// assets/js/config.js
API_BASE: "https://finura-api-245877296154.asia-south1.run.app"
SELF_SERVE_ENABLED: false   // pricing CTAs → early access until true
BILLING_ENABLED: false      // Razorpay Checkout gate
MOCK_MODE: false            // or localhost / ?mock=1 for contract mock
FIREBASE: { apiKey, authDomain, projectId, appId, … }  // public web config
```

Never commit API tokens, Firebase Admin keys, or Razorpay secrets. GitHub Pages is public.

## Surfaces

| Path | Purpose |
|------|---------|
| `/demo/` | Public demo → `/demo/*` Mumbai API |
| `/pricing/` | Self-serve plans (Free / Starter / Business / Enterprise) |
| `/auth/` | Firebase Google + email (mock when placeholders / localhost) |
| `/app/` | Account dashboard: overview, keys, usage, billing, team |
| `/app/playground/` | No-code decision playground |
| `/docs/` | API quickstart, curl/JS, credits, 402/429 |
| `/enterprise/*` | Bank / contact-sales packaging |

Dashboard calls `/v1/account/*` with `Authorization: Bearer <Firebase ID token>`. Self-serve backend flags (`FINURA_FF_SELF_SERVE`, `FINURA_FF_BILLING`) default off on Cloud Run — until they ship, use **mock mode** (`?mock=1` or localhost) which implements the PR #8 contract locally.

## Live demo → Mumbai API

Browser demo client (`assets/js/demo-api.js`) calls **only** `/demo/*`. See prior docs in git history for bootstrap token behaviour.

## GitHub Pages deploy

- Custom domain: `CNAME` → `finuraai.org`
- Workflow: `.github/workflows/pages.yml` deploys on push to `main`
- Source: repository root (static files). No build step, no env secrets required for the site.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080/auth/?mock=1
```

On localhost, auth + `/v1/account/*` use the in-browser mock automatically so you can screenshot the console without the self-serve API deployed.
