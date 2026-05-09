# Codebase Structure

**Analysis Date:** 2026-05-07

## Directory Layout

```
lumi/
├── index.html                    # Mobile-only HTML entry point with inline scripts
├── index_lumi.css               # Main stylesheet (mobile-first, single file)
├── package.json                 # NPM dependencies and scripts
├── vite.config.js               # Vite build configuration
├── vitest.config.js             # Vitest unit-test configuration
├── eslint.config.js             # ESLint flat config
├── vercel.json                  # Vercel deployment + serverless function config
├── firebase.json                # Firestore + Auth provider config (eur3 region)
├── .firebaserc                  # Firebase project alias pin
├── firestore.rules              # Firestore security rules (auth + ownership)
├── firestore.indexes.json       # Firestore composite-index definitions (currently empty)
├── i18n.js                      # Turkish UI strings (hardcoded)
├── CLAUDE.md                    # Project guidance (Vercel best practices)
│
├── .github/
│   └── workflows/               # CI/CD GitHub Actions
│
├── .planning/
│   ├── codebase/                # GSD codebase analysis docs
│   └── phases/                  # GSD phase plans
│       └── 03.2-polish-platform-gaps/   # Active polish phase
│
├── src/                         # Source code (frontend application)
│   ├── main.js                  # App entry point + module orchestration
│   ├── config.js                # Environment configuration (Vite env vars)
│   │
│   ├── features/                # Domain feature modules
│   │   ├── discover.js          # AI search ("Ne İzlesem?"), wizard, daily rec
│   │   ├── search.js            # Autocomplete + search history
│   │   ├── detail.js            # Movie/TV detail modal (incl. crew section)
│   │   ├── profile.js           # Firebase auth, user tier, viewing stats
│   │   └── person.js            # Actor/director page with bio + filmography
│   │
│   ├── pages/                   # Full-screen page views (newer pattern)
│   │   └── search-results.js    # Infinite-scroll personalized search results
│   │
│   ├── services/                # External API integration layer
│   │   ├── api.js               # Aggregated API (TMDB, YouTube, OMDB, Ratings, GeoIP, Search, Embedding)
│   │   └── streaming-cache.js   # Firestore-backed streaming-availability cache (24h/48h TTL)
│   │
│   ├── ui/                      # UI rendering components
│   │   ├── movie-card.js        # Movie/TV card factory
│   │   ├── theme.js             # Theme toggle + persistence
│   │   ├── toast.js             # Toast notifications
│   │   ├── loading.js           # Loading states + skeletons
│   │   ├── autocomplete-dropdown.js  # Search autocomplete UI
│   │   └── diversity-section.js # Diversity-injected results block
│   │
│   └── lib/                     # Core utilities
│       ├── state.js             # Global state, elements cache, mutators
│       ├── navigation.js        # Page routing + bottom-nav state
│       ├── constants.js         # Genres, image URLs, AI placeholders
│       ├── helpers.js           # debounce, throttle, formatDate, escapeHtml
│       ├── platforms.js         # Streaming platform URLs and lookup
│       └── embeddings.js        # Client-side embedding version cache + metrics
│
├── api/                         # Vercel serverless functions (backend proxies)
│   ├── gemini.js                # Gemini AI proxy (billing-enabled, no fallback)
│   ├── tmdb.js                  # TMDB API proxy
│   ├── youtube.js               # YouTube Data API proxy
│   ├── omdb.js                  # OMDB ratings proxy
│   ├── streaming-availability.js  # RapidAPI streaming-availability proxy
│   ├── embeddings.js            # Embedding generation/lookup endpoint
│   ├── geoip.js                 # GeoIP region detection
│   ├── search.js                # Server-side search (personalization-aware)
│   └── cost-dashboard.js        # API cost tracking dashboard endpoint
│
├── services/                    # Top-level services (HTML inline-script accessible)
│   └── auth.js                  # Firebase auth bootstrap
│
├── public/                      # Static assets served as-is
├── assets/                      # Image and media assets
├── docs/                        # Documentation files
├── legal/                       # Privacy policy, terms of service
├── stitch/                      # Figma design exports (UI mockups)
└── tests/                       # Vitest unit tests
    ├── api.test.js
    ├── constants.test.js
    ├── detail.test.js
    ├── discover.test.js
    ├── helpers.test.js
    ├── platforms.test.js
    ├── profile.test.js
    ├── search.test.js
    └── setup.js                 # JSDOM test-environment setup
```

## Directory Purposes

**src/:** All frontend source. ES Module-based, bundled by Vite. Mobile-only (no responsive desktop split).

**src/features/:** Domain feature modules. Each exports multiple named functions; share global `state`. New module added: `person.js` (Phase 03.x crew/actor work).
- When adding: create `src/features/{name}.js`, import from `../services/api.js` + `../lib/state.js`, register init handler in `src/main.js`, re-export on `window.LumiModules` if HTML inline scripts need it.

**src/pages/:** Full-screen page views (richer than modal). Pages keep module-local state alongside global `state`.
- When adding: place under `src/pages/`, follow `search-results.js` pattern (module state + init export).

**src/services/:** External API abstraction. `api.js` is the aggregate; `streaming-cache.js` is a Firestore-backed cache layer.
- When adding: define service object in `api.js` and add to the `API` aggregate, OR create new file under `src/services/` for stateful adapters (caching, batching).

**src/ui/:** Reusable rendering components. Pure DOM factories or render-into-container functions.
- When adding: export factory `createX(options)` that returns DOM element OR `renderX(container, data)` that mutates DOM.

**src/lib/:** Cross-cutting utilities, constants, state. Pure functions except `state.js` (the only sanctioned mutation site).

**api/:** Vercel serverless functions. One file = one HTTP endpoint. Server-side secrets via `process.env`.
- When adding: create `api/{name}.js` exporting default async `(req, res) => {...}` handler. Tune `maxDuration`, region in `vercel.json` if I/O-heavy.

**services/ (top-level):** Bootstrap for Firebase auth — kept here so `index.html` inline scripts can import without going through Vite.

**tests/:** Vitest specs (one file per module). JSDOM environment via `tests/setup.js`.

**.planning/codebase/:** GSD-maintained codebase intelligence (this directory).

**.planning/phases/03.2-polish-platform-gaps/:** Active "Polish & Platform Gaps" phase — research + plan + tasks for cross-cutting polish (search relevance, streaming-cache cold start, profile polish, etc.).

## Key File Locations

**Entry Points:**
- `index.html` — DOM skeleton (sections, bottom nav, modals); loads Firebase SDK + `src/main.js` module
- `src/main.js` — ES module entry; imports all features and exposes `window.LumiModules`
- `vite.config.js` — bundler config (aliases `@`, `@services`, `@utils`)

**Configuration:**
- `src/config.js` — `CONFIG`, `FIREBASE_CONFIG`, `API_URLS`, `isDevelopment` (Vite `import.meta.env`)
- `package.json` — npm scripts: `dev`, `build`, `test`, `lint`, `preview`
- `vercel.json` — Vercel function regions, headers, rewrites
- `firebase.json` — Firestore database (`(default)`, `eur3`), Auth providers (Email/Password + Google with brand "Lumi")
- `.firebaserc` — pinned Firebase project alias
- `firestore.rules` — ownership rules: `users/{uid}/{favorites|watchlist|notifications}` private, `ratings` author-write, `streamingCache` server-write only, profanity blocklist on `displayName`
- `firestore.indexes.json` — empty scaffold (no composite indexes deployed yet)
- `i18n.js` — Turkish UI strings

**Core Logic:**
- `src/lib/state.js` — global state object, `elements` cache, `updateState`, `loadFavorites`, `APP_VERSION`
- `src/services/api.js` — TMDBService, YouTubeService, RatingsService, GeoIPService, SearchService, EmbeddingService, `API` aggregate
- `src/services/streaming-cache.js` — Firestore streaming-cache wrapper with TTL fallback to TMDB
- `src/lib/embeddings.js` — embedding version cache, retraining detection, client metrics
- `src/features/discover.js` — AI/wizard/daily recommendation
- `src/features/search.js` — autocomplete + search history
- `src/features/detail.js` — detail modal (now includes Director/Writer/Producer crew section)
- `src/features/profile.js` — Firebase Auth, user tier, settings
- `src/features/person.js` — actor/director page (bio, filmography, collaborators, awards)
- `src/pages/search-results.js` — infinite-scroll search results with personalization + diversity
- `src/lib/navigation.js` — page routing (Home, Discover, Search Results, Favorites, Profile, Person)

**UI Components:**
- `src/ui/movie-card.js`, `theme.js`, `toast.js`, `loading.js`, `autocomplete-dropdown.js`, `diversity-section.js`

**Backend Endpoints:** `api/gemini.js`, `tmdb.js`, `youtube.js`, `omdb.js`, `streaming-availability.js`, `embeddings.js`, `geoip.js`, `search.js`, `cost-dashboard.js`

**Auth:** `services/auth.js` (top-level Firebase bootstrap), `src/features/profile.js` (auth UI bridge)

**Styling:** `index_lumi.css` — single mobile-first stylesheet, class-based, no preprocessor

**Testing:** `vitest.config.js`, `tests/setup.js`, `tests/*.test.js`

## Naming Conventions

**Files:**
- camelCase / kebab-case for JS files: `movie-card.js`, `streaming-cache.js`, `search-results.js`
- CSS: `index_lumi.css` (single file, snake-mix preserved)
- Tests: `{module}.test.js`
- No file extensions in import statements

**Directories:**
- All lowercase: `src/`, `api/`, `tests/`, `public/`, `assets/`
- Multi-word: kebab-case (`.planning/codebase/`)

**JavaScript:**
- Variables/functions: camelCase (`handleSearch`, `currentPage`)
- Constants: UPPER_SNAKE_CASE (`GENRES`, `API_URLS`, `PAGES`, `APP_VERSION`, `TTL_MS`, `GROUP_MAP`)
- Service objects: PascalCase (`TMDBService`, `YouTubeService`, `EmbeddingService`)
- Event handlers: `handle{Action}` or `on{Event}` (`handleAutocomplete`, `onclick`)

**HTML/CSS:**
- IDs: kebab-case (`#detail-modal`, `#view-person`, `#search-input`)
- Classes: kebab-case semantic (`.movie-card`, `.bottom-nav`, `.active`)
- Data attributes: kebab-case (`data-id`, `data-type`)

**Modules:**
- Named exports only (no default exports in app code; serverless handlers use `export default`)
- Re-exports collected on `window.LumiModules` in `main.js` for inline-script callers

## Where to Add New Code

**New Feature (full-screen view or modal):**
- Code: `src/features/{name}.js` (modal/inline) or `src/pages/{name}.js` (full-screen)
- State: extend `state` object in `src/lib/state.js`
- Tests: `tests/{name}.test.js`
- Wire-up: import + init in `src/main.js`, expose on `window.LumiModules` if HTML inline scripts need it
- HTML: add `<section id="..."` block in `index.html`
- Routing: add entry to `PAGES` in `src/lib/navigation.js`

**New API Integration:**
- Client service method: extend an existing service in `src/services/api.js` or create a new service object and merge into `API`
- Server proxy: add `api/{name}.js` Vercel function exporting default handler; configure `maxDuration`/region in `vercel.json` if needed
- Secrets: store in Vercel Env Variables (never `NEXT_PUBLIC_*`, never commit)

**New Firestore Collection:**
- Add rules block to `firestore.rules` (auth-gate + ownership)
- Add composite index entries to `firestore.indexes.json` if queried with multi-field where/orderBy
- Deploy via `firebase deploy --only firestore:rules,firestore:indexes`
- Wrap reads/writes in a service under `src/services/` (mirror `streaming-cache.js`)

**New UI Component:**
- Implementation: `src/ui/{component}.js`
- Pattern: factory `createX(options)` returning DOM element, OR `renderX(container, data)` mutating DOM
- Style: append to `index_lumi.css` (mobile-first; no media-query desktop branches)

**Utilities:**
- Generic helpers → `src/lib/helpers.js`
- Shared constants → `src/lib/constants.js`
- Domain constants → keep beside the feature that owns them

**Tests:**
- Location: `tests/{module}.test.js`
- Pattern: Vitest + JSDOM; mock `fetch` and Firebase as needed; use `describe/it`

## Special Directories

**dist/:** Vite production build output. Generated via `npm run build`. Deployed by Vercel.

**node_modules/:** Dependencies. Generated; not committed.

**.planning/codebase/:** GSD-managed codebase docs (ARCHITECTURE, STRUCTURE, STACK, INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS).

**.planning/phases/:** GSD phase plans. Active: `03.2-polish-platform-gaps/` (research file + forthcoming plan/tasks for polish work — crew section already shipped per recent commits).

**stitch/:** Figma design exports. Reference only — not part of build.

**legal/:** Privacy policy and terms of service (linked from Profile section).

---

*Structure analysis: 2026-05-07*
