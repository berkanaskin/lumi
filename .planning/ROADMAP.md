# Roadmap: Lumi

## Overview

Lumi transforms from a working SPA into a polished, differentiated movie/TV discovery platform in four phases. Phase 1 establishes the cinematic design foundation and infrastructure that makes the app feel premium. Phase 2 delivers the core differentiator — hybrid AI-powered natural language search. Phase 3 enriches content with streaming availability, aggregated ratings, and comprehensive video/cast content. Phase 4 closes the product loop with PWA support, community features, and the freemium monetization model.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Design Foundation** - Cinematic overhaul of all pages, polished design system, solid auth/watchlist UX (2/2 complete)
- [ ] **Phase 2: Hybrid AI Search** - Natural language discovery via embedding search + LLM fallback, personalization, diversity injection
- [ ] **Phase 3: Content Enrichment** - Streaming availability by country, aggregated ratings, comprehensive video/cast/trivia content
- [ ] **Phase 4: Premium Platform** - Community ratings, PWA install + offline, freemium subscription model

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
- [ ] 02-02-PLAN.md — Hybrid search API (embedding + LLM fallback, confidence scoring, cost dashboard endpoint)
- [ ] 02-03-PLAN.md — Search UI (autocomplete enhancement, results page, personalization, diversity injection, infinite scroll)

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
**Plans**: TBD

Plans:
- [ ] 03-01: Streaming availability + aggregated ratings (Streaming Availability API + TMDB, server-side caching)
- [ ] 03-02: Comprehensive video content, cast/director pages, trivia, and cinema/streaming release date display

### Phase 4: Premium Platform
**Goal**: Lumi is an installable app users return to — with a sustainable freemium model, community ratings, and platform drop notifications
**Depends on**: Phase 3
**Requirements**: USER-03, USER-04, USER-05, PREM-01, PREM-02, PREM-03, PREM-04, PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):
  1. User can install Lumi on their phone's home screen and open it like a native app
  2. User can browse previously visited movies and their watchlist while offline
  3. Premium user can rate content and see Lumi community average on detail pages alongside external ratings
  4. User encounters the premium paywall only after having used core discovery features, not on first visit
  5. Premium subscription can be purchased and managed (monthly/yearly) via RevenueCat
**Plans**: TBD

Plans:
- [ ] 04-01: PWA install + offline caching (Workbox + @vitejs/plugin-pwa)
- [ ] 04-02: Community ratings (with abuse protection) + freemium paywall + RevenueCat subscription management

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design Foundation | 2/2 | COMPLETE | 2026-03-19 |
| 2. Hybrid AI Search | 1/3 | IN PROGRESS | - |
| 3. Content Enrichment | 0/2 | Pending | - |
| 4. Premium Platform | 0/2 | Pending | - |
