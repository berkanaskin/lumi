# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
lumi/
├── index.html                    # Root HTML entry point with inline scripts
├── index_lumi.css               # Main stylesheet (86KB, v0.9.5)
├── package.json                 # NPM dependencies and scripts
├── vite.config.js               # Vite build configuration
├── vitest.config.js             # Vitest configuration
├── eslint.config.js             # ESLint rules
├── vercel.json                  # Vercel deployment config
├── i18n.js                      # Internationalization strings (33KB)
│
├── .github/
│   └── workflows/               # CI/CD GitHub Actions
│
├── .planning/
│   └── codebase/                # GSD codebase analysis documents
│
├── src/                         # Source code (main application)
│   ├── main.js                  # App entry point and module orchestration
│   ├── config.js                # Environment configuration
│   │
│   ├── features/                # Feature modules (domain logic)
│   │   ├── discover.js          # "Ne İzlesem?" (AI search, wizard, daily rec)
│   │   ├── search.js            # Search and autocomplete handling
│   │   ├── detail.js            # Movie/TV detail modal and actions
│   │   └── profile.js           # Auth and user profile management
│   │
│   ├── services/                # External API integration layer
│   │   └── api.js               # Aggregated API services (TMDB, YouTube, OMDB, Ratings)
│   │
│   ├── ui/                      # UI rendering components
│   │   ├── movie-card.js        # Movie/TV card factory and renderer
│   │   ├── theme.js             # Theme toggle and persistence
│   │   ├── toast.js             # Toast notification component
│   │   └── loading.js           # Loading states and visual indicators
│   │
│   ├── lib/                     # Core library utilities
│   │   ├── state.js             # Global state and DOM element cache
│   │   ├── navigation.js        # Page routing and nav state
│   │   ├── constants.js         # Genres, image URLs, placeholders
│   │   ├── helpers.js           # Utility functions (debounce, formatDate, etc.)
│   │   └── platforms.js         # Streaming platform URLs and lookup
│   │
│   ├── utils/                   # Additional utilities (may be deprecated/empty)
│   └── views/                   # View definitions (may be deprecated/empty)
│
├── api/                         # Backend proxy endpoints (server-side logic)
│   ├── gemini.js                # Gemini AI API proxy
│   ├── tmdb.js                  # TMDB API proxy
│   └── youtube.js               # YouTube API proxy
│
├── services/                    # Legacy service definitions
│   └── auth.js                  # Firebase auth service (8.8KB)
│
├── public/                      # Static assets served as-is
│   └── services/                # Public endpoints (rate limiting, CORS handling)
│
├── assets/                      # Image and media assets
├── docs/                        # Documentation files
├── legal/                       # Legal documents (privacy, terms)
├── stitch/                      # Figma design exports (UI mockups)
└── tests/                       # Test files
    ├── api.test.js              # API service tests
    ├── constants.test.js        # Constants validation tests
    ├── detail.test.js           # Detail modal tests
    ├── discover.test.js         # Discover feature tests
    ├── helpers.test.js          # Utility function tests
    ├── platforms.test.js        # Platform URL tests
    ├── profile.test.js          # Auth/profile tests
    ├── search.test.js           # Search and autocomplete tests
    └── setup.js                 # Test environment setup (JSDOM)

dist/                           # Build output (generated, committed)
node_modules/                   # Dependencies (not committed)
```

## Directory Purposes

**src/:**
- Purpose: All source code for the application
- Contains: Feature modules, services, UI components, utilities
- Key pattern: Everything is ES Module-based; relies on Vite for bundling and module resolution

**src/features/:**
- Purpose: Domain-specific feature implementations
- Contains: discover.js (AI search, wizard, daily recommendations), search.js (autocomplete, history), detail.js (modal, favorites, videos), profile.js (auth, user management)
- Key pattern: Each feature exports multiple functions; modules share state via import from state.js
- When adding: Create new file for feature, import dependencies (API, state, helpers), export public functions, re-export in main.js

**src/services/:**
- Purpose: External API abstraction layer
- Contains: Unified API object combining TMDBService, YouTubeService, RatingsService
- Key pattern: Service objects export methods; errors handled gracefully with fallback values
- When adding: Define new service in api.js, add fetch wrapper, export via API aggregate object

**src/ui/:**
- Purpose: Reusable rendering components and theme/state UI
- Contains: movie-card (grid item factory), theme (toggle + localStorage), toast (notifications), loading (spinners and empty states)
- Key pattern: Functions return DOM elements or render directly to existing containers
- When adding: Export factory function that creates/returns DOM element or mutates DOM, handle options object for configuration

**src/lib/:**
- Purpose: Core utilities, constants, and cross-cutting concerns
- Contains: state (centralized mutable state object), navigation (page routing), constants (genres, URLs), helpers (debounce, format functions), platforms (streaming URLs)
- Key pattern: Pure functions and immutable exports; no side effects except in state.js
- When adding: Place utility functions in helpers.js, shared constants in constants.js, or new focused file

**api/:**
- Purpose: Vercel serverless backend proxy endpoints
- Contains: Handlers for Gemini, TMDB, YouTube calls (server-side API keys)
- Used by: Feature modules call `/api/{service}` endpoints instead of client-side keys
- When adding: Create new route file with request handler, configure in vercel.json

**services/:**
- Purpose: Legacy service layer (mostly replaced by src/services/)
- Contains: auth.js for Firebase initialization
- Status: Deprecated in favor of modular approach; still loaded for backwards compatibility

**tests/:**
- Purpose: Vitest unit tests organized by module
- Contains: One test file per major module (api.test.js, detail.test.js, etc.)
- Key pattern: Each file tests one feature/service; setup.js configures JSDOM environment

**stitch/:**
- Purpose: Figma design exports and UI mockups
- Status: Design reference only; not part of build

## Key File Locations

**Entry Points:**
- `index.html`: Root HTML document with DOM structure, inline event handlers, inline script tags
- `src/main.js`: ES Module entry point; imports all modules, initializes app on DOMContentLoaded
- `vite.config.js`: Vite build configuration; defines alias paths (@, @services, @utils), output dir, dev server

**Configuration:**
- `src/config.js`: API keys, endpoints, Firebase config loaded from import.meta.env
- `package.json`: Dependencies (Firebase, Vite, Vitest, ESLint), scripts (dev, build, test, lint)
- `i18n.js`: Turkish language strings (hardcoded, 33KB)
- `vercel.json`: Deployment configuration for Vercel platform

**Core Logic:**
- `src/lib/state.js`: Global state object, element cache, state mutation helpers
- `src/services/api.js`: All external API calls (1900+ lines); TMDBService, YouTubeService, RatingsService
- `src/features/discover.js`: AI recommendations, daily surprise, mood/era wizard
- `src/features/search.js`: Text search, autocomplete, search history
- `src/features/detail.js`: Movie/TV detail modal, favorites, ratings, watch providers
- `src/features/profile.js`: Firebase auth, user tier, viewing stats, ratings
- `src/lib/navigation.js`: Page routing (home, discover, favorites, profile)

**UI Components:**
- `src/ui/movie-card.js`: Factory for movie/TV card elements; used in grids and sliders
- `src/ui/theme.js`: Dark/light mode toggle; persists to localStorage
- `src/ui/toast.js`: Toast notification overlay; auto-dismisses after 3 seconds
- `src/ui/loading.js`: Loading spinner states, no-results message, arrow visibility

**Utilities:**
- `src/lib/helpers.js`: debounce(), throttle(), formatDate(), formatRuntime(), truncate(), escapeHtml(), getYear(), isMobile()
- `src/lib/constants.js`: Genre IDs and names, image URL builder, AI placeholders, daily rec categories
- `src/lib/platforms.js`: Streaming platform URLs (Netflix, Prime, Disney+, etc.), platform-specific logic

**Styling:**
- `index_lumi.css`: All CSS (86KB); includes global styles, components, responsive design
- No CSS-in-JS; no preprocessors (no Sass/LESS)

**Testing:**
- `vitest.config.js`: Vitest configuration; test environment (jsdom), coverage settings
- `tests/setup.js`: JSDOM environment setup; mock globals
- `tests/*.test.js`: Unit tests for each module

## Naming Conventions

**Files:**
- camelCase for JS files: `movieCard.js`, `apiService.js`
- CSS file: snake_case or index name: `index_lumi.css`
- Test files: `{module}.test.js` (e.g., `api.test.js`)
- No file extensions in imports (ES Module)

**Directories:**
- kebab-case for multi-word directories: `src/services/`, `src/features/`, `src/lib/`
- Single-word lowercase: `src/ui/`, `src/utils/`, `src/views/`

**JavaScript:**
- Variables/functions: camelCase: `currentPage`, `handleSearch()`, `debounce()`
- Constants: UPPER_CASE: `GENRES`, `API_URLS`, `PAGES`
- DOM elements: camelCase with 'Element'/'Elements' suffix: `modalElement`, `navItems`
- Event handlers: `on{EventName}` or `handle{Action}`: `onclick`, `handleSearch`, `handleAutocomplete`

**HTML/CSS:**
- HTML IDs: kebab-case: `#search-input`, `#detail-modal`, `#home-section`
- CSS classes: kebab-case with semantic naming: `.movie-card`, `.active`, `.loading-state`, `.bottom-nav`
- Data attributes: kebab-case: `data-id`, `data-type`, `data-title`

**Modules:**
- Export named functions: `export function handleSearch() {}`
- Export objects: `export const API = { search() {}, getDetails() {} }`
- Default exports: None in this codebase (all named exports)

## Where to Add New Code

**New Feature:**
- Primary code: `src/features/{featureName}.js`
- State: Add properties to `state` object in `src/lib/state.js`
- Tests: `tests/{featureName}.test.js`
- Export in: `src/main.js` (add to window.LumiModules)
- HTML: Add section/elements to `index.html`

**New API Integration:**
- Service method: Add method to appropriate service (TMDBService, YouTubeService) in `src/services/api.js`, or create new service
- Expose via: API aggregate object (e.g., `API.newMethod()`)
- Backend proxy: Create file in `api/{service}.js` if server-side key required
- Call from: Feature modules via `API.method()`

**New Component/Module:**
- Implementation: `src/ui/{componentName}.js` if reusable UI, or `src/lib/{moduleName}.js` if utility
- Export: Named export of function or object
- Use: Import in feature module, call as needed

**Utilities:**
- Shared helpers: `src/lib/helpers.js`
- Shared constants: `src/lib/constants.js`
- Domain-specific constants: In relevant feature file (e.g., MOOD_GENRES in discover.js)

**Styling:**
- Add to: `index_lumi.css` (single stylesheet)
- Pattern: Class-based; use descriptive names (`.{feature}-{element}`)
- Mobile-first: Use media queries for larger breakpoints

**Tests:**
- Location: `tests/{module}.test.js` (co-located naming pattern)
- Pattern: Vitest with JSDOM; use describe/it blocks, mock API calls

## Special Directories

**dist/:**
- Purpose: Production build output
- Generated: Yes (via `npm run build`)
- Committed: Yes (optimized for Vercel)
- Contains: Bundled JS, CSS, static assets

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (via `npm install`)
- Committed: No (.gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by agent)
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**stitch/:**
- Purpose: Figma UI design exports
- Generated: Yes (from Figma)
- Committed: Yes
- Contains: Design files and mockups; reference only

---

*Structure analysis: 2026-03-18*
