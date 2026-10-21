# finura-ai-site

Static marketing + live demo UI for [finuraai.org](https://finuraai.org/) (GitHub Pages).

## Live demo → Mumbai API

Single config file (no secrets):

```js
// assets/js/config.js
API_BASE: "https://finura-api-245877296154.asia-south1.run.app"
```

Browser calls **only** `/demo/*` routes via `assets/js/demo-api.js`.

### Demo auth (no tokens in this repo)

GitHub Pages cannot hold secrets. Coordinate with ECRP **PR A**:

1. **Preferred:** public `/demo/*` (rate-limited, CORS allow-list for `finuraai.org` / `www` / `finuraai.xyz`) — no `Authorization` header.
2. **Optional bootstrap:** `GET /demo/bootstrap` returns a short-lived demo-scoped token; the client retries once. Ashish configures Secret Manager / Cloud Run env on the API — **never** commit a token into `config.js`.

Expected demo surface (PR A):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/demo/health` | Liveness for the demo badge |
| GET | `/demo/bootstrap` | Optional short-lived demo token |
| GET | `/demo/policies` | Policy browser |
| POST | `/demo/refunds` | Refund decision (+ SHAP / synthetic flags) |
| GET | `/demo/refunds/{id}` | Fetch decision |
| POST | `/demo/goals` | Goal run (sample fallback on Gemini 503/429) |
| GET | `/demo/goals/{id}` | Run status |
| GET | `/demo/goals/{id}/events/stream` | SSE steps |
| POST | `/demo/leads` | Pilot lead capture |

Until PR A is deployed, the UI shows **labelled local samples** so the site remains demoable.

## GitHub Pages deploy

- Custom domain: `CNAME` → `finuraai.org`
- Workflow: `.github/workflows/pages.yml` deploys on push to `main`
- Source: repository root (static files). No build step, no env secrets required for the site.
- After merging to `main`, Pages publishes automatically; confirm DNS + HTTPS in repo Settings → Pages.

### Pointing at another API base

Edit `assets/js/config.js` → `API_BASE`, commit, merge to `main`. Do not add tokens.

## Local preview

Any static server from repo root, e.g. `python3 -m http.server 8080`, then open `/` and `/demo/`.
