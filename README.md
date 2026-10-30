# Clarify

Curated Jewish & family-safe video browsing with community reports and a password-only admin review panel. Catalog and reports live in Neon Postgres.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon Postgres (`@neondatabase/serverless`)
- Signed HTTP-only admin session cookie (no public accounts)

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `ADMIN_PASSWORD` | Server-only admin password (never `NEXT_PUBLIC_*`) |
| `SESSION_SECRET` | Long random string used to HMAC-sign the admin session cookie |

Schema SQL lives in `sql/001_schema.sql`.

## Develop

```bash
npm install
npm run dev
```

- Catalog: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Product notes

- Browse/watch only **active** videos.
- Catalog seed only includes YouTube IDs verified to play in an iframe from Clarify.
- The watch player uses the YouTube IFrame API. On embed failure (`onError` codes 2/5/100/101/150, or no `onReady`), Clarify replaces the player with a custom overlay (logo + “This video is not available on Clarify” + YouTube link) — never YouTube’s unavailable / embedding-disabled chrome.
- **Report** asks “What is wrong with this video?” and stores free-text in Neon.
- Admin **approve** → video removed from the catalog; **deny** → video stays.
