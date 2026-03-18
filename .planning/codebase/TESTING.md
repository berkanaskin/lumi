# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Runner:**
- Vitest 4.0.17 - Fast unit test framework
- Configuration: `vitest.config.js` at project root
- Test environment: jsdom (browser-like environment)
- Global test utilities enabled

**Assertion Library:**
- Vitest built-in expect API (no additional assertion library)
- Chai-style assertions: `expect(value).toBe()`, `expect(value).toEqual()`, etc.

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode - re-run on file changes
npm run test:ui          # Vitest UI dashboard
npm run test:coverage    # Run tests and generate coverage report
```

**Coverage Setup:**
- Provider: v8 (Node's native coverage)
- Reporters: text (console), json, html (in coverage/ directory)
- Only `src/**/*.js` measured (excludes `src/main.js` entry point)
- Target: Not enforced, coverage reports available for inspection

## Test File Organization

**Location:**
- Tests co-located in `tests/` directory at project root
- NOT co-located with source files (separate from `src/`)
- Separate setup file: `tests/setup.js`

**Naming:**
- Pattern: `{feature-name}.test.js`
- Examples: `helpers.test.js`, `api.test.js`, `search.test.js`, `discover.test.js`

**Current test files:**
```
tests/
├── setup.js              # Global mocks and setup
├── api.test.js           # API services (TMDB, YouTube, Ratings)
├── constants.test.js     # Constants
├── detail.test.js        # Detail page feature
├── discover.test.js      # Discover/wizard feature
├── helpers.test.js       # Helper utilities
├── platforms.test.js     # Platform mappings
├── profile.test.js       # Profile/auth feature
└── search.test.js        # Search feature
```

## Test Structure

**Suite Organization:**
From `tests/helpers.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { debounce, formatDate, truncate } from '../src/lib/helpers.js';

describe('helpers', () => {
    describe('formatDate', () => {
        it('should format date correctly for TR locale', () => {
            const result = formatDate('2024-05-15', 'tr-TR');
            expect(result).toContain('2024');
        });

        it('should return empty string for null date', () => {
            expect(formatDate(null)).toBe('');
        });
    });

    describe('formatRuntime', () => {
        it('should format runtime in Turkish', () => {
            expect(formatRuntime(90, 'tr')).toBe('1 sa 30 dk');
        });
    });
});
```

**Patterns:**
- `describe(name, callback)` - Test suite grouping
- `it(description, callback)` or `test(description, callback)` - Individual test case
- Nested `describe()` blocks for logical grouping (by function/feature)
- Test names read as sentences: "should format date correctly"
- One assertion focus per test (or related assertions for one behavior)

## Mocking

**Framework:** Vitest's `vi` mock utilities

**Global Mocks (tests/setup.js):**
- `localStorage`: Complete mock with store object
- `window`: Extended with custom Event support
- `document`: Mock DOM API (getElementById, querySelector, createElement, etc.)
- `fetch`: Global mock returning `{ ok: true, json: () => {} }`

**Setup file pattern:**
From `tests/setup.js`:
```javascript
import { vi } from 'vitest';

const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
        localStorageMock.store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
        localStorageMock.store = {};
    }),
};

global.localStorage = localStorageMock;
global.window = { ...global.window, localStorage: localStorageMock };

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
});
```

**Test-level mocking:**
From `tests/api.test.js`:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TMDBService } from '../src/services/api.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Services', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('fetch', () => {
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
});
```

**What to Mock:**
- External APIs (fetch calls)
- Browser APIs (localStorage, document, window)
- Time-dependent code (setTimeout, setInterval - not directly shown but testable)
- Service dependencies (in feature tests)

**What NOT to Mock:**
- Pure utility functions (helpers, formatters)
- Internal module functions
- Constants and configuration
- State management for unit tests (test the state module itself)

## Fixtures and Factories

**Test Data:**
From `tests/api.test.js`:
```javascript
describe('sortByRelevance', () => {
    it('should prioritize exact title matches', () => {
        const results = [
            { title: 'The Matrix Reloaded', popularity: 100 },
            { title: 'Matrix', popularity: 50 },
            { title: 'The Matrix', popularity: 80 },
        ];

        const sorted = TMDBService.sortByRelevance(results, 'The Matrix');
        expect(sorted[0].title).toBe('The Matrix');
    });
});
```

**Location:**
- Inline test data within test cases (no separate fixtures file)
- Simple objects created directly: `{ title: 'X', popularity: 100 }`
- No factory functions currently used
- Data is minimal and specific to test needs

**Pattern:** Create objects with only required properties for each test

## Coverage

**Requirements:** None enforced
- Coverage report generated but not gated
- Executable: `npm run test:coverage`
- Reports saved to `coverage/` directory (HTML and JSON formats)

**View Coverage:**
```bash
npm run test:coverage    # Generate coverage report
# Then open coverage/index.html in browser
```

## Test Types

**Unit Tests:**
- Scope: Individual functions/methods
- Approach: Test pure functions with various inputs
- Examples: `formatDate()`, `debounce()`, `normalizeTitle()`
- Majority of current tests are unit tests
- Located in `tests/helpers.test.js`, `tests/constants.test.js`, `tests/platforms.test.js`

**Integration Tests:**
- Scope: Multiple components working together
- Approach: Mock external APIs, test feature workflows
- Examples: API service tests with mocked fetch, search feature with mocked API responses
- Located in `tests/api.test.js`, `tests/search.test.js`, `tests/discover.test.js`

**E2E Tests:**
- Status: Not used
- Would require: Playwright or Cypress
- Not currently configured

## Common Patterns

**Async Testing:**
From `tests/helpers.test.js`:
```javascript
it('should debounce function calls', async () => {
    let counter = 0;
    const fn = debounce(() => counter++, 50);

    fn();
    fn();
    fn();

    expect(counter).toBe(0);  // Not called yet

    await new Promise(r => setTimeout(r, 100));  // Wait for debounce
    expect(counter).toBe(1);   // Now called once
});

it('should throttle function calls', async () => {
    let counter = 0;
    const fn = throttle(() => counter++, 50);

    fn();
    fn();
    fn();

    expect(counter).toBe(1);   // Called immediately

    await new Promise(r => setTimeout(r, 100));
    fn();
    expect(counter).toBe(2);   // Called again after throttle period
});
```

**Async API Testing:**
From `tests/api.test.js`:
```javascript
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
```

**Error Testing:**
From `tests/api.test.js`:
```javascript
it('should return empty results on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await TMDBService.fetch('/movie/popular');
    expect(result.results).toEqual([]);
});
```

**Null/Edge Cases:**
From `tests/helpers.test.js`:
```javascript
it('should return empty string for null date', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
});

it('should handle null', () => {
    expect(truncate(null, 10)).toBeNull();
});
```

**Array/Object Assertions:**
From `tests/discover.test.js`:
```javascript
it('should have known eras', () => {
    expect(ERA_RANGES).toHaveProperty('classic');
    expect(ERA_RANGES).toHaveProperty('80s');
});

it('should have at least 5 placeholders', () => {
    expect(POETIC_PLACEHOLDERS.length).toBeGreaterThanOrEqual(5);
});
```

## Test Execution Flow

1. Vitest loads `vitest.config.js`
2. Vitest loads `tests/setup.js` globally (all mocks initialized)
3. Test files imported: `tests/**/*.{test,spec}.{js,ts}`
4. Each test file uses mocks from setup
5. `beforeEach()` hooks reset mocks for each test
6. Tests run in isolation with clean mock state

## Important Testing Guidelines

**Do:**
- Use descriptive test names that read as requirements
- Mock external dependencies (fetch, APIs, localStorage)
- Test both happy path and error cases
- Keep tests focused on one behavior
- Reset mocks between tests (handled by beforeEach in setup.js)

**Don't:**
- Test implementation details (test behavior, not how it works)
- Create complex test fixtures (use inline data)
- Mock things that should be tested (internal functions)
- Leave tests interdependent (each test should be independent)
- Test multiple behaviors in one test

---

*Testing analysis: 2026-03-18*
