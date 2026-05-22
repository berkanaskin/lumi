---
phase: 04-global-foundation
type: uat
status: in_progress
started: 2026-05-13
---

# Phase 04 — User Acceptance Test

Walks the user through Phase 4 Global Foundation acceptance criteria. One scenario at a time.

## 04-01 i18n EN-first

- [ ] **T1** EN is the default for first-time browser (private window, navigator.language=en-*) — UI renders in English.
- [ ] **T2** TR user (navigator.language=tr-*) sees full TR UI, no missing keys.
- [ ] **T3** Backend `api/search` and `api/gemini` honor `lang` parameter (Gemini prompt language matches).

## 04-02 locale layer

- [ ] **T4** Accept-Language header fallback works for users with weird `navigator.language`.
- [ ] **T5** Vercel `request.geo.country` used as country fallback when geoip endpoint not yet called.
- [ ] **T6** `lumi_locale` localStorage override beats auto-detection.

## 04-03 optional auth + guest mode

- [ ] **T7** Fresh private window: app loads to home/search WITHOUT a login wall.
- [ ] **T8** Guest can search, view detail, add to watchlist (localStorage), browse favorites.
- [ ] **T9** Action that requires auth (profile page or gated action) opens auth-modal instead of wall.
- [ ] **T10** Sign-in migrates localStorage `watchlist_items` + `liked_items` to Firestore (no duplication on re-run).

## 04-04 onboarding wizard

- [ ] **T11** **Scenario A — first launch (guest):** wizard appears, 3 steps (lang → country → platforms), completes & sets `lumi_onboarding` localStorage flag.
- [ ] **T12** **Scenario B — skip:** skip button on each step applies defaults; flag still set; wizard does not re-appear.
- [ ] **T13** **Scenario C — re-launch:** with flag set, wizard does NOT show.
- [ ] **T14** **Scenario D — provider fetch failure:** TMDB providers endpoint error → wizard still completes (graceful degrade).
- [ ] **T15** **Scenario E — cross-device hydration:** sign in on second device, preferences load from Firestore `users/{uid}.preferences`, wizard skipped.

## 04-05 TR broadcast info

- [ ] **T16** Returning Series TR TV detail (e.g., a Show TV / ATV series) shows "Yayın Kanalı" section above streaming providers, with local PNG logo + next-episode date.
- [ ] **T17** Ended series with `next_episode_to_air=null` does NOT render the broadcast section.
- [ ] **T18** Movie detail page never renders broadcast section.
- [ ] **T19** Non-TR network (CBS, BBC, etc.) uses TMDB-supplied logo (no curated local PNG).

## Findings

(populated as we go)

## Resolution

(populated when all scenarios pass or blocker plan filed)
