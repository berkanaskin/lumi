# Phase 5: Premium Agent — Context

**Status:** Planning complete (grilled 2026-05-31). Ready to execute 05-01.
**Depends on:** Phase 4 + Phase 4.6 (onboarding, region-platforms, optional auth, Firestore migration).
**Toolchain:** context-mode + `tdd` skill (GSD removed). No worktree agents — execute inline.

## Why this phase exists

Lumi monetizes via the **"Movie Night Agent"** positioning. Premium is NOT feature-gating power-user
toys — it delivers four proactive features that solve real decision/coordination pain
(Decide-for-Me, Pair Mode, Smart Notifications, Evening Assistant) on top of unlimited AI.

## Hard constraint feeding every decision

**The publishing account (Apple Developer / Google Play / RevenueCat) is NOT chosen yet.**
Therefore Phase 5 is **account-agnostic**: everything that depends on a specific store or
RevenueCat account is isolated behind one thin abstraction layer + one config file, to be
filled in Phase 6. Real StoreKit/Play Billing purchase and real APNs/FCM push are **Phase 6**.

## Phase boundary

**In scope (Phase 5):**
- Entitlement model (Firestore source of truth + `entitlements.js` abstraction)
- Free-tier server-side gating (5 AI/day) via Firebase Anonymous Auth + Firestore counter
- Paywall UX (shared sheet, env-split CTA, mock unlock in dev)
- All 4 proactive features working against live data, surfaced in an in-app **Agent** hub
- Notification **logic + in-app inbox** (detection cron for premium users)
- Evening Assistant generation via tz-bucketed hourly Vercel cron

**Out of scope (deferred to Phase 6):**
- Real RevenueCat SDK / StoreKit / Play Billing purchase flow
- Real push delivery (APNs/FCM) — Phase 5 writes events to in-app inbox only
- App Store Connect / Play Console product setup
- QR camera scanning (Phase 5 uses 6-digit pairing code; QR render optional)

## Locked decisions feeding this phase

Source: `.planning/decisions/PREMIUM-PRICING.md` (LOCKED) + grill session 2026-05-31.

| Decision | Lock |
|---|---|
| Entitlement source of truth | Firestore `users/{uid}.premium` + guest localStorage mirror; `entitlements.js → isPremium()` |
| Who writes entitlement | Phase 5: mock paywall (dev). Phase 6: `/api/revenuecat` webhook (RC receipt validation) |
| Free cap | 5 AI "Öner Bana"/day, server-side in `api/gemini.js`, Firestore `users/{uid}/usage/{localDate}.count` |
| Guest identity | Firebase **Anonymous Auth** (silent sign-in on app open) |
| Guest→account upgrade | **linkWithCredential** preserves UID (usage/premium/favorites survive); fallback merge on email-exists |
| Trial | **3 days**, subscription tiers only, none on lifetime. (PREMIUM-PRICING.md "7 day" → "3 day" CORRECTION required) |
| "Seen" definition | Derived: `userRatings ∪ liked_items`. `watchlist_items` = positive "both want" signal. No new watched-tracking UI. |
| Pair Mode | Persistent `pairs/{pairId}`, both must be authed (not anon), 6-digit code pairing |
| Decide-for-Me | Single-tap + optional mood chips; time-of-day auto-inferred; single dramatic reveal card |
| Smart Notifications | Daily Vercel cron, **premium users only**, cost-aware SA cache + TMDB `next_episode_to_air` diff |
| Evening Assistant | Store IANA tz on `users/{uid}.tz`; **hourly bucket cron** delivers at local 20:00; 3 AI-personalized titles |
| Local-time reset | Same `tz` drives free-cap reset at local 00:00 (usage doc key = user's local date) |
| Feature placement | Dedicated **Agent** hub (not 5th nav tab; entry from Home / merged ✨ surface) |
| Paywall trigger | (1) 6th AI query, (2) tapping any premium feature; shared sheet reused from onboarding mock |
| Mock purchase | **prod = store CTA** (no web sale, per pricing doc); **dev = mock unlock** toggle flips Firestore flag |

## Premium AI endpoint strategy

Reuse `api/gemini.js` infrastructure with a `feature` param (`decide` | `pair` | `evening`)
instead of new endpoints. Premium calls are uncapped (locked) but get a soft abuse-guard log.

## Plans (planned)

- **05-01** — Entitlement + anon-auth + linkWithCredential + Firestore usage counter + `api/gemini.js` 5/day enforce
- **05-02** — Shared paywall sheet + env-split CTA + remaining-quota indicator + triggers
- **05-03** — Agent hub + nav + Decide-for-Me (seen-derivation + mood + reveal)
- **05-04** — Pair Mode (6-digit code + `pairs/{pairId}` + dual-history intersection)
- **05-05** — Notification inbox + premium detection cron + Evening Assistant (tz-bucket cron)

## Success criteria (Nyquist gates)

1. Free user gets exactly 5 AI queries/day enforced **server-side**; 6th → 429 + paywall.
2. Guest's usage/favorites survive signup via linkWithCredential (same UID).
3. Premium unlock (dev mock) flips one Firestore flag; all 4 features read `isPremium()`.
4. Decide-for-Me returns exactly 1 unseen title honoring platforms + mood + time.
5. Pair Mode pairs two real accounts by 6-digit code; returns titles neither has seen.
6. Smart Notifications cron writes inbox events for premium users on platform/episode changes.
7. Evening Assistant fires at each user's local 20:00 with 3 personalized titles.
8. Web prod paywall shows store CTA (no sale); no "free premium" path ships to prod.
9. Existing 387 test suite stays green; new logic covered by TDD unit tests.
