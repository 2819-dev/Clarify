# Clarify

Curated Jewish & family-safe video browsing with community reports and a password-only admin review panel. Catalog and reports live in Neon Postgres.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Neon Postgres (`@neondatabase/serverless`)
- Viewer accounts (email/password in Neon) for subscribe / like / comment
- Optional TOTP 2FA (authenticator app) for viewers; required again for admin elevation when enabled on the Guide account
- Admin key icon only for signed-in `ADMIN_EMAIL` (default `guidelearning.skyrocket801@passmail.net`), then `ADMIN_PASSWORD` (+ TOTP if enabled)

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `ADMIN_PASSWORD` | Elevates the Guide admin account (never `NEXT_PUBLIC_*`) |
| `ADMIN_EMAIL` | Optional; account that may see the admin key (defaults to Guide Passmail) |
| `SESSION_SECRET` | HMAC for admin + viewer + pending-2FA cookies |
| `CRON_SECRET` | Auth for `/api/cron/sync` (GitHub Action / external cron) |

Schema SQL lives in `sql/` through `009` (usernames, AutoMod, publish times, sync IDs).

## Develop

```bash
npm install
npm run dev
```

- Catalog: [http://localhost:3000](http://localhost:3000)
- Sign in / sign up: `/signin`, `/signup` (subscribe, like, comment)
- 2FA setup: `/account/security` after signing in
- Admin: sign in as `ADMIN_EMAIL`, then key icon → `/admin/login`

## Enabling 2FA (TOTP)

1. Sign in at `/signin` (or create an account at `/signup`).
2. Open **Security** in the header menu (`/account/security`).
3. Click **Enable 2FA**, scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy, etc.), or type the shown key.
4. Enter a 6-digit code to confirm. Future sign-ins ask for email/password, then the authenticator code.
5. For the Guide admin account: after viewer sign-in (+ 2FA), use the key icon and enter `ADMIN_PASSWORD` (and the same authenticator code when 2FA is on).

## Moderation (Guide account only)

Signed in as `ADMIN_EMAIL`, use **⋯** menus next to videos, channels, and comments:

- **Video** → Remove from catalog (`is_active = false`)
- **Channel** → Hide channel and deactivate its videos
- **Comment** → Delete permanently

The admin panel still reviews community reports (approve/deny). The key icon is hidden for everyone else.

## @usernames

- Viewers pick an optional `@username` at signup (or get one from their email local-part).
- Channels have a separate `@username` (from YouTube `@handle` / slug), distinct from display name.
- `/@handle` resolves to a channel page or viewer profile (`/u/[username]`).

## AutoMod

New comments run through rule-based AutoMod (`src/lib/automod.ts`): hate/slurs, threats, scam/spam patterns, link floods. Matching comments are **not shown** publicly (stored hidden with `automod_flag`). Users see an error instead of a live post.

## Catalog sync (cron)

`POST /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`:

1. Backfills missing `@usernames`.
2. For active channels, resolves YouTube channel IDs and reads the public Atom feed.
3. Updates titles/thumbnails for known videos; **inserts new uploads** from those curated channels.

GitHub Actions workflow `.github/workflows/clarify-catalog-sync.yml` runs every 6 hours when `CLARIFY_CRON_SECRET` is set on the repo.

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
