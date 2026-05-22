# Stale Tests Triage Log

**Date:** 2026-05-22
**Trigger:** CI deploy blocked by 8 pre-Phase-4 failing tests.
**Outcome:** All 8 FIXED (0 skipped). Total: 396 passing, 22 todo, 2 skipped (pre-existing).

## Triage Results

All 8 stale tests were repaired via test-side changes only. **No source code was modified.**
Root causes were all in test harness (mocks/setup) or test contract drift.

### Fixed (8)

| # | Test | Root Cause | Fix |
|---|------|------------|-----|
| 1 | `api.test.js > TMDBService > fetch > should make API request with correct URL` | Phase-3 routes TMDB via `/api/tmdb` proxy; endpoint is now URL-encoded query param (`%2Fmovie%2Fpopular`), so `stringContaining('/movie/popular')` no longer matched. Also `mockFetch` not visible to src due to setup.js overriding `global.window`. | Added `globalThis.fetch = mockFetch` + `window.fetch = mockFetch` in test. Loosened assertion to regex matching either encoded or decoded path. |
| 2 | `api.test.js > TMDBService > fetch > should return empty results on error` | Same as #1: fetch was not hitting mockFetch; once wired, catch block returned `{results: []}` as expected. | Same global-fetch wiring fix as #1. |
| 3 | `detail.test.js > toggleLike > should add item to liked list` | `showToast()` calls `document.createElement(...).setAttribute(...)` and `document.body.appendChild(...)` + `toast.querySelector(...)`. `tests/setup.js` mock for `createElement` lacked `setAttribute`, `querySelector`, and `document.body` was missing entirely. | Extended `createElement` mock with `setAttribute`/`getAttribute`/`removeAttribute`/`querySelector`/`querySelectorAll`/`remove`/`focus`/`click` + `style.setProperty`. Added `document.body` mock. |
| 4 | `detail.test.js > toggleLike > should remove item from liked list if already liked` | Same as #3. | Same. |
| 5 | `detail.test.js > toggleWatchlist > should add item to watchlist` | Same as #3. | Same. |
| 6 | `detail.test.js > toggleWatchlist > should remove item from watchlist if already in list` | Same as #3. | Same. |
| 7 | `platforms.test.js > PLATFORM_URLS > should have Turkish platforms` | Test asserted `PLATFORM_URLS['BluTV']` was defined, but BluTV was intentionally removed in Phase-03.2 (consolidated → HBO Max after 2024 closure). Documented in `region-platforms.test.js` golden list. | Removed `BluTV` assertion + added clarifying comment. |
| 8 | `platforms.test.js > isTurkishPlatform > should identify Turkish platforms` | Same as #7 — `isTurkishPlatform('BluTV')` no longer returns true (intentional). | Same. |

### Skipped (0)

None.

## Files Modified

- `tests/setup.js` — extended `createElement` element mock, added `document.body`, added `window.location`
- `tests/api.test.js` — wired `globalThis.fetch` + `window.fetch`, loosened proxy-URL assertion
- `tests/platforms.test.js` — removed BluTV assertions (platform retired)

## Source Code Modified

None. Per constraint, no `src/` or `api/` changes.

## Bonus Discovery

The JSDOM `span.style.setProperty is not a function` warning in CI was harmless log noise from
`onboarding.js` running in tests with the mocked `createElement` (no `setProperty` on `style`).
Fixed transparently by adding `style.setProperty: vi.fn()` to the mock.
