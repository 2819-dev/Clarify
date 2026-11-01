# Clarify on Cloudflare Pages

Clarify is a dynamic Next.js 16 App Router app (Neon Postgres, cookies, SSR).  
`@cloudflare/next-on-pages` does **not** support Next 16, so this project uses **OpenNext for Cloudflare**, then deploys with **`wrangler pages deploy`** (Pages Advanced Mode / `_worker.js`), not `wrangler deploy`.

## Authorize Wrangler

```bash
npx wrangler login --browser=false \
  --scopes account:read --scopes user:read --scopes pages:write \
  --scopes workers:write --scopes workers_scripts:write --scopes secrets_store:write
```

Open the printed OAuth URL, approve, and wait for “Successfully logged in”.

## Build & deploy

```bash
npm run pages:deploy
# or:
npm run pages:build
npx wrangler pages deploy .pages-out --project-name=clarify --branch=main
```

Live URL: **https://clarify-1p0.pages.dev/**

Preview/deployment URLs are also printed by `wrangler pages deploy`.

### Static CSS/JS must bypass the Worker

`scripts/prepare-pages-out.mjs` writes `_routes.json` that **excludes** `/_next/static/*` (and other public assets) from `_worker.js`. Pages then serves those files from the CDN. If the Worker handles them instead, CSS/JS 404 and the site renders as unstyled plain text.

## Secrets / env vars (required)

Set for **Production** and **Preview** in the Pages dashboard, or:

```bash
npx wrangler pages secret put DATABASE_URL --project-name=clarify
npx wrangler pages secret put ADMIN_PASSWORD --project-name=clarify
npx wrangler pages secret put SESSION_SECRET --project-name=clarify
```

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | HMAC secret for admin session cookies (16+ chars) |

Do **not** prefix these with `NEXT_PUBLIC_`.

## Local OpenNext preview (optional)

```bash
npx opennextjs-cloudflare build
npx opennextjs-cloudflare preview
```
