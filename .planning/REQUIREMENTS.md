# Requirements: Lumi

**Defined:** 2026-03-19
**Core Value:** When someone doesn't know what to watch, Lumi understands what they're in the mood for and finds it — instantly, accurately, and beautifully.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Discovery & Search

- [ ] **DISC-01**: User can describe what they want to watch in natural language and receive relevant recommendations
- [ ] **DISC-02**: Natural language search uses hybrid approach — embedding-based semantic search for most queries, LLM fallback for complex/edge cases
- [ ] **DISC-03**: User can search by title, actor, or genre with autocomplete suggestions
- [ ] **DISC-04**: User can browse trending and popular content by category (movies, TV shows)
- [ ] **DISC-05**: User receives personalized recommendations based on their watchlist and rating history
- [ ] **DISC-06**: Search results include diversity injection (10-15% explore results outside user's typical genres) to prevent filter bubbles

### Content Detail

- [x] **DETL-01**: User can view comprehensive detail page with synopsis, cast, crew, genres, runtime, and release dates
- [x] **DETL-02**: Detail page shows aggregated ratings from IMDB, Rotten Tomatoes, and Metacritic with source breakdown (not just averaged)
- [x] **DETL-03**: User can watch trailers, behind-the-scenes content, interviews, and BTS videos from detail page
- [x] **DETL-04**: User can access full trivia content for movies/shows (Premium feature)
- [ ] **DETL-05**: User can navigate to actor/director pages showing filmography, career info, and related content
- [x] **DETL-06**: Detail page shows cinema release date for theatrical releases (Free) and streaming release tracking

### Streaming Intelligence

- [x] **STRM-01**: User can see which streaming platforms have the content available in their current country
- [x] **STRM-02**: Streaming availability auto-detects user's country with manual override option (for VPN users)
- [x] **STRM-03**: User can set a notification to be alerted when desired content drops on a streaming platform (Premium)
- [x] **STRM-04**: Streaming availability data shows freshness indicator ("Last updated: X hours ago")

### User & Account

- [ ] **USER-01**: User can sign up and log in with Google or email/password
- [ ] **USER-02**: User can save movies/shows to watchlist and favorites
- [ ] **USER-03**: User can rate content (1-5 stars) contributing to Lumi community average (Premium)
- [ ] **USER-04**: Community rating averages displayed on detail pages alongside external ratings
- [ ] **USER-05**: User ratings are protected from bombing (rate limiting, temporal analysis)

### Premium & Monetization

- [ ] **PREM-01**: Free tier includes core discovery, search, detail pages, streaming availability, and trailers
- [ ] **PREM-02**: Premium tier unlocks full trivia, community ratings, platform drop notifications
- [ ] **PREM-03**: Subscription managed via RevenueCat with monthly/yearly options
- [ ] **PREM-04**: Premium paywall presented after user has experienced core value (not on first visit)

### Design & UX

- [ ] **DSGN-01**: Cinematic Letterboxd-style design — poster-heavy, premium visual feel across all pages
- [ ] **DSGN-02**: Dark theme (primary) and light theme — both polished and cohesive, user can toggle
- [ ] **DSGN-03**: Responsive design works seamlessly on mobile and desktop
- [ ] **DSGN-04**: Smooth page transitions and micro-interactions that feel polished
- [ ] **DSGN-05**: Complete design overhaul of all existing pages — every screen refined to best possible quality

### Platform & Infrastructure

- [ ] **PLAT-01**: PWA installable on mobile devices with home screen icon and splash screen
- [ ] **PLAT-02**: Previously visited content available offline via service worker caching
- [ ] **PLAT-03**: App supports English and Turkish with complete localization (including Turkish-safe string operations)
- [ ] **PLAT-04**: API cost monitoring dashboard to track embedding, LLM, and external API usage
- [ ] **PLAT-05**: All external API calls go through server-side Vercel Edge Functions (no client-exposed keys)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social

- **SOCL-01**: User can share watchlist via link (one-way, no following)
- **SOCL-02**: User can create and share curated lists/collections

### Personalization

- **PERS-01**: User can set genre preferences and content filters
- **PERS-02**: User receives weekly "What to watch" digest based on preferences

### Advanced

- **ADVN-01**: Multi-language expansion beyond EN/TR
- **ADVN-02**: Advanced crew filtering (cinematographer, composer, etc.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile apps (iOS/Android) | PWA approach chosen — single codebase, lower cost |
| Social following/activity feeds | Not core to "what should I watch" — moderation overhead |
| Long-form user reviews | Moderation burden, spam risk — ratings only |
| Streaming playback | Legal complexity — Lumi discovers, doesn't host |
| Real-time chat/forums | Not aligned with core discovery mission |
| User-generated spoiler content | Ruins discovery experience, moderation nightmare |
| Web scraping for ratings | ToS violations — use APIs (Streaming Availability, TMDB, OMDb) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 2 | In Progress (infrastructure built) |
| DISC-02 | Phase 2 | In Progress (infrastructure built) |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Pending |
| DISC-05 | Phase 2 | In Progress (infrastructure built) |
| DISC-06 | Phase 2 | Pending |
| DETL-01 | Phase 3 | Complete |
| DETL-02 | Phase 3 | Complete |
| DETL-03 | Phase 3 | Complete |
| DETL-04 | Phase 3 | Complete |
| DETL-05 | Phase 3 | Pending |
| DETL-06 | Phase 3 | Complete |
| STRM-01 | Phase 3 | Complete |
| STRM-02 | Phase 3 | Complete |
| STRM-03 | Phase 3 | Complete |
| STRM-04 | Phase 3 | Complete |
| USER-01 | Phase 1 | Pending |
| USER-02 | Phase 1 | Pending |
| USER-03 | Phase 4 | Pending |
| USER-04 | Phase 4 | Pending |
| USER-05 | Phase 4 | Pending |
| PREM-01 | Phase 4 | Pending |
| PREM-02 | Phase 4 | Pending |
| PREM-03 | Phase 4 | Pending |
| PREM-04 | Phase 4 | Pending |
| DSGN-01 | Phase 1 | Pending |
| DSGN-02 | Phase 1 | Pending |
| DSGN-03 | Phase 1 | Pending |
| DSGN-04 | Phase 1 | Pending |
| DSGN-05 | Phase 1 | Pending |
| PLAT-01 | Phase 4 | Pending |
| PLAT-02 | Phase 4 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 2 | In Progress (configuration complete: COST_CONFIG defined, metric logging methods added) |
| PLAT-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — traceability complete*
