# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- Feature modules: camelCase (e.g., `search.js`, `discover.js`, `detail.js`)
- Library/utility modules: camelCase (e.g., `helpers.js`, `state.js`, `constants.js`)
- Test files: descriptive name + `.test.js` suffix (e.g., `helpers.test.js`, `api.test.js`)
- UI components: kebab-case with descriptive names (e.g., `movie-card.js`, `loading.js`)

**Functions:**
- camelCase for all function declarations
- Public exports are descriptive and action-oriented: `handleAutocomplete()`, `toggleTheme()`, `renderDetail()`
- Internal/helper functions use same convention
- Example: `debounce()`, `throttle()`, `formatDate()`, `isMobile()`

**Variables:**
- camelCase for constants and variables
- UPPERCASE_SNAKE_CASE for module-level constants (e.g., `APP_VERSION`, `LANGUAGE_REGIONS`, `MOOD_GENRES`)
- Boolean variables prefixed with `is` or use imperative verb (e.g., `isMobile()`, `isInWatchlist()`, `modalOpen`)
- State objects use camelCase (e.g., `searchQuery`, `currentPage`, `currentUser`)

**Types & Objects:**
- Service objects capitalized: `TMDBService`, `YouTubeService`, `RatingsService`, `API`
- State objects lowercase: `state`, `elements`
- Configuration constants: `CONFIG`, `API_URLS`, `FIREBASE_CONFIG`

## Code Style

**Formatting:**
- ESLint enforced (see `eslint.config.js`)
- Indentation: 4 spaces (configured in ESLint: `'indent': ['warn', 4, { SwitchCase: 1 }]`)
- Line length: No hard limit enforced, but wrapped as needed
- Semicolons: Always required (`'semi': ['error', 'always']`)
- Quotes: Single quotes preferred, double quotes allowed to avoid escaping (`'quotes': ['warn', 'single', { avoidEscape: true }]`)

**Linting:**
- Tool: ESLint 9.39.2 with @eslint/js recommended config
- Configuration: `eslint.config.js` at project root
- No-unused-vars: `warn` for legacy code, `error` for new modular code in `src/`
- No-undef: `warn` for legacy code, `error` for strict `src/` files
- Console: Not restricted (`'no-console': 'off'`)
- Unused params: Pattern `^_` prefix allows unused parameters (e.g., `function(_unused) {}`)

**Run commands:**
```bash
npm run lint              # Run ESLint check
npm run lint:fix         # Auto-fix ESLint issues
```

## Import Organization

**Order:**
1. Standard library imports (`import { fileURLToPath } from 'url'`)
2. Third-party packages (`import { defineConfig } from 'vite'`)
3. Local modules (`import { CONFIG } from '../config.js'`)
4. Test utilities (`import { describe, it, expect, vi } from 'vitest'`)

**Path Aliases:**
- `@` → `src/` (e.g., `import from '@/main.js'`)
- `@lib` → `src/lib/` (e.g., `import { state } from '@lib/state.js'`)
- `@ui` → `src/ui/` (e.g., `import { loadTheme } from '@ui/theme.js'`)
- Configured in both `vite.config.js` and `vitest.config.js`

**Module pattern:**
- ES6 modules exclusively (`type: "module"` in `package.json`)
- Named exports preferred for public APIs
- Default exports only for service objects or standalone modules
- Example service export pattern:
```javascript
export const TMDBService = {
    async fetch(endpoint, options = {}) { },
    async search(query, type = 'multi', language = 'tr-TR') { }
};
```

## Error Handling

**Patterns:**
- Try-catch blocks used for async operations and risky operations
- Error caught and logged with context prefix: `console.error('[module] Error:', error)`
- Fallback values returned on error (not re-thrown)
- Example from `src/services/api.js`:
```javascript
try {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
    }
    return await response.json();
} catch (error) {
    console.error('[TMDB] Fetch error:', error);
    return { results: [] };  // Graceful fallback
}
```

**State persistence errors:**
- localStorage operations wrapped in try-catch
- Errors logged with module context: `console.error('[State] Failed to load favorites:', e)`
- Application continues with empty state rather than crashing

**No explicit error classes:**
- Generic Error objects used
- Errors described in console messages rather than custom error types

## Logging

**Framework:** `console` object (no logging library)

**Patterns:**
- `console.error('[ModuleName] Description:', error)` for errors
- `console.warn('[ModuleName] Description')` for warnings
- `console.log('Message:', value)` for debug/info (no prefix required)
- Module context always included in brackets: `[TMDB]`, `[handleAutocomplete]`, `[State]`
- Error messages are descriptive: "TMDB API error: 404", "Failed to load favorites"

**Examples:**
```javascript
console.error('[TMDB] Fetch error:', error);
console.warn('[loadAuth] AuthService not available');
console.log('User loaded:', state.currentUser?.name);
```

## Comments

**When to Comment:**
- Block-level comments for major sections (functions, logical groupings)
- Inline comments for non-obvious logic
- No comments for self-documenting code

**JSDoc/TSDoc:**
- Block comments at function level with `/**` format
- Documents purpose, parameters, and return type
- Required for all exported functions
- Optional for internal functions
- Example:
```javascript
/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    // Implementation
}
```

**Section headers:**
- Major sections separated by visual headers:
```javascript
// ============================================
// APP VERSION
// ============================================
```

## Function Design

**Size:** No explicit limit, but functions average 20-50 lines
- Large functions like `sortByRelevance()` (60+ lines) acceptable when warranted by complexity
- Helper functions kept minimal (5-15 lines)

**Parameters:**
- Positional parameters for required arguments
- Object parameters for optional/multiple configs
- Default parameters used extensively: `language = 'tr-TR'`, `page = 1`
- Destructuring for option objects:
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
}
```

**Return Values:**
- Functions either return data or void
- Promise-returning async functions always awaited by caller
- Null returned for "no data" cases
- Empty arrays/objects returned as fallback on error

## Module Design

**Exports:**
- Service objects exported as `export const ServiceName = { ... }`
- Utility functions exported as `export function functionName() { ... }`
- Constants exported as `export const CONSTANT_NAME = ...`

**Barrel Files:**
- Not used; imports always from specific module files

**Legacy Compatibility:**
- Many modules expose functions to `window` global for backward compatibility
- Example from `src/lib/helpers.js`:
```javascript
if (typeof window !== 'undefined') {
    window.debounce = debounce;
    window.formatDate = formatDate;
}
```
- Same pattern in `src/lib/state.js`, `src/ui/theme.js`, `src/services/api.js`
- This enables both modern (`import { debounce }`) and legacy (`window.debounce()`) usage

**Async patterns:**
- Async functions return Promises
- Destructuring with optional chaining common: `data.results?.length > 0`
- Promise.all() used for parallel requests: `await Promise.all([fetch1, fetch2])`

## Code Examples by Pattern

**Service method structure:**
Located in `src/services/api.js`:
```javascript
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

**Feature module structure:**
Located in `src/features/search.js`:
```javascript
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

*Convention analysis: 2026-03-18*
