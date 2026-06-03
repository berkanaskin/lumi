# 05-05 — Notification Center + Detection Cron + Evening Assistant — SUMMARY

**Status:** COMPLETE (code + tests). Awaits the phase-end push + `CRON_SECRET` env.

## Shipped
- `src/lib/detect-changes-core.js` — pure: `groupItemsByRegionType`, `detectPlatformGain` (gain-only, first-run seeds silently), `detectEpisodeChange`, event builders. Phase-6 push schema. (13 tests)
- `src/lib/evening-core.js` — pure: `localHour`/`isEveningBucket`/`selectEveningUsers` (tz buckets at local 20:00 + per-day idempotency), `parseEveningTitles` (numbered/bullet → 3), `buildEveningPickEvent`. (10 tests)
- `src/lib/notif-store.js` — v8-compat add/list/markRead/markAllRead/subscribe + pure `unreadCount`; injectable `db`. (8 tests)
- `src/features/notifications.js` + `src/styles/notifications.css` — self-injecting; **wires the EXISTING header bell** (`#notifications-btn`/`#notifications-list`), injects an unread `.notification-badge`, renders the Firestore inbox, marks read on tap + deep-links, supersedes the legacy localStorage mark-all. Premium-only. (4 JSDOM tests)
- `api/cron/detect-changes.js` — daily, `users.where('premium','==',true)`, region SA gain (cache-first via sa-cache.js, snapshot per watchlist item `saSnapshot`) + TV `next_episode_to_air` diff (`nextEpSnapshot`). CRON_SECRET Bearer guard.
- `api/cron/evening-assistant.js` — hourly, selects premium users at local 20:00, server-side taste from favorites/watchlist, 1 Gemini call (`feature:'evening'`) → 3 titles → inbox; `lastEveningPick` idempotency. CRON_SECRET guard.
- `api/gemini.js` — `feature:'evening'` branch (temp 1.0 / 256 tok; default path unchanged).
- `api/quota.js` + `discover.js` — also persist `users/{uid}.country` (from `lumi_country`) so the cron knows the SA region.
- `vercel.json` — `crons` (detect-changes `0 9 * * *`, evening `0 * * * *`).
- `tests/fixtures/firebase-mock.js` — extended with add/orderBy/limit/where/update/onSnapshot (backward-compatible; migration tests still green).

## Tests
+35 new; full suite **513 passing** / 22 todo / 2 skipped. `vite build` clean. All three cron cores import cleanly in Node.

## Owner action item (BEFORE the crons can run securely)
Set a **`CRON_SECRET`** env var in Vercel (Project → Settings → Environment Variables). Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on cron invocations; the handlers reject anything else. Without it set, the endpoints allow all callers (dev-friendly, but should be set in prod). Optionally set `PUBLIC_BASE_URL` (else `VERCEL_URL`/host is used) for the cron's self-HTTP to /api/tmdb + /api/streaming-availability + /api/gemini.

## Notes / risks (carried from the design)
- Platform "set" is region-wide per item (no imdbId on watchlist items); forward-compatible if imdbId is added.
- Premium enumeration uses an automatic single-field index (no composite); paginate as premium grows.
- `country` derived from the stored `lumi_country` via api/quota; if a premium user never triggered /api/quota with a country, the SA diff is skipped that run (episode diff still works).
