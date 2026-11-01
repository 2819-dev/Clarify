# Clarify

Curated Jewish & family-safe video browsing with community reports and a password-only admin review panel. Catalog and reports live in Neon Postgres.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon Postgres (`@neondatabase/serverless`)
- Viewer accounts (email/password in Neon) for subscribe / like / comment
- Separate signed HTTP-only admin session (key icon + `ADMIN_PASSWORD`)

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `ADMIN_PASSWORD` | Server-only admin password (never `NEXT_PUBLIC_*`) |
| `SESSION_SECRET` | Long random string used to HMAC-sign admin + viewer session cookies |

Schema SQL lives in `sql/` (`001` catalog, `006` users/engagement). Apply `sql/006_users_engagement.sql` for accounts.

## Develop

```bash
npm install
npm run dev
```

- Catalog: [http://localhost:3000](http://localhost:3000)
- Sign in / sign up: `/signin`, `/signup` (subscribe, like, comment)
- Admin login (key icon): [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Catalog

Seed a large embed-verified library:

```bash
# Apply sql/001_schema.sql once, then:
npm run seed:catalog
```

`data/catalog-seed.json` holds verified YouTube IDs plus channel/category metadata.

## Product notes

- Browse/watch only **active** videos.
- **Categories** (`/categories`) and **channels** (`/channels`) for browsing; home supports `?q=` search across title, channel, and category.
- Catalog seed only includes YouTube IDs verified to play in an iframe from Clarify.
- The watch player uses the YouTube IFrame API. On embed failure (`onError` codes 2/5/100/101/150, or no `onReady`), Clarify replaces the player with a custom overlay (logo + “This video is not available on Clarify” + YouTube link) — never YouTube’s unavailable / embedding-disabled chrome.
- **Report** asks “What is wrong with this video?” and stores free-text in Neon.
- Admin **approve** → video removed from the catalog; **deny** → video stays.
