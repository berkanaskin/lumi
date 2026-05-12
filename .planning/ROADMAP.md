# Roadmap: Lumi

## Overview

Lumi transforms from a working SPA into a globally launchable mobile-first movie/TV discovery app in six phases. Phase 1 establishes the cinematic design foundation. Phase 2 delivers the core differentiator — hybrid AI-powered natural language search. Phase 3 enriches content with streaming availability, aggregated ratings, and comprehensive video/cast content. Phases 3.1 and 03.2 fix mobile QA bugs and Turkish-platform polish before launch prep. Phase 4 makes the app globally consumable (EN-first i18n, region detection, optional auth, onboarding, active series broadcast info). Phase 5 introduces the Premium Movie Night Agent with RevenueCat-managed subscriptions and four proactive features. Phase 6 ships the app to the iOS App Store via Capacitor wrapper.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design Foundation** - Cinematic overhaul of all pages, polished design system, solid auth/watchlist UX (2/2 complete)
- [x] **Phase 2: Hybrid AI Search** - Natural language discovery via embedding search + LLM fallback, personalization, diversity injection (4/4 complete)
- [x] **Phase 3: Content Enrichment** - Streaming availability by country, aggregated ratings, comprehensive video/cast/trivia content (completed 2026-03-21)
- [x] **Phase 3.1: Mobile QA Fixes (INSERTED)** - Fix 11 mobile bugs (4/4 complete)
- [x] **Phase 03.2: Polish & Platform Gaps (INSERTED)** - Turkish platform catalog, favorites bug, profile customization, cinema badge, discover redesign, AI search reliability (6/6 plans + 14 polish rounds complete 2026-05-10)
- [ ] **Phase 4: Global Foundation** - EN-first i18n refactor, region/locale detection, optional auth + guest mode, onboarding flow, active series broadcast info
- [ ] **Phase 5: Premium Agent** - RevenueCat subscriptions (monthly/yearly/lifetime), free-tier limits, paywall UX, and 4 proactive premium features: Decide-for-Me, Pair Mode, Smart Notifications, Evening Assistant
- [ ] **Phase 6: iOS Launch** - Capacitor wrapper, push notification infrastructure (APNs), App Store Connect setup, ASO + screenshots, TestFlight → public release

## Phase Details

### Phase 1: Design Foundation
**Goal**: Every page of Lumi looks and feels like a premium cinematic product — polished enough that users trust it on first visit
**Depends on**: Nothing (first phase)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05, USER-01, USER-02, PLAT-03, PLAT-05
**Success Criteria** (what must be TRUE):
  1. User opens any page and sees a cohesive dark cinematic interface — poster-heavy, no visual inconsistencies across discover, search, detail, and profile
  2. User can toggle between dark and light themes and both feel fully polished
  3. User can sign up, log in (Google or email), manage watchlist and favorites with a smooth, intuitive flow
  4. All UI strings display correctly in English and Turkish with no broken characters or layout issues
  5. No API keys are exposed in browser DevTools — all external calls route through server-side Edge Functions
**Plans**: 2 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Modular CSS refactoring, theme system, navigation (sidebar/bottom-nav), movie cards, toast, loading spinner (COMPLETE)
- [x] 01-02-PLAN.md — Authentication wall (Google OAuth + email/password), watchlist management, i18n verification (EN/TR), API security hardening (Edge Functions) (COMPLETE)

### Phase 2: Hybrid AI Search
**Goal**: Users can describe what they want to watch in plain language and get accurate, relevant recommendations instantly
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, PLAT-04
**Success Criteria** (what must be TRUE):
  1. User types a natural language description ("cozy 90s rom-coms with happy endings") and receives relevant, varied results within 2 seconds
  2. Embedding-based search handles the majority of queries without triggering LLM fallback — confirmed via API cost monitoring dashboard
  3. User can search by title, actor, or genre with autocomplete suggestions appearing as they type
  4. Logged-in user receives recommendations that reflect their watchlist and rating history
  5. Search results include occasional results outside the user's typical genres (diversity injection visible over multiple searches)
**Plans**: 4 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Embedding pipeline infrastructure (OpenAI embeddings, Firestore vector index, batch generation, cost logging) (COMPLETE)
- [x] 02-01b-PLAN.md — Configuration & API service extension (OPENAI_API_KEY, EMBEDDING_CONFIG, COST_CONFIG, EmbeddingService methods) (COMPLETE)
- [x] 02-02-PLAN.md — Hybrid search API (embedding + LLM fallback, confidence scoring, cost dashboard endpoint) (COMPLETE)
- [x] 02-03-PLAN.md — Search UI (autocomplete enhancement, results page, personalization, diversity injection, infinite scroll) (COMPLETE)

### Phase 3: Content Enrichment
**Goal**: Detail pages become the authoritative source for everything a user needs to decide to watch something — availability, ratings, videos, people, and release info all in one place
**Depends on**: Phase 2
**Requirements**: DETL-01, DETL-02, DETL-03, DETL-04, DETL-05, DETL-06, STRM-01, STRM-02, STRM-03, STRM-04
**Success Criteria** (what must be TRUE):
  1. User opens a detail page and immediately sees which streaming platforms carry the content in their country, with direct Watch Now links
  2. Detail page shows ratings from IMDB, Rotten Tomatoes, and Metacritic as separate scores (not a single merged average)
  3. User can browse trailers, behind-the-scenes clips, and interviews from the detail page without leaving the app
  4. User can navigate to an actor or director page and see their full filmography and career info
  5. Streaming availability data shows when it was last updated, and user can manually set their country if auto-detection is wrong
**Plans**: 3 plans in 3 waves

Plans:
- [x] 03-01-PLAN.md — Wave 1: Edge Function proxies (streaming-availability, omdb, geoip), Firestore streaming cache, API service updates, country detection
- [x] 03-02-PLAN.md — Wave 2: Detail page UI overhaul: ratings bar, Where to Watch streaming section, video tabs, cinema badge, trivia Premium gate, country selector, i18n
- [x] 03-03-PLAN.md — Wave 3: Person (actor/director) page: bio, awards, filmography grid with filters/sort, "Frequently Works With" collaborators, cast-click handlers, watchlist streaming data infrastructure

### Phase 03.2: Polish & Platform Gaps (INSERTED) — COMPLETE

**Goal:** App feels complete and polished for Turkish users — Turkish streaming providers visible, working favorites/watchlist, customizable profile, redesigned cinema badge + discover screen, and dead-code cleanup before Phase 4
**Requirements**: TRACK-A, TRACK-B, TRACK-C, TRACK-D, TRACK-E, TRACK-F
**Depends on:** Phase 3
**Plans:** 6 plans + 14 polish rounds (2026-04-01 → 2026-05-10)

Plans:
- [x] 03.2-01-PLAN.md — Favorites/Watchlist localStorage key fix + legacy migration (Track D)
- [x] 03.2-02-PLAN.md — Turkish streaming providers two-layer TMDB merge + HBO Max logo + missing URLs (Track A)
- [x] 03.2-03-PLAN.md — Profile customization: editable name + preset avatars + meaningful stats (Track E)
- [x] 03.2-04-PLAN.md — Cinema badge ribbon redesign + pulse animation (Track B)
- [x] 03.2-05-PLAN.md — Discover/Search screen restyle + AI button consolidation (Track C)
- [x] 03.2-06-PLAN.md — Code cleanup: dead JS, desktop CSS, stale worktrees (Track F)

**Polish rounds shipped (post-plan):**
- R1-R3: gap closures for AI search hallucination, Turkish streaming root cause, watchlist + Öner Bana sessions
- R4-R8: Vercel deployment debugging (eventually root-caused to `export const runtime` syntax not recognized by Vercel's Vite adapter — must use legacy `export const config = { runtime: 'edge' }`)
- R9: edge runtime config syntax fix — endpoints came online
- R10-R12: AI hallucination fix (Gemini returns title+year, TMDB title-search with year proximity ranking), JSON truncation recovery, Öner Bana UX redesign (in-textarea rotating placeholder with Tab/click-to-fill)
- R13: Curated Turkish platform catalog (`src/data/turkish-platform-catalog.json`) — 28 verified TMDB IDs, byNormalizedTitle fallback
- R14: Local PNG logos for Gain/Exxen/Tabii/TOD/Puhu TV in `public/img/platforms/`
- R14b: BluTV removed (fully consolidated under HBO Max)
- R14c: Broadcast channels removed (Show TV / ATV / TRT / Star TV — they air content, they don't stream it; deferred to Phase 4.5)

### Phase 3.1: Mobile QA Fixes (INSERTED) — COMPLETE

**Goal:** All 11 mobile QA bugs are fixed — the app is stable, polished, and fully functional on mobile before Phase 4
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06, BUG-07, BUG-08, BUG-09, BUG-10, BUG-11
**Depends on:** Phase 3
**Plans:** 4/4 plans complete

Plans:
- [x] 03.1-01-PLAN.md — Critical bugs: scroll lock fix, autocomplete restore, discover screen repair
- [x] 03.1-02-PLAN.md — Detail page polish: stuck shimmer removal, modal top gap fix, country name localization
- [x] 03.1-03-PLAN.md — Auth cleanup: test user removal, login wall fix, profile page bugfixes
- [x] 03.1-04-PLAN.md — Notification wiring + search overlay i18n

### Phase 4: Global Foundation

**Goal**: Lumi can launch globally — runs in any region with the user's language, no login required for browse, onboarding gathers what AI needs (language + country + owned streaming platforms), and active-series broadcast info enriches detail pages where relevant.
**Depends on**: Phase 03.2
**Requirements**: GLOB-01, GLOB-02, GLOB-03, GLOB-04, GLOB-05
**Success Criteria** (what must be TRUE):
  1. App detects the user's device language and serves EN as a fallback for any unsupported language; TR fully covered; scaffolding ready for ES/FR/DE/JA/KO
  2. Backend endpoints (`api/search`, `api/gemini`, TMDB calls) honor the user's `lang` parameter — content metadata returned in their language
  3. Guest user can browse all of Lumi without logging in; favoriting/watchlisting works via localStorage; vote/comment actions trigger an inline auth modal (action-triggered auth)
  4. New user is greeted by a 3-step onboarding (language confirm → country confirm → streaming platforms owned) — answers persist to profile (or localStorage for guests)
  5. Detail page for a currently-airing TV series shows broadcast network + next-episode info alongside streaming availability; ended series show only streaming

**Plans:** 5 sub-steps in 4 waves

Plans:
- [ ] 04-01-PLAN.md — **Phase 4.1: i18n EN-first refactor**
  - Audit all hardcoded TR strings, convert to `t()` calls
  - Promote EN to default fallback, complete TR coverage
  - Scaffolding: empty JSON for `es.json`, `fr.json`, `de.json`, `ja.json`, `ko.json`
  - Backend route updates: accept `lang` in request body, propagate to TMDB `language` param, Gemini prompt language

- [ ] 04-02-PLAN.md — **Phase 4.2: Region + locale detection**
  - Auto-detect via `navigator.language` + `Accept-Language` header
  - Cross-check with existing geoip endpoint
  - Persist to localStorage `{lang, country}`, expose override in profile settings

- [ ] 04-03-PLAN.md — **Phase 4.3: Auth optional + guest mode**
  - Remove login wall from app entry
  - Guest mode: favoriler/watchlist/search history in localStorage (already wired in 03.2-01)
  - Action-triggered auth modal: vote/comment/share → "Log in to continue"
  - Migration: on signup, sync localStorage → Firestore `users/{uid}`

- [ ] 04-04-PLAN.md — **Phase 4.4: Onboarding flow**
  - 3 steps: language confirm (auto-detected, override-able) → country confirm → owned streaming platforms (multi-select from region's available list)
  - Skip allowed; persist `ownedPlatforms[]` to user profile or localStorage
  - Show on first launch only (flag in profile / localStorage)

- [ ] 04-05-PLAN.md — **Phase 4.5: Active series broadcast info**
  - Detail page: detect TMDB `status === 'Returning Series'` or `next_episode_to_air != null`
  - Show "Yayın Kanalı / Airing on" section with broadcast network + next-episode date + time when applicable
  - Catalog overlay for TR broadcast (Show TV, ATV, TRT, Star TV) with deep links
  - Ended series: section hidden, only streaming providers shown

### Phase 5: Premium Agent

**Goal**: Lumi monetizes via the "Movie Night Agent" positioning — Premium delivers four proactive features that solve real decision/coordination pain, not gated power-user features. RevenueCat manages subscriptions and lifetime IAP.
**Depends on**: Phase 4
**Requirements**: PREM-01, PREM-02, PREM-03, PREM-04, PREM-05
**Success Criteria** (what must be TRUE):
  1. Free user has 5 AI Öner Bana queries per day, unlimited browse + favorites + watchlist + streaming providers
  2. Free user hits 6th AI query → paywall appears explaining Premium value (4 proactive features + unlimited AI)
  3. Premium subscription priced via RevenueCat (region-aware): default $2.99/month, $19.99/year, $49.99 lifetime — A/B testable
  4. "Decide-for-Me" returns exactly 1 recommendation based on history, owned platforms, mood, time-of-day
  5. "Pair Mode" pairs two profiles, returns recommendations both haven't seen and both would likely enjoy
  6. "Smart Notifications" sends push when a watchlist item lands on a new platform or favorite creator releases new content
  7. "Evening Assistant" sends one 20:00 push with 3 hand-picked suggestions for tonight

**Plans:** 5 plans (estimate)

Plans:
- [ ] 05-01: RevenueCat setup — products (monthly/yearly/lifetime), entitlements, offerings, region pricing
- [ ] 05-02: Free tier limits — AI search counter (per user/day), paywall UX, soft + hard gates
- [ ] 05-03: Decide-for-Me + Pair Mode features (proactive AI)
- [ ] 05-04: Smart Notifications infrastructure (Firestore listeners for watchlist platform changes + favorite-creator alerts)
- [ ] 05-05: Evening Assistant scheduled push (Vercel cron + per-user delivery time based on locale)

### Phase 6: iOS Launch

**Goal**: Lumi ships to the iOS App Store as a paid/freemium app with proper ASO, screenshots, push notification support, and TestFlight beta-to-public release pipeline.
**Depends on**: Phase 5
**Requirements**: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04
**Success Criteria** (what must be TRUE):
  1. App runs natively on iOS via Capacitor wrapper, no PWA install required
  2. APNs push notifications work for Smart Notifications + Evening Assistant
  3. App Store Connect record is configured with bundle ID, signing, capabilities, App Privacy
  4. Localized App Store listings (EN + TR minimum) with optimized keywords, subtitle, screenshots, preview video
  5. TestFlight beta is shippable, public release happens after at least one week of beta feedback

**Plans:** 4 plans (estimate)

Plans:
- [ ] 06-01: Capacitor wrapper setup — Xcode project, iOS native shell, build pipeline, asc CLI integration
- [ ] 06-02: APNs push infrastructure — Firebase Cloud Messaging or direct APNs, token registration, device management
- [ ] 06-03: App Store Connect setup — bundle ID, signing certificates, provisioning, capabilities, App Privacy disclosures, IAP products linked to RevenueCat
- [ ] 06-04: ASO + screenshots — keyword research (English markets first: US/UK/CA/AU), screenshot framing, preview video, EN + TR localized metadata, TestFlight beta + public submission

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 3.1 → 03.2 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design Foundation | 2/2 | COMPLETE | 2026-03-19 |
| 2. Hybrid AI Search | 4/4 | COMPLETE | 2026-03-19 |
| 3. Content Enrichment | 3/3 | COMPLETE | 2026-03-21 |
| 3.1 Mobile QA Fixes | 4/4 | COMPLETE | 2026-03-27 |
| 03.2 Polish & Platform Gaps | 6/6 + 14 polish rounds | COMPLETE | 2026-05-10 |
| 4. Global Foundation | 0/5 | Pending | - |
| 5. Premium Agent | 0/5 | Pending | - |
| 6. iOS Launch | 0/4 | Pending | - |
