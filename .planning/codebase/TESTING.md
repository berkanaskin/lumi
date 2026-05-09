# Testing Patterns

**Analysis Date:** 2026-05-07

## Test Framework

**Runner:**
- **Vitest 4.0.17** — fast unit/integration test runner
- Config: `vitest.config.js` at project root
- Environment: **jsdom 27.4.0** (browser-like DOM in Node)
- Globals enabled (`describe`, `it`, `expect` available without import in some files; most files import explicitly)

**Assertion Library:**
- Built-in Vitest `expect` (Chai-style): `toBe`, `toEqual`, `toContain`, `toHaveProperty`, `toBeGreaterThanOrEqual`, `toBeNull`, `toHaveBeenCalledWith`, etc.

**Run Commands:**
```bash
npm run test              # Run all tests once (vitest run)
npm run test:watch        # Watch mode (vitest)
npm run test:ui           # Vitest UI dashboard (@vitest/ui)
npm run test:coverage     # Coverage report
```

**Coverage Setup:**
- Provider: **v8** (Node native)
- Reporters: text (console), json, html → `coverage/`
- Scope: `src/**/*.js` measured, `src/main.js` excluded
- **No threshold enforced** — coverage is informational only

## Test File Organization

**Location:**
- All tests in `tests/` at project root (NOT co-located with source)
- Global setup: `tests/setup.js` (loaded by Vitest before suites)

**Naming:** `{feature}.test.js`

**Current test files (13 suites):**
```
tests/
├── setup.js              # Global mocks (localStorage, fetch, document, window)
├── api.test.js           # TMDB / YouTube / Ratings service tests
├── constants.test.js     # Constants & config integrity
├── detail.test.js        # Detail page feature
├── discover.test.js      # Discover / mood wizard
├── helpers.test.js       # Utility functions (debounce, throttle, formatDate, etc.)
├── person.test.js        # Person/cast detail page
├── platforms.test.js     # Streaming platform mappings
├── profile.test.js       # Profile / auth feature
├── ratings.test.js       # External ratings (IMDb / RT) aggregation
├── search.test.js        # Search feature + autocomplete
├── streaming.test.js     # Streaming provider resolution
└── trivia.test.js        # Movie trivia / facts feature
```

## What Is Tested

**Well covered:**
- Pure utility helpers (`formatDate`, `formatRuntime`, `truncate`, `debounce`, `throttle`)
- TMDB service: fetch URL building, error fallback, `sortByRelevance`, search filtering
- Constants/config integrity (presence checks for `ERA_RANGES`, `POETIC_PLACEHOLDERS`, mood genre maps)
- Platform → provider ID mapping (Netflix, Disney+, etc.)
- Streaming resolution logic (region fallback, dedup)
- Search relevance / autocomplete flow with mocked fetch
- Discover wizard era/mood logic
- Ratings aggregation (multi-source merge)
- Person page data transforms
- Trivia formatting

**Not tested (gaps):**
- **Firebase Auth flows** — no integration test for sign-in/sign-out, password reset
- **Firestore reads/writes** — favorites, watchlist persistence untested
- **AI proxy (`api/gemini.js`)** — Vercel function not unit-tested
- **UI rendering / DOM mutation** — modules that touch `document` only smoke-tested via mock DOM
- **i18n** — translation file integrity untested
- **Service Worker / PWA install** — no test coverage
- **End-to-end flows** — no Playwright/Cypress

## Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { debounce, formatDate, truncate } from '../src/lib/helpers.js';

describe('helpers', () => {
    describe('formatDate', () => {
        it('should format date correctly for TR locale', () => {
            expect(formatDate('2024-05-15', 'tr-TR')).toContain('2024');
        });
        it('should return empty string for null date', () => {
            expect(formatDate(null)).toBe('');
        });
    });
});
```

**Conventions:**
- `describe('module')` outer, `describe('functionName')` inner
- `it('should ...')` reads as a behavior requirement
- One behavior per test; multiple `expect` allowed if they verify the same behavior
- Inline test data — no shared fixtures directory

## Mocking

**Framework:** Vitest's `vi` utilities (`vi.fn()`, `vi.mockResolvedValueOnce()`, `vi.clearAllMocks()`).

**Global mocks in `tests/setup.js`:**

```javascript
import { vi } from 'vitest';

const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => { localStorageMock.store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
    clear: vi.fn(() => { localStorageMock.store = {}; }),
};

global.localStorage = localStorageMock;
global.window = { ...global.window, localStorage: localStorageMock };
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => ({}) }));

beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
});
```

**Per-suite mocking pattern (`tests/api.test.js`):**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TMDBService } from '../src/services/api.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Services', () => {
    beforeEach(() => mockFetch.mockReset());

    it('should make API request with correct URL', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ results: [] }),
        });
        await TMDBService.fetch('/movie/popular');
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/movie/popular'),
            expect.any(Object)
        );
    });

    it('should return empty results on error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        const result = await TMDBService.fetch('/movie/popular');
        expect(result.results).toEqual([]);
    });
});
```

**What to mock:**
- External APIs (`fetch`, TMDB, Gemini, Firebase)
- Browser APIs (`localStorage`, `document`, `window`)
- Time-sensitive code (use `vi.useFakeTimers()` or real `setTimeout` waits for debounce/throttle)

**What NOT to mock:**
- Pure functions (helpers, formatters) — test directly
- Constants and config
- Internal collaborators inside the unit under test

## Fixtures and Factories

- **No factory functions or shared fixture files** currently
- Test data inlined per test, with only the fields needed:

```javascript
const results = [
    { title: 'The Matrix Reloaded', popularity: 100 },
    { title: 'Matrix', popularity: 50 },
    { title: 'The Matrix', popularity: 80 },
];
const sorted = TMDBService.sortByRelevance(results, 'The Matrix');
expect(sorted[0].title).toBe('The Matrix');
```

If a feature grows to need shared fixtures, place them in `tests/fixtures/{name}.js` and export plain objects.

## Common Patterns

**Async timing (debounce/throttle):**
```javascript
it('should debounce function calls', async () => {
    let counter = 0;
    const fn = debounce(() => counter++, 50);
    fn(); fn(); fn();
    expect(counter).toBe(0);
    await new Promise(r => setTimeout(r, 100));
    expect(counter).toBe(1);
});
```

**Error path coverage:**
```javascript
it('should return empty results on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await TMDBService.fetch('/movie/popular');
    expect(result.results).toEqual([]);
});
```

**Null / edge cases:**
```javascript
expect(formatDate(null)).toBe('');
expect(formatDate('')).toBe('');
expect(truncate(null, 10)).toBeNull();
```

**Existence assertions for constants:**
```javascript
expect(ERA_RANGES).toHaveProperty('classic');
expect(ERA_RANGES).toHaveProperty('80s');
expect(POETIC_PLACEHOLDERS.length).toBeGreaterThanOrEqual(5);
```

## Test Execution Flow

1. Vitest reads `vitest.config.js` (jsdom env, path aliases match Vite)
2. `tests/setup.js` runs once globally — installs `localStorage`, `fetch`, `document`, `window` mocks
3. `beforeEach` resets all mocks and clears localStorage store
4. Each `tests/*.test.js` file imports source under test from `../src/...`
5. Tests run in isolation; no shared state between files

## Guidelines

**Do:**
- Mock external boundaries (`fetch`, Firebase SDK, browser storage)
- Test behavior (inputs → outputs / observable side effects), not implementation details
- Cover both happy path and at least one error path per service method
- Keep one assertion focus per test
- Use descriptive `it('should ...')` names that read as requirements

**Don't:**
- Test private/internal helpers in isolation if they're already covered through the public API
- Build elaborate fixture hierarchies — inline data is preferred
- Leave shared mutable state across tests (always reset in `beforeEach`)
- Combine multiple unrelated behaviors in one test
- Add E2E-style tests in Vitest — wait until Playwright is set up

## Future Improvements

- Add **Playwright** for mobile-viewport E2E (auth flow, search → detail → favorite)
- Add Firebase Auth/Firestore integration tests using `@firebase/rules-unit-testing` emulator
- Unit-test Vercel API functions (`api/gemini.js`) by importing the handler and mocking `req`/`res`
- Set a coverage floor in `vitest.config.js` (`coverage.thresholds`) once gaps in CONCERNS.md are filled

---

*Testing analysis: 2026-05-07*
