# Codebase Concerns

**Analysis Date:** 2026-05-07
**Project:** Lumi (mobile-only)

## Tech Debt

**Inline event handlers in generated HTML:**
- Issue: Multiple components use `onclick` attributes directly in innerHTML templates instead of proper event listeners
- Files:
  - `src/features/detail.js` (lines 128, 239, 258, 795)
  - `src/ui/movie-card.js` (line 87)
  - `src/features/discover.js` (multiple instances)
- Impact: Difficult to test, maintain, refactor; potential XSS vector if escaping fails
- Fix approach: Replace inline handlers with addEventListener after DOM insertion

**Unhandled promise rejections / silent failures:**
- Issue: Async functions lack comprehensive error handling
- Files:
  - `src/features/detail.js` (`openDetail()` lines 24-127)
  - `src/features/discover.js`: `handleAISearch()`, `handleWizardSearch()` lack error boundaries
  - `src/services/api.js`: returns `{ results: [] }` silently on fetch errors
- Impact: Users get no feedback when APIs fail; state becomes inconsistent
- Fix approach: Wrap promise chains in try-catch; emit error events; show toast on failure

**Missing removeEventListener cleanup:**
- Issue: Event listeners added without removal — memory leaks on long sessions
- Files:
  - `src/features/detail.js`: modal lifecycle keyboard/scroll handlers
  - `src/features/search.js`: autocomplete handlers (~line 93-114)
  - `src/features/profile.js`: user menu handlers added in `updateAuthUI()` (~line 99) without dedup
- Fix approach: Store listener refs; clean up in close/cleanup; use AbortController

**Global state mutations without ownership:**
- Files: `src/lib/state.js` (64-element state, no guards); `src/features/detail.js` (lines 41-42, 165, 208-214)
- Fix approach: Single `updateState()` mutation point; dev-mode mutation logging

**Dead code / cleanup pending (Phase 03.2 scope):**
- `src/pages/search-results.js` — flagged for removal (unused after redesign)
- Desktop CSS rules in `src/styles/*.css` — desktop variant cancelled, mobile-only
- `.claude/worktrees/` — stale worktree directories
- Legacy `toggleFavorite()` in detail.js — never called from UI; writes to obsolete `"favorites"` key

## Known Bugs

**Favorites/Watchlist localStorage key mismatch (HIGH severity, Phase 03.2):**
- Symptoms: "Beğendiklerim" and "İzlediklerim" tabs always appear empty even when items added
- Root cause: Write/read key mismatch
  - Writes (`detail.js:toggleLike`): `"liked_items"`
  - Writes (`detail.js:toggleWatchlist`): `"watchlist_items"`
  - Reads (`index.html:loadFavoritesList`): `"favorites"` and `"watchlist"`
- Files: `index.html` (lines 2157-2191), `src/features/detail.js` (lines 310-382)
- Additional bug: render template reads `item.poster` and `item.type` but writes store `item.poster_path` and `item.media_type`
- Fix: Update `loadFavoritesList()` keys; migrate legacy `"favorites"`/`"watchlist"` items into new keys; fix property names

**Turkish streaming providers missing (HIGH severity, Phase 03.2):**
- Symptoms: Gain, Exxen, TV+, TOD, Apple TV, Google Play do not appear for Turkish content
- Root cause: RapidAPI Streaming Availability dataset only covers BluTV for Turkey
- Files: `src/services/streaming-cache.js` (`_fetchFromApiOrFallback`)
- Fix approach: Add two-layer merge — always call TMDB `/watch/providers` for TR after RapidAPI succeeds; dedupe by `serviceId`
- Also missing in `src/lib/platforms.js`: `TV+` (Turk Telekom), `Tabii` (TRT) URL entries

**HBO Max logo broken / duplicate provider rows (Phase 03.2):**
- Symptoms: HBO Max logo fails to load; same provider appears twice
- Files: `src/features/detail.js` (`buildStreamingHTML`)
- Cause: themeColorCode null for TMDB items; no dedup between RapidAPI + TMDB sources
- Fix: Local logo lookup map in platforms.js; dedup with `Set` on `serviceId.toLowerCase()`

**Profile customization missing (Phase 03.2):**
- Symptoms: User cannot change displayName or avatar after registration
- Files: `public/services/auth.js`, `src/features/profile.js`, `index.html` profile section
- Fix: Add `updateUserProfile(displayName, photoURL)` using Firebase compat v8 `currentUser.updateProfile()`; sync to Firestore `users/{uid}`; preset avatar picker grid

**Phantom API calls on detail close:**
- Symptoms: Network requests continue after modal closes (YouTube/TMDB)
- Files: `src/features/detail.js` (lines 61-66, 78-79)
- Status: No request cancellation; AbortController not used anywhere
- Fix: Wire AbortController into `openDetail()`; abort on `closeModal()`

**Missing null checks for DOM elements:**
- Symptoms: "Cannot read property 'innerHTML' of null"
- Files: `src/features/detail.js` (line 226-228), `src/features/search.js` (line 145-147), `src/ui/loading.js`
- Fix: Apply optional chaining consistently; guard querySelector results

## Security Considerations

**XSS risk in innerHTML interpolation:**
- Risk: 23+ instances of innerHTML with template strings
- Files:
  - `src/ui/movie-card.js`: titles escaped (lines 53, 98); posterUrl unescaped
  - `src/features/detail.js`: video titles unescaped (line 245, `v.snippet?.title`)
  - `src/features/search.js`: autocomplete escapes data-attrs but not all dynamic content
- Mitigation: `escapeHtml()` exists in `src/lib/helpers.js` but inconsistently applied
- Fix: Audit all innerHTML; use textContent where possible; apply escapeHtml() universally

**Client-side TMDB API key exposure:**
- Risk: `TMDB_API_KEY` embedded in CONFIG object
- Files: `src/config.js` (line 14)
- Fix: Backend proxy for TMDB requests (similar to existing Gemini proxy pattern)

**localStorage user tier without integrity:**
- Risk: User can spoof premium tier locally
- Files: `src/features/profile.js` (line 26 `localStorage.getItem('userTier')`)
- Mitigation: None
- Fix: Server-side tier validation via Firebase claims; treat localStorage as cache only

**Avatar photoURL trust:**
- Risk: User-supplied photoURL may be `javascript:`, blob:, or external tracking URL
- Files: planned `auth.js:updateUserProfile()`
- Fix: Allowlist preset CDN URLs; reject non-https; validate before write

## Performance Bottlenecks

**Promise.all blocks on slowest API:**
- Files: `src/features/detail.js` (lines 61-66 — TMDB + YouTube + credits + providers)
- Fix: Load critical data first (poster, title, rating); supplement async

**No request caching/deduplication:**
- Files: `src/services/api.js` — no memoization for getDetails/getCredits
- Fix: Map-based cache with TTL; dedupe in-flight requests

**Unoptimized image loading:**
- Files: `src/ui/movie-card.js` (line 31, w92 hardcoded)
- Fix: srcset with responsive sizes; prefer WebP

**Synchronous querySelectorAll in loops:**
- Files: `src/features/detail.js` (line 214 `switchVideoCategory`)
- Fix: Cache element refs after render

**Gemini retry path adds latency:**
- Files: AI search → /api/search proxy retries on rate limit (5s wait per recent commit a12439f)
- Impact: Slow user feedback when Gemini rate-limits
- Fix: Show interim status; consider streaming response

## Fragile Areas

**Detail page HTML generation (highest risk):**
- Files: `src/features/detail.js` (entire module ~867 lines, especially 500-800)
- Why fragile: huge string templates, nested ternaries, no field-existence validation
- Test coverage: None for buildXXXHTML functions
- Risk: Single API response shape change breaks entire detail view

**Modal state management:**
- Files: `src/features/detail.js` (openDetail/closeModal)
- Why fragile: state scattered across `state` object, DOM classes, module globals (`currentVideoCategory`)
- Fix: Dedicated ModalState with explicit transitions

**Search autocomplete race condition:**
- Files: `src/features/search.js` (handleAutocomplete lines 24-50)
- Why fragile: timeout cleared but in-flight requests not cancelled — older response can overwrite newer
- Fix: AbortController per keystroke

**Profile menu handler accumulation:**
- Files: `src/features/profile.js` (`setupUserMenuHandlers`)
- Why fragile: handlers re-attached on every `updateAuthUI()` call; no dedup
- Fix: Idempotency flag or removal-before-add

**Crew/Director section (recent addition):**
- Files: `src/features/detail.js` (per commit c2b947c)
- Why fragile: New code path with limited test coverage; depends on TMDB credits shape
- Fix: Add unit test for missing director/writer/producer cases

## Scaling Limits

**TMDB rate limiting:**
- Capacity: ~40 req/sec
- Limit: 4 parallel requests per detail view + autocomplete + discover
- Fix: Exponential backoff on 429; aggressive caching

**Modal HTML size:**
- Current: 50KB+ single HTML blob per detail
- Limit: Low-end devices may stutter
- Fix: Lazy-load cast/credits; paginate long lists

**Search result grid:**
- Current: All results rendered to innerHTML at once
- Limit: 100+ results jank on low-end mobile
- Fix: Virtual scroll or "load more" pagination; document.createDocumentFragment

## Dependencies at Risk

**Firebase v12.7.0 vs compat v8 SDK loaded in HTML:**
- Risk: Modular v12 imported via npm; HTML loads compat v8 CDN; potential dual-SDK confusion
- Files: `src/config.js` (FIREBASE_CONFIG), `public/services/auth.js` (uses `firebase.auth()` compat global)
- Impact: Bundle bloat; behavior drift between two SDK styles
- Fix: Pick one (compat v8 currently working); remove unused npm Firebase

**ESLint max-warnings 200:**
- Files: `eslint.config.js`
- Impact: Quality erosion silent
- Fix: Tighten to 0; add pre-commit hook

**Gemini model availability:**
- Risk: Recent commits removed all Gemini 2.0 models (deprecated by Google — e6952ee)
- Impact: Model name drift; needs monitoring of Google deprecation announcements
- Fix: Periodic check of `/v1/models` listing; pin only models with stable lifecycle

## Missing Critical Features

**Request cancellation (AbortController):**
- Problem: Not used anywhere
- Impact: Cleanup impossible; phantom requests; memory leaks

**Error boundaries:**
- Problem: No top-level error handler
- Impact: Single parsing error crashes the view

**Modal loading guards:**
- Problem: User can open another modal while one is loading
- Impact: Race conditions, state leaks

**Profile name/avatar editing (Phase 03.2):**
- Problem: No UI to edit displayName or pick avatar
- Impact: User stuck with Google photo or anonymous avatar; cannot personalize

**Cinema badge visibility (Phase 03.2):**
- Problem: Current pill badge with subtle glass background is easy to miss on posters
- Files: `src/styles/detail.css` (lines 187-207)
- Impact: Theatrical-release indicator invisible on most posters
- Fix: Corner ribbon redesign with red gradient (upcoming) / green pulse (now showing)

## Test Coverage Gaps

**Detail page rendering logic — HIGH priority:**
- Untested: `buildDetailHTML()`, `buildCastHTML()`, `buildVideoHTML()`, crew section
- Files: `src/features/detail.js` (lines 500-800)
- Risk: HTML bugs undetected; API shape changes break silently

**API error handling — HIGH priority:**
- Untested: TMDB 500, YouTube timeout, OMDB empty response
- Files: `src/services/api.js`

**Streaming merge logic (Phase 03.2 new) — HIGH priority:**
- Untested: TMDB providers appended to RapidAPI; dedup behavior
- Files: `src/services/streaming-cache.js`
- Note: No `tests/streaming-cache.test.js` exists — needs creation

**Profile update method (Phase 03.2 new) — HIGH priority:**
- Untested: `updateUserProfile` Firebase + Firestore sync
- Files: `public/services/auth.js`, `src/features/profile.js`

**XSS payloads — HIGH priority:**
- Untested: titles with `<img onerror=...>`, injection through providers/credits
- Files: `src/ui/movie-card.js`, `src/features/detail.js`

**Modal state transitions — MEDIUM priority:**
- Untested: open A → open B without close; rapid open/close cycles
- Risk: Listener accumulation, state leaks

**Search autocomplete race — MEDIUM priority:**
- Untested: rapid typing before request completes
- Risk: Stale results

**Favorites localStorage migration (Phase 03.2 new) — MEDIUM priority:**
- Untested: legacy key merge into new key without data loss
- Files: `index.html` `loadFavoritesList`

---

*Concerns audit: 2026-05-07*
