# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Modular SPA (Single Page Application) with feature-based organization and layered separation of concerns.

**Key Characteristics:**
- ES Module-based architecture (Vite + modern JavaScript)
- Centralized global state management with localStorage persistence
- Feature modules encapsulating related functionality (discover, search, detail, profile)
- Separation between UI components, business logic, and API services
- DOM-centric initialization with event-driven inter-module communication
- Backwards compatibility through global window exports for legacy HTML inline scripts

## Layers

**Configuration Layer:**
- Purpose: Environment-based configuration and secrets management
- Location: `src/config.js`
- Contains: API keys, endpoints, Firebase config, development flags
- Depends on: Vite environment variables (import.meta.env)
- Used by: All service layers and feature modules

**API Services Layer:**
- Purpose: Abstracts all external API calls (TMDB, YouTube, OMDB, Firebase)
- Location: `src/services/api.js`
- Contains: TMDBService, YouTubeService, RatingsService, API aggregate object
- Depends on: CONFIG, fetch API
- Used by: All feature modules (discover, detail, search, profile)
- Key pattern: Each service exports an object with methods for specific API operations

**State Management Layer:**
- Purpose: Centralized application state and DOM element caching
- Location: `src/lib/state.js`
- Contains: Global state object, elements cache, state helpers (updateState, loadFavorites, saveFavorites)
- Depends on: localStorage API
- Used by: All feature modules and components
- Key pattern: Exports state object and mutation helpers; also exposes to window.state for legacy scripts

**Navigation Layer:**
- Purpose: Page routing and navigation state management
- Location: `src/lib/navigation.js`
- Contains: PAGES definitions, navigateTo, goBack, bottom nav setup
- Depends on: state management
- Used by: Main app and feature modules
- Key pattern: Single-page navigation without hash routing; class-based section visibility

**Feature Modules Layer:**
- Purpose: Encapsulate domain-specific functionality
- Location: `src/features/`
- Contains: discover.js, detail.js, search.js, profile.js
- Depends on: API services, state, helpers
- Used by: Main entry point (main.js) and inline scripts in index.html
- Key pattern: Each module exports focused functions; modules communicate via shared state

**UI Components Layer:**
- Purpose: Reusable UI rendering components
- Location: `src/ui/`
- Contains: movie-card.js, theme.js, toast.js, loading.js
- Depends on: Helpers, constants
- Used by: Feature modules
- Key pattern: Factory functions that create DOM elements or render HTML strings

**Utilities Layer:**
- Purpose: Common helper functions with no dependencies
- Location: `src/lib/helpers.js`, `src/lib/constants.js`, `src/lib/platforms.js`
- Contains: debounce, throttle, formatDate, genre mappings, platform URLs
- Depends on: None (pure utilities)
- Used by: All layers (services, features, UI)

**Main Entry Point:**
- Purpose: Orchestrate initialization and expose modules globally
- Location: `src/main.js`
- Responsibilities: Import all modules, initialize DOM, attach global window exports for legacy compatibility
- Key pattern: DOMContentLoaded listener triggers initElements, loadTheme, loadAuth, initDiscoverModule

## Data Flow

**Initialization Flow:**

1. Vite loads `index.html` → includes `src/main.js` as module script
2. All module imports are resolved
3. DOMContentLoaded fires → initElements() called
4. loadTheme() restores user preference
5. initDiscoverModule() starts daily recommendation timer
6. loadAuth() checks Firebase auth state
7. window.LumiModules object populated with all module exports (for inline script access)

**Feature Action Flow (Example: Movie Search):**

1. User types in search input
2. handleAutocomplete() debounced → API.search() called
3. Results returned from TMDBService
4. showAutocomplete() renders results to dropdown
5. User clicks result → openDetail() called with movie ID
6. openDetail() calls API.getDetails(), API.getWatchProviders(), API.getCredits(), API.getTMDBVideos()
7. Results rendered to modal via elements.modalBody.innerHTML
8. Modal becomes visible via classList manipulation

**State Update Flow:**

1. Feature module calls updateState({ key: value })
2. updateState() uses Object.assign() to mutate shared state object
3. CustomEvent('stateChanged') dispatched for listeners
4. Components detect state changes and re-render

**Persistence Flow:**

1. User marks item as favorite/watchlist
2. toggleLike() or toggleWatchlist() called
3. state.favorites or state.watchlist updated
4. saveFavorites() writes to localStorage
5. On app reload, loadFavorites() restores from localStorage

**State Management:**
- Global state in `src/lib/state.js` as mutable object (no immutability)
- State mutations via updateState() helper
- Side effects (localStorage) in feature modules (toggleLike, toggleWatchlist)
- No central state container (no Redux/Vuex equivalent) — direct mutation pattern

## Key Abstractions

**API Aggregate Pattern:**
- Purpose: Single entry point for all API operations
- Examples: `src/services/api.js` exports `API` object with methods like search(), getDetails(), getWatchProviders()
- Pattern: TMDBService, YouTubeService, RatingsService composed into API object
- Benefit: Callers use `API.method()` instead of importing specific services

**Service Objects:**
- Purpose: Encapsulate related API methods
- Examples: TMDBService.fetch(), TMDBService.search(), TMDBService.sortByRelevance()
- Pattern: Plain objects with async methods; no class constructors
- Benefit: Clean organization; methods share internal helpers

**Feature Modules:**
- Purpose: Namespace and encapsulate related functions
- Examples: discover.js exports handleAISearch, handleWizardSearch, loadDailyRecommendation
- Pattern: Modules imported in main.js and re-exported globally via window.LumiModules
- Benefit: Prevents namespace pollution; allows inline HTML scripts to call window.LumiModules.function()

**Modal/Section Pattern:**
- Purpose: Display content without page navigation
- Examples: Detail modal (#detail-modal), search results grid (#results-grid)
- Pattern: Sections use `active` class for visibility; modals use `classList.add('active')`
- Benefit: Eliminates page reloads; enables cinematic transitions

**Lazy Loading Pattern:**
- Purpose: Defer image loading until near viewport
- Example: Movie card images use `loading="lazy"` attribute
- Pattern: HTML attribute on img elements
- Benefit: Reduces initial load time; improves performance on large lists

## Entry Points

**index.html:**
- Location: Root of project
- Triggers: Browser loads page
- Responsibilities: Defines DOM structure (sections, grids, modals, bottom nav), loads CSS, loads Firebase SDK, includes main.js module script
- Key inline scripts: loadHomePage(), navigation handlers, event listeners

**src/main.js:**
- Location: `src/main.js`
- Triggers: Included as module in index.html
- Responsibilities: Import all modules, initialize state, attach event listeners, export modules globally
- DOMContentLoaded: Initializes DOM element references, loads saved theme, sets up bottom nav listeners, starts daily recommendation timer, loads Firebase auth

**public/services/:**
- Location: `public/services/` (server-side proxy endpoints)
- Triggers: From feature modules when calling backend proxies
- Examples: `/api/gemini`, `/api/revenuecat`, `/api/rapidapi`

## Error Handling

**Strategy:** Graceful degradation with fallback values

**Patterns:**
- API methods return empty results on fetch error: `return { results: [] }`
- Modal displays error message: `'Detaylar yüklenemedi.'`
- Missing poster images use placeholder URL: `https://via.placeholder.com/342x513?text=No+Poster`
- Toast notifications inform user of failures: `showToast('error', 'İşlem başarısız')`
- Try-catch blocks in detail.js for chained API calls; inner errors logged but don't stop outer operations
- Features check for element existence before manipulation: `elements.modal?.classList.add()`

## Cross-Cutting Concerns

**Logging:**
- Console.log used throughout with `[Module]` prefix (e.g., `[TMDB] Fetch error:`)
- Development mode logs app initialization info in main.js
- No centralized logging service

**Validation:**
- Search query minimum length check (2 chars) in handleAutocomplete()
- Genre IDs validated against GENRES mapping in constants
- TMDB response filtering (media_type check for multi search)
- URL normalization in TMDBService.normalizeTitle()

**Authentication:**
- Firebase SDK initialization in index.html
- Firebase auth loaded in loadAuth() (profile.js)
- User tier tracked in state.userTier (guest/free/premium)
- Auth state updates UI via updateAuthUI() (profile.js)

**Internationalization:**
- Language codes tracked in state.currentLanguage (default: 'tr')
- API calls include language parameter: `language=${language}`
- i18n object accessed as window.i18n?.t() for fallback text
- Language → Region mapping in state.js: LANGUAGE_REGIONS

---

*Architecture analysis: 2026-03-18*
