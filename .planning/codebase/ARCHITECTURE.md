# Architecture

**Analysis Date:** 2026-05-07

## Pattern Overview

**Overall:** Mobile-first Modular SPA (Single Page Application) — Vite-bundled vanilla JS frontend backed by Vercel serverless functions and Firebase (Auth + Firestore). Feature-based organization with strict layered separation.

**Key Characteristics:**
- ES Module-based architecture (Vite + modern JavaScript, no framework)
- Mobile-only target — no desktop/responsive split, viewport optimized for touch
- Centralized mutable global state with localStorage + Firestore dual persistence
- Feature modules encapsulate domain logic (discover, detail, search, profile, person, search-results)
- Clear split between UI rendering, business logic, and external API services
- Firebase Auth (Google OAuth + email/password) drives user tier (guest/free/premium)
- Firestore as cloud sync for favorites, watchlist, ratings, notifications, streaming cache
- Vercel serverless proxies (`api/*.js`) hide third-party API keys (Gemini, TMDB, OMDB, RapidAPI)
- Backwards compatibility via `window.LumiModules` exports for legacy inline HTML scripts

## Layers

**Configuration Layer:**
- Purpose: Environment-based configuration, API endpoints, Firebase project config
- Location: `src/config.js`
- Contains: `CONFIG`, `FIREBASE_CONFIG`, `API_URLS`, `isDevelopment`
- Depends on: Vite environment variables (`import.meta.env`)
- Used by: All service layers and feature modules

**API Services Layer:**
- Purpose: Abstract external API calls behind a unified interface
- Location: `src/services/api.js`, `src/services/streaming-cache.js`
- Contains: `TMDBService`, `YouTubeService`, `RatingsService`, `GeoIPService`, `SearchService`, `EmbeddingService`, aggregate `API` object, Firestore-backed streaming cache
- Depends on: `CONFIG`, fetch API, Firebase Firestore SDK
- Used by: All feature modules and pages
- Key pattern: Service object literals (no classes); methods return data or `{ results: [] }` fallback on error

**Backend Proxy Layer (Serverless):**
- Purpose: Vercel functions that proxy third-party APIs and inject server-side secrets
- Location: `api/*.js`
- Contains: `gemini.js`, `tmdb.js`, `youtube.js`, `omdb.js`, `streaming-availability.js`, `embeddings.js`, `geoip.js`, `search.js`, `cost-dashboard.js`
- Pattern: Each file exports a default async handler `(req, res) => ...`; reads secrets from `process.env`; returns JSON
- Used by: Frontend services call `/api/{name}` instead of holding API keys client-side

**State Management Layer:**
- Purpose: Centralized application state and DOM element cache
- Location: `src/lib/state.js`
- Contains: Global `state` object, `elements` cache, `initElements`, `updateState`, `loadFavorites`, `saveFavorites`, `APP_VERSION`
- Depends on: localStorage API
- Used by: All feature modules and components
- Key pattern: Direct mutation via `Object.assign`; `CustomEvent('stateChanged')` dispatched on update; also exposed as `window.state` for legacy scripts

**Navigation Layer:**
- Purpose: Section-based page routing without hash fragments
- Location: `src/lib/navigation.js`
- Contains: `PAGES`, `navigateTo`, `goBack`, `hideAllSections`, `setupBottomNav`, `updateActiveNavItem`
- Pattern: Sections toggle `active` class; bottom navigation tabs (Home, Discover, Favorites, Profile)

**Feature Modules Layer:**
- Purpose: Domain-specific feature implementations
- Location: `src/features/`
- Contains: `discover.js` (AI/wizard/daily rec), `search.js` (autocomplete + history), `detail.js` (movie/TV modal, crew, watch providers), `profile.js` (auth, stats, settings), `person.js` (actor/director page with bio + filmography)
- Pattern: Each module exports focused named functions; modules communicate via shared `state`

**Pages Layer (newer):**
- Purpose: Full-screen views beyond the modal pattern
- Location: `src/pages/`
- Contains: `search-results.js` (infinite scroll, personalization, diversity injection)
- Pattern: Self-contained module-level state (e.g., `searchState`) plus shared global `state`

**UI Components Layer:**
- Purpose: Reusable rendering components
- Location: `src/ui/`
- Contains: `movie-card.js`, `theme.js`, `toast.js`, `loading.js`, `autocomplete-dropdown.js`, `diversity-section.js`
- Pattern: Factory functions that create DOM elements or render HTML strings

**Utilities Layer:**
- Purpose: Pure helpers, constants, platform metadata
- Location: `src/lib/helpers.js`, `src/lib/constants.js`, `src/lib/platforms.js`, `src/lib/embeddings.js`
- Contains: `debounce`, `throttle`, `formatDate`, `GENRES`, `getImageUrl`, platform URL maps, embedding version cache
- Used by: All layers (services, features, UI, pages)

**Auth/Firebase Bridge:**
- Location: `services/auth.js` (legacy top-level path retained for HTML inline access), `src/features/profile.js`
- Pattern: Firebase modular SDK initialized once; `onAuthStateChanged` updates `state.userTier` and triggers UI refresh

**Main Entry Point:**
- Location: `src/main.js`
- Responsibilities: Import all modules, initialize DOM cache, set theme, load auth, start daily recommendation timer, expose modules on `window.LumiModules` for inline-script callers

## Data Flow

**Initialization Flow:**

1. Vite serves `index.html`, which loads `src/main.js` as a module script
2. All ES module imports resolve (config, state, services, features, UI)
3. `DOMContentLoaded` → `initElements()` caches DOM nodes into `elements`
4. `loadTheme()` restores dark/light preference from localStorage
5. `initNavigation()` + `setupBottomNav()` wire bottom tab handlers
6. `initPersonPage()` registers event delegation for the actor/director view
7. `initDiscoverModule()` schedules daily recommendation refresh
8. Firebase Auth state listener fires → `updateAuthUI()` syncs profile chrome
9. `window.LumiModules` populated for inline `onclick=` handlers in `index.html`

**Search Flow:**

1. User types in `#search-input` → `handleAutocomplete()` (debounced ~300ms)
2. `API.search()` → Vercel `/api/tmdb` proxy → TMDB multi-search
3. `showAutocomplete()` renders dropdown via `autocomplete-dropdown.js`
4. User taps result → `openDetail(id, type)` (or full results page via `src/pages/search-results.js` for infinite-scroll)
5. Search-results page hydrates with `SearchService` + `EmbeddingService` (personalized re-rank)

**Detail Flow:**

1. `openDetail()` parallel-awaits `API.getDetails()`, `getCredits()`, `getWatchProviders()`, `getTMDBVideos()`
2. Watch providers go through `streaming-cache.js`: Firestore lookup → 24h fresh? return; else fetch RapidAPI / TMDB and write back with 48h `expiresAt`
3. Crew section (Director, Writer, Producer) extracted from credits, rendered into modal
4. Modal becomes visible via `classList.add('active')`

**Favorites/Watchlist Flow (Authenticated):**

1. User taps heart/bookmark → `toggleLike()` / `toggleWatchlist()`
2. Local `state.favorites` / `state.watchlist` mutated
3. `saveFavorites()` writes to localStorage (offline-first)
4. If signed in: parallel write to Firestore `users/{uid}/favorites/{itemId}` (rules enforce `request.auth.uid == userId`)
5. On next session: `loadFavorites()` merges localStorage + Firestore subscription

**State Update Flow:**

1. Module calls `updateState({ key: value })`
2. `Object.assign(state, patch)` mutates the shared object
3. `CustomEvent('stateChanged', { detail: patch })` dispatched on `window`
4. Listeners (e.g., profile UI) re-render

## Key Abstractions

**API Aggregate:**
- `src/services/api.js` exports `API` — single namespace combining TMDB, YouTube, Ratings, GeoIP, Search, Embeddings
- Callers use `API.search()`, `API.getDetails()` rather than reaching into individual services

**Service Objects:**
- Plain object literals with async methods (no class constructors)
- Internal helpers shared via closure / module scope (e.g., `TMDBService.fetch()`, `TMDBService.normalizeTitle()`)

**Streaming Cache Abstraction:**
- `src/services/streaming-cache.js` wraps watch-provider lookups with 24h app-level TTL + 48h Firestore expiry
- Falls back to TMDB watch providers if RapidAPI fails

**Embedding Version Manager:**
- `src/lib/embeddings.js` caches the active embedding version (5-min TTL) so personalization queries stay consistent across a session

**Modal/Section Pattern:**
- Detail modal (`#detail-modal`), full-page sections (`#home-section`, `#discover-section`, `#view-person`, search results) all toggle a single `active` class
- Avoids client-side router; preserves scroll/state cheaply

**Lazy Image Loading:**
- `<img loading="lazy">` on every poster/backdrop, plus skeleton placeholders from `loading.js`

## Entry Points

**index.html (mobile-only):**
- DOM skeleton: bottom-nav, sections (home, discover, search results, favorites, profile, person), detail modal
- Loads global CSS, Firebase SDK, then `src/main.js` as module
- Inline scripts call into `window.LumiModules`

**src/main.js:**
- ES module orchestrator (imports + DOMContentLoaded init sequence)

**Vercel Functions (`api/*.js`):**
- Each file = one HTTP endpoint, deployed individually
- Triggered by frontend `fetch('/api/...')` calls

**Firebase:**
- `firebase.json` declares Firestore (`(default)` db, `eur3` region) + Auth providers (Email/Password, Google Sign-In, brand "Lumi")
- `.firebaserc` pins the active Firebase project
- `firestore.rules` enforces ownership: `users/{uid}/{watchlist|favorites|notifications}` private; `ratings` readable by all, writable only by author; `streamingCache` server-write-only; users collection blocks profanity in `displayName`
- `firestore.indexes.json` is empty scaffold — no composite indexes yet

## Error Handling

**Strategy:** Graceful degradation with fallback values; UI never blocks on a single failed fetch.

**Patterns:**
- Service methods catch fetch errors and return `{ results: [] }` or `null`
- Detail modal renders inline error message when chained calls fail (`'Detaylar yüklenemedi.'`)
- Missing posters → `https://via.placeholder.com/342x513?text=No+Poster`
- User-facing failures surfaced via `showToast('error', 'İşlem başarısız')`
- Streaming cache: RapidAPI 429 → fall back to TMDB watch providers
- Gemini proxy: billing-enabled, no model fallback (per recent commits) — returns 429 to client which surfaces toast

## Cross-Cutting Concerns

**Logging:** `console.log/warn/error` with `[Module]` prefixes (e.g., `[TMDB]`, `[Firestore]`). No centralized logger.

**Validation:** Search query min length (2 chars); genre IDs validated against `GENRES`; TMDB `media_type` filter on multi-search; Firestore rules enforce ownership and content filters.

**Authentication:** Firebase Auth modular SDK; `state.userTier` ∈ `{guest, free, premium}`; profile UI updates on auth state change; email verification or Google provider required for user document writes.

**Internationalization:** `state.currentLanguage` (default `'tr'`); API calls include `language=` param; `i18n.js` holds Turkish strings; `LANGUAGE_REGIONS` maps language → TMDB region.

**Personalization:** Client-side embeddings versioned via Firestore; `EmbeddingService` re-ranks search results; diversity injection in `src/ui/diversity-section.js`.

**Phase 03.2 (Polish & Platform Gaps):** Active phase addressing crew display, search relevance, streaming-cache cold-start, profile polish — see `.planning/phases/03.2-polish-platform-gaps/`.

---

*Architecture analysis: 2026-05-07*
