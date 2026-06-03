# Phase 5 — Final Adversarial Review + Fixes

Ran a 5-dimension review workflow (quota fail-closed, detect cron, evening cron, pair security,
notifications) with per-finding verification: **26 confirmed, 4 dismissed** (the dismissed were
correct false-positives: text-content XSS is safe, half-hour tz zones actually match, the
re-entrant mark-all listener is benign, no double-count).

## Fixed (this pass)

**CRITICAL**
- Decide-for-Me & Pair Mode bypassed the quota gate entirely (`runDecide`/`runPairRecommend`
  called `hybridSearch` with no `consumeAiQuota`). Added the gate to both; blocked → paywall.
  (decide-for-me.js, pair-mode.js, agent-hub.js)
- detect-changes notification storm: event written before the snapshot persisted → a crash
  re-fired it. Now persist snapshot BEFORE the event; first-run seeds + `continue`. 
- detect-changes cost leak: SA-degraded groups re-fetched every run. Now stamp `saDegradedAt`
  (without corrupting `saSnapshot.ids`).
- CRON_SECRET unset = allow-all. Now fail-secure: with no secret, only Vercel's own caller
  (`x-vercel-cron` header) is accepted. (both crons)

**HIGH**
- Auth UX deadlock: if anon sign-in is disabled/fails (or Firebase is absent), `waitForToken`
  hung ~4s then blocked. Now `_firstUserResolve(null)` on every failure path + `waitForToken`
  fast-fails when `this.auth` is absent.
- detect-changes per-user isolation: one user's Firestore error aborted the whole run. Now a
  per-user try/catch; writes are individually `.catch`-logged.
- Episode snapshot now always persisted (incl. "no upcoming episode" → null), before the event.
- Evening duplicate / double-spend: `lastEveningPick` now claimed via a Firestore TRANSACTION
  BEFORE the Gemini call (pessimistic lock) → no concurrent/same-hour/DST double-delivery.
- Evening exactly-3: now requires `picks.length === 3`; a partial response releases the claim
  for a next-hour retry instead of serving a degraded pick.
- firestore.rules pairs: `create: if false` (no client can fabricate a pair naming a victim);
  `update` keeps `members` immutable from clients. Pair creation is server-only (api/pair.js).
  **Deployed to lumi-film-app.**
- notifications mark-all double-handler: the legacy index.html handler now bails for premium
  users (the Firestore handler owns it), avoiding a race.

**LOW / cleanup**
- notifications deep-link: removed the dead `window.renderDetailPage` fallback (never assigned).

## Deliberately deferred (documented, low/no current risk)
- **Pair code brute-force rate-limiting** (HIGH-rated but: requires a valid idToken, 10-min TTL,
  ~1e9 code space, no read access to pairCodes). Acceptable for Phase 5's scale; revisit before
  a large launch (add per-UID redeem throttle or 8-char codes).
- **`pairIdFor` underscore-collision**: only exploitable with custom UIDs containing `__`; Lumi
  uses anon + Google UIDs (no underscores). Documented assumption; harden if custom UIDs are added.
- **Separate `api/gemini-evening.js`**: the `feature:'evening'` flag is unvalidated but no live
  caller can trigger the dangerous path (search.js doesn't use /api/gemini; detail.js sends no
  feature). Architectural hardening for later.
- **handleAISearch in-flight debounce**: the button is already disabled during a search; rapid
  re-entry needs console access. Minor; not a bypass.
- **waitForToken returning-user micro-delay**: bounded + has a synchronous currentUser fast-path;
  the dismissed-as-overstated finding.

## Result
532 tests passing / 0 failed; `vite build` clean; all cron cores Node-import-safe; rules deployed.
