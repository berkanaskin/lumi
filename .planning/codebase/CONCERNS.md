# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Inline event handlers in generated HTML:**
- Issue: Multiple components use `onclick` attributes directly in innerHTML templates instead of proper event listeners
- Files:
  - `src/features/detail.js` (lines 128, 239, 258, 795)
  - `src/ui/movie-card.js` (line 87)
  - `src/features/discover.js` (multiple instances)
- Impact: Difficult to test, maintain, and refactor; violates separation of concerns; potential security vector for XSS if input escaping fails
- Fix approach: Replace inline handlers with addEventListener-based approach. Create reusable functions that attach event listeners after DOM insertion.

**Unhandled promise rejections:**
- Issue: Multiple async functions lack comprehensive error handling for all promise chains
- Files:
  - `src/features/detail.js` (lines 24-127): `openDetail()` has try-catch but nested Promise.all() and subsequent awaits don't all reject properly
  - `src/features/discover.js`: `handleAISearch()` and `handleWizardSearch()` lack comprehensive error boundaries
  - `src/services/api.js`: Generic fetch error handling returns empty results `{ results: [] }` silently instead of throwing
- Impact: Silent failures; user receives no feedback when APIs fail; state becomes inconsistent
- Fix approach: Wrap all promise chains in try-catch. Implement proper error event emission. Show user-facing error toasts on API failures.

**Missing removeEventListener cleanup:**
- Issue: Event listeners added via `addEventListener()` are never removed, causing memory leaks when modals open/close repeatedly
- Files:
  - `src/features/detail.js`: Modal lifecycle doesn't clean up keyboard handlers, scroll handlers
  - `src/features/search.js`: Autocomplete dropdown handlers (line ~93-114)
  - `src/features/profile.js`: User menu handlers added without cleanup (line ~99)
- Impact: Memory leaks on long sessions; event handlers accumulate; multiple handlers fire for same event
- Fix approach: Store listener references and remove them in closeModal()/cleanup functions. Use AbortController for fetch cancellation.

**Global state mutations:**
- Issue: State object is mutated directly throughout codebase without clear ownership or validation
- Files:
  - `src/lib/state.js`: 64-element state object with no mutation guards
  - `src/features/detail.js`: Directly mutates state fields (line 41-42, 165, 208-214)
  - `src/features/discover.js`: Multiple direct state mutations
- Impact: Difficult to debug state changes; no audit trail of mutations; potential race conditions
- Fix approach: Implement updateState() function as single mutation point. Add logging for state changes in development.

## Known Bugs

**Modal class name mismatch (recently fixed but verify):**
- Symptoms: Modal visibility toggled with inconsistent class names
- Files: `src/features/detail.js` (line 45 uses 'active' class)
- Trigger: Opening/closing modal rapidly
- Status: Recent commit (bbed9b9) claims fix, verify CSS aligns with 'active' class in `index_lumi.css`

**Phantom API calls on detail page close:**
- Symptoms: Network tab shows API requests after modal closes
- Files: `src/features/detail.js` (YouTube/TMDB requests at lines 61-66, 78-79)
- Trigger: Open detail modal then close before data loads
- Status: Partially fixed in commit 5fbd596, but no request cancellation implemented
- Workaround: AbortController not used; requests complete in background

**Missing null checks for DOM elements:**
- Symptoms: "Cannot read property 'innerHTML' of null" errors
- Files:
  - `src/features/detail.js` (line 226-228: container check exists but not all paths verified)
  - `src/features/search.js` (line 145-147: searchResultsSection may be null)
  - `src/ui/loading.js`: Multiple querySelector calls without null checks
- Trigger: Browser feature detection disabled or elements load with timing issues
- Workaround: Optional chaining used inconsistently

## Security Considerations

**XSS vulnerability risk in innerHTML usage:**
- Risk: 23 instances of innerHTML with string interpolation across codebase
- Files:
  - `src/ui/movie-card.js`: Uses `escapeHtml()` for titles (lines 53, 98) but posterUrl is unescaped
  - `src/features/detail.js`: Video titles at line 245 use unescaped `v.snippet?.title`
  - `src/features/search.js`: Autocomplete items escape data-attributes but not all dynamic content
- Current mitigation: escapeHtml() helper exists in `src/lib/helpers.js` but not applied consistently
- Recommendations:
  - Audit all innerHTML usages
  - Use textContent for user data instead of innerHTML where possible
  - Apply escapeHtml() to ALL user-facing dynamic content
  - Consider DOM API (createElement) instead of string templates

**API key exposure:**
- Risk: TMDB_API_KEY embedded in client-side code (CONFIG object)
- Files: `src/config.js` (line 14)
- Current mitigation: Keys read from .env via build process
- Recommendations:
  - Implement backend proxy for TMDB requests
  - Rotate API key regularly
  - Monitor for key leakage in git history

**localStorage usage without validation:**
- Risk: User tier and preferences stored in localStorage without signature/encryption
- Files:
  - `src/features/profile.js` (line 26: `localStorage.getItem('userTier')`)
  - `src/lib/state.js`: localStorage used for favorites/watchlist
- Current mitigation: None
- Recommendations:
  - Add integrity check (HMAC signature) for sensitive data
  - Implement server-side validation for user tier claims
  - Clear sensitive data on logout

## Performance Bottlenecks

**Synchronous document.querySelectorAll in loops:**
- Problem: Video grid rendering scans DOM for multiple selectors
- Files: `src/features/detail.js` (line 214: querySelectorAll in switchVideoCategory)
- Cause: Query selector reflow triggered each time
- Improvement path: Cache element references after rendering; use single query then filter

**Unoptimized image loading:**
- Problem: TMDB poster URLs loaded at multiple resolutions without responsive sizing
- Files: `src/ui/movie-card.js` (line 31: w92 size hardcoded)
- Cause: All cards load same resolution regardless of viewport
- Improvement path: Implement srcset with responsive sizes; use WebP with JPEG fallback

**Promise.all() waits for slowest API:**
- Problem: Detail modal blocks on slowest of 4 parallel requests
- Files: `src/features/detail.js` (lines 61-66: Promise.all with TMDB + YouTube + credits + providers)
- Cause: YouTube API slower than TMDB; blocks entire render
- Improvement path: Load critical data first (title, poster, rating), then load supplements asynchronously

**No request caching/deduplication:**
- Problem: Same movie details fetched multiple times in same session
- Files: `src/services/api.js`: No cache layer for getDetails(), getCredits()
- Cause: No memoization or request-level caching
- Improvement path: Implement simple Map-based cache with TTL; deduplicate in-flight requests

## Fragile Areas

**Detail page HTML generation:**
- Files: `src/features/detail.js` (entire module, especially lines 500-800)
- Why fragile:
  - 867 lines of HTML string manipulation
  - Complex nested ternary operators
  - Multiple API responses merged into single HTML blob
  - No validation that all required fields exist
- Safe modification: Add unit tests for each buildXXXHTML function with missing fields
- Test coverage: No tests for detail rendering logic
- Risk: Single API response format change breaks entire detail view

**Modal state management:**
- Files: `src/features/detail.js` (openDetail/closeModal functions)
- Why fragile:
  - Global `currentVideoCategory` variable at top of module
  - Modal state scattered across `state` object, DOM classes, and local variables
  - No clear state machine; multiple functions mutate modal state
- Safe modification: Refactor into dedicated ModalState class with clear transitions
- Test coverage: Modal state transitions not tested

**Search autocomplete race condition:**
- Files: `src/features/search.js` (handleAutocomplete function, lines 24-50)
- Why fragile:
  - Single timeout cleared but multiple requests may be in-flight
  - User types "foo" → request A; types "foobar" → request B; request A resolves after B
  - No request cancellation or comparison of request timing
- Safe modification: Use AbortController to cancel previous request on new input
- Test coverage: Race condition not covered

**Event listener accumulation:**
- Files: `src/features/profile.js` (setupUserMenuHandlers function)
- Why fragile:
  - User menu dropdown listeners added every time updateAuthUI() called
  - No deduplication; clicking menu can attach handlers multiple times
  - Logout flow may not clean up all listeners
- Safe modification: Check if handlers already attached before adding
- Test coverage: Handler accumulation not tested

## Scaling Limits

**API rate limiting (no backoff):**
- Current capacity: TMDB allows ~40 requests/second
- Limit: App fires 4 parallel requests per detail view + autocomplete + discover
- Scaling path:
  - Implement exponential backoff for rate limit 429 responses
  - Queue requests instead of firing immediately
  - Cache aggressively to reduce total requests

**Modal HTML generation memory:**
- Current: Single 50KB+ detail HTML blob built before render
- Limit: Large detail pages with many cast/credits may exceed memory on low-end devices
- Scaling path:
  - Lazy-load cast/credits sections
  - Stream HTML generation instead of single blob
  - Pagination for long lists

**Search result grid rendering:**
- Current: All search results rendered to innerHTML at once
- Limit: 100+ results cause jank on low-end devices
- Scaling path:
  - Virtual scrolling for result grid
  - Pagination (show 20, load more on scroll)
  - Use document.createDocumentFragment() for batch DOM inserts

## Dependencies at Risk

**Firebase v12.7.0 (auth integration):**
- Risk: Firebase imported but no actual auth implementation visible in source
- Files: `src/config.js` (FIREBASE_CONFIG), but features/profile.js uses window.AuthService (not Firebase)
- Impact: Unused dependency adds ~1MB to bundle; potential security liability if keys exposed
- Migration plan: Remove Firebase import if using custom auth, or properly integrate Firebase Auth in profile.js

**Outdated ESLint config:**
- Risk: eslint v9.39.2 with max-warnings 200 (too permissive)
- Files: `eslint.config.js`
- Impact: Technical debt accumulating; no enforcement of code quality rules
- Migration plan: Reduce max-warnings to 0; enable additional rules; add pre-commit hooks

## Missing Critical Features

**Request cancellation:**
- Problem: No AbortController used anywhere; long-running requests can't be cancelled
- Blocks: Cannot implement proper cleanup on modal close; memory leaks from dangling requests
- Impact: App continues background API calls even after user navigates away

**Error boundaries:**
- Problem: No top-level error handler; single parsing error crashes entire app
- Blocks: Cannot gracefully degrade when API returns malformed data
- Impact: Single bad API response breaks entire detail view

**Loading state for modals:**
- Problem: Modal shows spinner during fetch but doesn't prevent user interaction
- Blocks: User can close modal, reopen modal, open another modal while one is loading
- Impact: Race conditions in modal state

## Test Coverage Gaps

**Detail page rendering logic:**
- What's not tested: buildDetailHTML(), buildCastHTML(), buildVideoHTML() functions
- Files: `src/features/detail.js` (functions at lines 500-800)
- Risk: HTML generation bugs undetected; easy to break on API response changes
- Priority: High (affects core user experience)

**API error handling:**
- What's not tested: Behavior when TMDB returns 500, when YouTube timeout, when OMDB returns empty
- Files: `src/services/api.js` (all fetch methods)
- Risk: Silent failures; users see broken/incomplete detail views
- Priority: High (affects reliability)

**Modal state transitions:**
- What's not tested: Open modal → close → reopen; open detail A → open detail B without closing A
- Files: `src/features/detail.js` (openDetail, closeModal)
- Risk: State leaks between modals; event handlers accumulate
- Priority: Medium (affects UX but not core data)

**Event listener cleanup:**
- What's not tested: Opening/closing modal 10 times then checking DOM listeners
- Files: All modules that use addEventListener
- Risk: Memory leaks on long sessions; performance degradation
- Priority: Medium (doesn't break immediately but accumulates)

**XSS payloads:**
- What's not tested: Movie titles with `<img onerror=alert()>`, user input in innerHTML paths
- Files: `src/ui/movie-card.js`, `src/features/detail.js`
- Risk: Potential code injection if escapeHtml() has edge cases
- Priority: High (security vulnerability)

**Search autocomplete race conditions:**
- What's not tested: Rapid typing (foo→foob→foobar) before requests complete
- Files: `src/features/search.js` (handleAutocomplete)
- Risk: Stale results shown after newer request; wrong movie selected
- Priority: Medium (edge case but real scenario)

---

*Concerns audit: 2026-03-18*
