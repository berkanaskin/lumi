# Coding Conventions

**Analysis Date:** 2026-05-07

## Project Context

Lumi is a **mobile-only** ES module web app (Vite + vanilla JS) with Firebase backend and Vercel-hosted AI proxy functions. No TypeScript, no framework. Code is organized into modular `src/` folders with legacy compatibility shims for older `window.*` usage.

## Naming Patterns

**Files:**
- Feature modules: camelCase (e.g., `src/features/search.js`, `src/features/discover.js`, `src/features/detail.js`, `src/features/person.js`, `src/features/trivia.js`)
- Library/utility modules: camelCase (`src/lib/helpers.js`, `src/lib/state.js`, `src/lib/constants.js`)
- Service modules: camelCase (`src/services/api.js`, `src/services/auth.js`, `src/services/ai.js`, `src/services/store.js`)
- Page modules: camelCase (`src/pages/`)
- View modules: camelCase (`src/views/`)
- API proxies: camelCase under `api/` (Vercel serverless functions)
- Test files: `{feature}.test.js` in `tests/` directory

**Functions:**
- camelCase, action-oriented for public exports: `handleAutocomplete()`, `toggleTheme()`, `renderDetail()`, `loadPersonPage()`
- Private helpers same convention; prefix with `_` only when also unused (allowed by ESLint)
- Async functions named for what they do, not the async-ness: `searchMovies()` not `searchMoviesAsync()`

**Variables:**
- camelCase for locals and state keys: `searchQuery`, `currentPage`, `currentUser`, `modalOpen`
- UPPER_SNAKE_CASE for module-level constants: `APP_VERSION`, `LANGUAGE_REGIONS`, `MOOD_GENRES`, `ERA_RANGES`, `POETIC_PLACEHOLDERS`
- Booleans: `is*` prefix or imperative (`isMobile()`, `isInWatchlist()`, `modalOpen`)

**Service / Singleton Objects:**
- PascalCase service objects exported as `const`: `TMDBService`, `YouTubeService`, `RatingsService`, `AuthService`, `AIService`, `StoreService`, `NotificationService`, `API`
- Configuration objects UPPER: `CONFIG`, `API_URLS`, `FIREBASE_CONFIG`
- Mutable singletons lowercase: `state`, `elements`, `i18n`

## Code Style

**Formatting (ESLint enforced):**
- Indentation: **4 spaces** (`indent: ['warn', 4, { SwitchCase: 1 }]`)
- Semicolons: **required** (`semi: ['error', 'always']`)
- Quotes: **single** preferred, double allowed to avoid escaping
- Equality: `eqeqeq: ['warn', 'smart']` — prefer `===`/`!==`, `==` allowed for null check
- Curly braces: required except for single-line statements (`curly: 'multi-line'`)
- `prefer-const` and `no-var` are warnings — use `const`/`let` only

**Linting:**
- Tool: ESLint 9.39.2 with `@eslint/js` recommended
- Config: `eslint.config.js` (flat config) at project root
- **Strict zone:** `src/**/*.js` — `no-unused-vars: 'error'`, `no-undef: 'error'`
- **Relaxed zone:** legacy roots (`app.js`, `api.js`, `config.js`, `i18n.js`, `services/**`) — most rules off
- **Ignored:** `dist/`, `node_modules/`, `stitch/`, `assets/`, `*.min.js`, `vite.config.js`, `vitest.config.js`, `eslint.config.js`, `tests/**`
- Unused params allowed via `^_` prefix (`argsIgnorePattern: '^_'`)
- Console output not restricted (`no-console: 'off'`)
- API folder (`api/**`) gets Node globals (`process` etc.)
- Lint command: `npm run lint` (max-warnings 200, slowly tightening)
- Auto-fix: `npm run lint:fix`

## Import Organization

**Order (observed convention):**
1. Node/standard library (`url`, `path`)
2. Third-party (`firebase/*`, `ai`, `@ai-sdk/google`, `vite`)
3. Internal modules via path alias (`@/`, `@lib/`, `@ui/`)
4. Relative imports for siblings (`./helpers.js`)
5. Vitest utilities (test files only)

**Path Aliases:**
- `@` → `src/`
- `@lib` → `src/lib/`
- `@ui` → `src/ui/`
- Defined in both `vite.config.js` and `vitest.config.js`

**Module pattern:**
- ES6 modules exclusively (`"type": "module"` in `package.json`)
- Named exports preferred for utilities and services
- File extensions **required** in import paths (`./helpers.js` not `./helpers`)
- No barrel files — always import from the specific module

```javascript
export const TMDBService = {
    async fetch(endpoint, options = {}) { },
    async search(query, type = 'multi', language = 'tr-TR') { },
    async discover(type = 'movie', options = {}) { },
};
```

## Error Handling

**Patterns:**
- Try/catch around async I/O (fetch, Firebase, localStorage)
- Errors logged with bracketed module context, then a graceful fallback returned
- No custom error classes — generic `Error` only
- Never re-throw from service layer; UI layer treats `null`/`[]` as "no data"

```javascript
try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    return await response.json();
} catch (error) {
    console.error('[TMDB] Fetch error:', error);
    return { results: [] };  // Graceful fallback
}
```

**Firebase / network errors:**
- Auth failures surfaced via `NotificationService` toast
- Firestore writes wrapped in try/catch, errors logged with `[Firestore]` prefix
- AI proxy (Gemini) has retry-on-rate-limit (5s wait) before fallback (see commit a12439f, d0a6d5b)

**localStorage:**
- All reads/writes wrapped in try/catch
- Failure logged: `console.error('[State] Failed to load favorites:', e)`
- App continues with empty defaults rather than crashing

## Logging

**Framework:** native `console` only (no winston/pino).

**Conventions:**
- `console.error('[Module] Description:', error)` — errors
- `console.warn('[Module] Description')` — warnings
- `console.log('Message:', value)` — debug/info, prefix optional
- Module tag in brackets is required for errors/warnings: `[TMDB]`, `[Auth]`, `[Gemini]`, `[Firestore]`, `[State]`, `[handleAutocomplete]`

```javascript
console.error('[TMDB] Fetch error:', error);
console.warn('[loadAuth] AuthService not available');
console.log('User loaded:', state.currentUser?.name);
```

**Production note:** No log shipping; rely on browser devtools and Vercel function logs.

## Comments & JSDoc

- Block JSDoc (`/** */`) **required for exported helpers/services** documenting purpose, `@param`, `@returns`
- Inline `//` comments for non-obvious logic only — avoid restating code
- Visual section headers used in long modules:

```javascript
// ============================================
// APP VERSION
// ============================================
```

```javascript
/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) { /* ... */ }
```

## Function Design

- No hard length limit; helpers stay 5–15 lines, feature handlers 20–60 lines
- Positional params for required args, **destructured options object** for the rest
- Defaults declared in the destructure, not via `||`
- Return data or `void`; use `null`/`[]`/`{}` as empty sentinels — never throw to UI

```javascript
async discover(type = 'movie', options = {}) {
    const {
        language = 'tr-TR',
        sortBy = 'popularity.desc',
        genres = [],
        year = null,
        minVoteCount = 100,
        page = 1,
    } = options;
    // ...
}
```

**Async patterns:**
- `async`/`await` exclusively (no raw `.then()` chains)
- `Promise.all([...])` for parallel independent fetches
- Optional chaining + nullish coalescing standard: `data.results?.length ?? 0`

## Module Design

**Exports:**
- Service objects: `export const ServiceName = { ... }`
- Utilities: `export function name() { ... }`
- Constants: `export const CONSTANT_NAME = ...`

**Legacy / Window Compatibility:**
Many `src/` modules attach exports to `window` so older non-module scripts still work:

```javascript
if (typeof window !== 'undefined') {
    window.debounce = debounce;
    window.formatDate = formatDate;
}
```

Seen in `src/lib/helpers.js`, `src/lib/state.js`, `src/ui/theme.js`, `src/services/api.js`. New code should still attach to `window` if the symbol exists in the ESLint legacy globals list (`API`, `state`, `i18n`, `AuthService`, etc.).

**Barrel files:** not used — always import the specific module.

## Mobile-Only Constraints

- No desktop-specific code paths; viewport assumes ≤ 768px
- Touch event handlers preferred over hover-only interactions
- Use `pointerdown`/`touchstart` for taps; never rely on `:hover` for critical UX
- Bottom sheet / modal patterns over multi-pane desktop layouts
- Test new UI in mobile viewport (Chrome DevTools device mode) before shipping

## Vercel / Serverless Conventions

- API routes live in `api/*.js` and run as **stateless** Vercel Functions
- Never persist to local FS or in-memory across requests
- Secrets read from `process.env.*` only — never `NEXT_PUBLIC_*`
- AI provider calls go through `api/gemini.js` proxy (server-side key)
- Use `waitUntil` for fire-and-forget post-response work

## Code Examples by Pattern

**Service method:**
```javascript
// src/services/api.js
async search(query, type = 'multi', language = 'tr-TR') {
    const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
    const data = await this.fetch(
        `${endpoint}?language=${language}&query=${encodeURIComponent(query)}`
    );
    if (type === 'multi' && data.results) {
        data.results = data.results.filter(
            item => item.media_type === 'movie' || item.media_type === 'tv'
        );
    }
    return data;
}
```

**Feature module handler:**
```javascript
// src/features/search.js
export async function handleAutocomplete() {
    const query = elements.searchInput?.value?.trim();
    if (!query || query.length < 2) {
        hideAutocomplete();
        return;
    }
    state.autocompleteTimeout = setTimeout(async () => {
        try {
            const data = await API.search(query);
            if (data.results?.length > 0) {
                showAutocomplete(data.results.slice(0, 6));
            }
        } catch (error) {
            console.error('[handleAutocomplete] Error:', error);
        }
    }, 300);
}
```

---

*Convention analysis: 2026-05-07*
