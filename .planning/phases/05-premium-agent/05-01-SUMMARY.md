# 05-01 — Entitlement + Free-tier Gating — SUMMARY

**Status:** COMPLETE (code + tests + infra). Not yet deployed to Vercel (awaits `git push`).
**Date:** 2026-05-31 → 2026-06-01.

## What shipped

### Client logic (TDD, pure)
- `src/lib/usage.js` — `FREE_DAILY_LIMIT=5`, `localDateKey(tz,now)` (local-midnight reset), `remainingQuota`, `isOverQuota`, `evaluateQuota` (pure server-gate decision). Tested: `tests/usage.test.js`, `tests/gemini-quota.test.js`.
- `src/lib/entitlements.js` — single premium read path: `isPremium()`, `applyEntitlement()`, `setPremiumMock()` (dev), `onEntitlementChange()`. Tested: `tests/entitlements.test.js`.

### Server gate
- `api/quota.js` (Node runtime, firebase-admin) — verifies Firebase ID token, reads `users/{uid}.premium`, **atomic `runTransaction` read-check-increment** of `users/{uid}/usage/{localDate}.count`, 429 on the 6th free query, premium bypass, persists `tz`. The metered `/api/search` (Edge) stays untouched; the client calls `/api/quota` first.

### Auth wiring (LIVE file: `public/services/auth.js`)
- Silent **anonymous sign-in** on app open (guest gets a stable UID + ID token); anon treated as a GUEST everywhere (not "logged in").
- **linkWithCredential** upgrade on Google/email sign-in preserves the UID; any link failure falls back to a normal sign-in (login never blocked); `email-already-in-use` surfaces a distinguishable error.
- `getIdToken()` helper for the quota gate.

### Client gate + review fixes
- `src/features/discover.js` — `consumeAiQuota()` before hybrid search; 429 → `lumi:paywall` event (05-02 hook) + quota empty-state; **fails open** on any non-429. Tested: `tests/consume-quota.test.js`.
- `src/features/auth-modal.js` — `requireAuth()` ignores anonymous users (social gates still open the modal). **[review-critical]**
- `src/features/profile.js` — surfaces known auth errors (email-already-in-use) cleanly.
- `api/cost-dashboard.js` + `api/embeddings.js` — `getApps()` guard against warm-isolate `duplicate-app`. **[review-low]**

### Firestore rules (`firestore.rules`, deployed to prod)
- `users/{uid}/usage/{date}` → deny all client access (server-only ⇒ cap un-forgeable).
- `users/{uid}` write split into create/update; client can NEVER create or flip `premium` (`.get('premium',false)` diff) — closes the bypass where a verified user wrote premium directly. `tier` left as a cosmetic, powerless field.
- `pairs/{pairId}` member-scoped baseline (for 05-04). favorites/watchlist/notifications stay anon-compatible.

## Tests
31 new Phase-5 tests; full suite **440 passing** / 22 todo / 2 skipped. `vite build` clean.

## Adversarial review
Ran a 4-dimension review workflow (rules · anon-guest auth · quota wiring · quota endpoint) with per-finding verification: **11 confirmed → fixed, 7 false-positives dismissed**. Notable catches: requireAuth anon bypass (critical), TOCTOU concurrency bypass (→ transaction), and the **wrong-auth-file** discovery (root `services/auth.js` is a dead duplicate; the LIVE file Vite serves is `public/services/auth.js`).

## Infra (provisioned on the CORRECT prod project — see findings)
- **Production Firebase project = `lumi-film-app`** (Vercel prod `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT`; prod site `lumi-jade.vercel.app`).
- ✅ Anonymous auth ENABLED · ✅ Firestore rules deployed · ✅ Firestore DB created (eur3, was absent) · ✅ identitytoolkit API enabled · ✅ `.firebaserc` default set to `lumi-film-app`.

## Findings the owner should know
1. **Local `.env.local` is STALE** — it points to `lumi-acf4a`, but production is `lumi-film-app`. Local dev hits a different/old Firebase project than prod. Align `.env.local` to `lumi-film-app` if you want local ≈ prod.
2. **lumi-film-app had no Firestore DB** until this work (prod ran localStorage-primary; the Firestore mirror silently no-op'd for ~64 days). Now created — a latent gap closed.
3. Possible OLD user data in `lumi-acf4a` (inaccessible to the current Google account). Separate migration question if it matters.
4. Mistaken first deploy to `kisstudios-2026` (gcloud default) created an empty DB there — **cleaned up** (DB deleted).

## Owner action items
- `git push` to deploy the code to Vercel (not pushed — per repo policy).
- After deploy, live smoke test on `lumi-jade.vercel.app`: guest gets an anon UID; 5 AI "Öner Bana" succeed; 6th → paywall event; `setPremiumMock(true)` (dev) bypasses.
- Decide on `.env.local` alignment + any `lumi-acf4a` data.

## Next
05-02 — shared paywall sheet + env-split CTA + quota indicator + the `lumi:paywall` listener.
