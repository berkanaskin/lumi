---
status: awaiting_human_verify
trigger: "Nerede İzlenir (Where to Watch) section either shows 'yayın platformu bulunamadı' or loads very late. Streaming provider data is not appearing reliably."
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - Three root causes identified and primary fix applied.
test: Code trace + fix applied to detail.js
expecting: User verifies streaming section resolves (not stuck as skeleton) on popular movies
next_action: Await human verification

## Symptoms

expected: Streaming section should show platform tiles (Netflix, Disney+, etc.) grouped by Stream/Rent/Buy with logos and deep links
actual: Shows "yayın platformu bulunamadı" (not available) or skeleton that never resolves. HBO Max logo specifically not showing.
errors: Unknown - need to check API responses
reproduction: Open any popular movie detail page. Streaming section is empty or shows "not available".
started: Since Phase 3. The streaming-availability proxy and cache were created.

## Eliminated

- hypothesis: TMDB fallback in streaming-cache.js is broken
  evidence: _tmdbFallback correctly calls TMDBService.getWatchProviders(tmdbId, type, countryUpper) and maps flatrate/free/rent/buy arrays
  timestamp: 2026-03-22T00:01:00Z

- hypothesis: buildStreamingHTML logoUrl logic is broken
  evidence: logoUrl logic correctly handles both full URLs (RapidAPI) and /path strings (TMDB). onerror fallback to letter also exists.
  timestamp: 2026-03-22T00:01:00Z

- hypothesis: API v4 response parsing is wrong (streamingOptions[country] key)
  evidence: API v4 uses lowercase country codes in streamingOptions keys. proxy.js reads country as lowercase. data.streamingOptions[country] is correct.
  timestamp: 2026-03-22T00:01:00Z

## Evidence

- timestamp: 2026-03-22T00:01:00Z
  checked: detail.js lines 110-121 — imdbId gating logic
  found: if (imdbId) { getStreamingWithCache(...) } — when imdbId is null, streamingData stays null. renderDetail passes null. buildStreamingHTML(null) returns permanent skeleton.
  implication: For any movie without an imdbId (or if getExternalIds fails), streaming section is stuck as skeleton forever — never resolves to "not available" or actual data.

- timestamp: 2026-03-22T00:01:00Z
  checked: .env.local RAPIDAPI_KEY comment
  found: "# RapidAPI Key (MoviesDatabase - Trivia)" — the key c6c8ab0a13msh... is labeled for MoviesDatabase, not streaming-availability.p.rapidapi.com.
  implication: If not subscribed to streaming-availability API, every proxy call fails with 401. catch block in _fetchFromApiOrFallback falls back to TMDB. If TMDB returns no TR providers, shows "not available" — which is correct behavior.

- timestamp: 2026-03-22T00:01:00Z
  checked: streaming-cache.js _fetchFromApiOrFallback lines 82-85
  found: Guard `if (!imdbId) { return _tmdbFallback(...) }` exists inside getStreamingWithCache. But detail.js never called getStreamingWithCache when imdbId was null — so this guard was dead code.
  implication: Fix: remove the imdbId guard from detail.js, always call getStreamingWithCache (which internally handles null imdbId correctly).

- timestamp: 2026-03-22T00:01:00Z
  checked: streaming-cache.js logoPath extraction line 109
  found: logoPath = option.service?.imageSet?.lightThemeImage || darkThemeImage || null. TMDB logoPath = p.logo_path. buildStreamingHTML prepends TMDB base URL for /path strings.
  implication: Logo logic is correct. HBO Max logo missing = either imageSet not in API response (onerror shows letter) or API call failing (TMDB fallback logoPath used instead).

## Resolution

root_cause: |
  PRIMARY BUG: In detail.js lines 112-121, getStreamingWithCache was only called when
  imdbId was non-null. When imdbId is null (or API.getIMDBId fails), streamingData stayed
  null. renderDetail passed null to buildStreamingHTML which returned a permanent skeleton
  <div> that never resolved. The TMDB fallback logic inside streaming-cache.js (the
  `if (!imdbId)` guard in _fetchFromApiOrFallback) was never reached because the call
  was gated at the detail.js level.

  SECONDARY: RAPIDAPI_KEY may not be subscribed to streaming-availability.p.rapidapi.com
  (comment says "MoviesDatabase - Trivia"). If 401, catch falls back to TMDB automatically —
  so this is handled. If TMDB shows empty providers for TR, "not available" is correct.

  TERTIARY: HBO Max logo missing is cosmetic — onerror already shows letter fallback.
  Happens when service.imageSet is absent from API response.

fix: |
  Changed detail.js to always call getStreamingWithCache regardless of imdbId:
  - streamingPromise = getStreamingWithCache(id, imdbId, ...) [imdbId may be null]
  - ratingsPromise = imdbId ? API.getAllRatings(imdbId) : Promise.resolve(null)
  - Both awaited in parallel
  This ensures streaming-cache.js handles null imdbId via its internal TMDB fallback,
  and streamingData is never null after the enrich phase (always { providers: [...] }).

verification: |
  After fix: buildStreamingHTML will never receive null streamingData in the second
  renderDetail call. It will always receive { providers: [] } or { providers: [...] }.
  The skeleton state only appears during the first renderDetail (Phase 1, instant render).
  After Phase 2 completes, section resolves to either providers or "not available".

files_changed:
  - src/features/detail.js
