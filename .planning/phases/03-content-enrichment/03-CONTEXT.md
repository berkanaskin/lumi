# Phase 3: Content Enrichment - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Detail pages become the authoritative source for everything a user needs to decide to watch something — streaming availability by country, aggregated ratings (IMDB, RT, Metacritic), comprehensive video content (trailers, BTS, interviews), actor/director pages with filmography, trivia (Premium-gated), and cinema/streaming release date display. Does NOT include community ratings, PWA, or freemium subscription — those are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Streaming Availability
- Primary data source: Streaming Availability API (RapidAPI free tier, 100 req/day) — TMDB watch/providers alone is insufficient for Turkish platforms (GAIN missing entirely, HBO Max/TOD incomplete)
- TMDB as fallback when Streaming Availability API quota is exhausted
- Aggressive caching: Firestore per title+country, 24-48h TTL — most views served from cache
- Grouped by type: Stream (Netflix, Disney+), Rent (Google Play, iTunes), Buy (Apple TV, Amazon) — platform logos with scores
- Placement: Just below poster/title area, above overview — high visibility "Where to Watch" section
- Deep links: Use API-provided direct content URLs when available, fall back to platform search links from platforms.js
- Freshness indicator: Subtle "Updated 3 hours ago" timestamp below streaming section; stale data (>24h) gets warning icon
- Country detection: Auto-detect via IP geolocation on first visit, save preference
- Country selector: In the main app header (visible on all pages) + in profile/settings — NOT on individual detail pages
- Platform drop notifications: Watchlist-based — any title in watchlist automatically monitored for new platform availability (Premium, Phase 4 implementation but data infrastructure built here)

### Ratings Presentation
- Sources: IMDB, Rotten Tomatoes, Metacritic only — no TMDB rating shown
- Display: Small source logos only + score number. No text labels, no extra decoration — just logo + puan
- Scores in native format (8.2/10, 92%, 85/100)
- Placement: Under title line, above overview — one of the first things users see
- Data source: OMDb API (RatingsService already stubbed in api.js)

### Actor/Director Pages
- Navigation: Full dedicated page (e.g., /person/12345) — not modal or overlay
- Content: Filmography poster grid + bio/career info + "Frequently works with" related people + awards/trivia
- Filmography: Poster grid reusing movie-card component with filter chips (All / Movies / TV Shows / As Director), sort by year (newest first) or by rating
- Bio section: Photo, birth date/place, known-for department, biography text (all from TMDB person endpoint)
- Related people: "Frequently works with" section showing frequent collaborators
- Awards & trivia: Data source to be researched — researcher agent must investigate free/low-cost sources for actor awards and trivia data. User explicitly wants no gaps — find alternatives rather than defer

### Video Content
- Organization: Category tabs — Trailers | Behind the Scenes | Interviews
- Each tab: Horizontal scroll of video thumbnails
- Play: Inline YouTube embed on tap (existing pattern)
- Data: YouTube + TMDB video APIs (already fetched by category in detail.js)

### Trivia
- Fully Premium-gated: Trivia section shows locked icon with "Unlock with Premium"
- No free preview/teaser
- Data source: To be researched alongside awards data

### Release Dates
- Cinema release: Prominent badge on detail page — "In cinemas March 28" or "Now in cinemas"
- Streaming-only: Show estimated or confirmed streaming date
- No separate release calendar section — badge approach keeps it clean

### Claude's Discretion
- Streaming Availability API specific integration details (endpoints, response mapping)
- Caching implementation details (Firestore collection structure, TTL mechanism)
- IP geolocation service choice for country auto-detection
- OMDb integration completion (RatingsService already stubbed)
- Person page layout and responsive design details
- Video tab styling and thumbnail sizes
- Exact badge design for cinema release dates
- "Frequently works with" algorithm (shared credits count threshold)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Detail Page
- `src/features/detail.js` — Current detail modal: fetches providers, credits, TMDB videos, YouTube videos in parallel. Extend with ratings and enhanced streaming
- `src/services/api.js` — TMDBService (getWatchProviders, getCredits, getDetails, getVideos), RatingsService (getAllRatings via OMDb — stub), YouTubeService
- `src/lib/platforms.js` — Platform deep linking URLs (Netflix, Disney+, GAIN, BluTV, etc.) — fallback for streaming links

### Design System (Phase 1)
- `src/styles/tokens.css` — Design tokens for consistent styling
- `src/styles/cards.css` — Movie card styling (poster-dominant pattern) — reuse for filmography grids

### State & Navigation
- `src/lib/state.js` — Global state with currentRegion, watchlist/favorites
- `src/lib/navigation.js` — SPA page routing — needs extension for /person/:id route
- `src/config.js` — Environment variables — new API keys needed (Streaming Availability, OMDb)

### API Proxy Layer
- `api/gemini.js` — Edge Function pattern to follow for new streaming/ratings proxies
- `api/tmdb.js` — TMDB proxy with caching headers

### Codebase Analysis
- `.planning/codebase/INTEGRATIONS.md` — Current API integrations, auth, environment variables
- `.planning/codebase/STRUCTURE.md` — Where to add new code (features, services, api routes)
- `.planning/codebase/CONVENTIONS.md` — Coding style, naming, module patterns

### Requirements
- `.planning/REQUIREMENTS.md` — DETL-01 through DETL-06, STRM-01 through STRM-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/detail.js`: Already fetches providers, credits, videos in parallel — extend with ratings + enhanced streaming
- `src/services/api.js`: RatingsService.getAllRatings(imdbId) — OMDb stub ready, needs completion
- `src/services/api.js`: TMDBService.getWatchProviders(id, type, country) — existing, used as fallback
- `src/ui/movie-card.js`: Poster-dominant card with hover overlay — reuse for filmography grid on person pages
- `src/lib/platforms.js`: PLATFORM_URLS with deep links for global + Turkish platforms — fallback for streaming links
- `api/*.js`: Edge Function pattern for server-side API proxying — model for new endpoints

### Established Patterns
- API calls through Vercel Edge Functions (api/*.js) — new streaming/ratings endpoints follow same pattern
- Feature modules export init functions called from main.js
- DOM-centric rendering with innerHTML templates + event delegation
- localStorage + Firestore dual persistence
- Video category fetching (trailer, bts, interview) already implemented in detail.js

### Integration Points
- `src/main.js` — Add person page initialization, streaming availability enhancement
- `api/` directory — New Edge Functions: streaming-availability proxy, omdb proxy (if not already proxied)
- `src/lib/navigation.js` — New route for /person/:id
- `src/config.js` — New env vars: STREAMING_AVAILABILITY_API_KEY, VITE_OMDB_API_KEY confirmation
- Firestore — New collection for streaming availability cache (title+country → provider data + timestamp)
- App header — Country selector component added to main navigation

</code_context>

<specifics>
## Specific Ideas

- "Nerede izlenir meselesinin tam kapasiteli kusursuz çalışan bir sistem olması benim için çok önemli" — streaming availability must be flawless, no gaps in Turkish platform coverage
- TMDB alone is insufficient for Turkey (GAIN missing entirely, HBO Max incomplete) — hence Streaming Availability API as primary source
- Ratings: Only source logos (small) + score numbers. Nothing else — clean, minimal
- Awards & trivia data: Research thoroughly, don't leave gaps — "eksik kaynak bırakmadan ilerleyelim, alternatifler bula bula dizayn ede ede"
- Country selector belongs in the main app header, not per-detail-page

</specifics>

<deferred>
## Deferred Ideas

- Lumi community ratings — Phase 4 (Premium feature with abuse protection)
- Platform drop notification delivery mechanism — Phase 4 (data infrastructure can be laid in Phase 3, but notification UI/push is Phase 4)
- Premium subscription paywall and RevenueCat integration — Phase 4

</deferred>

---

*Phase: 03-content-enrichment*
*Context gathered: 2026-03-20*
