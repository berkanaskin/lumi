---
phase: 03-content-enrichment
plan: 01
subsystem: api
tags: [vercel-edge, rapidapi, omdb, firestore, geoip, streaming-availability, security]

# Dependency graph
requires:
  - phase: 02-detail-modal
    provides: TMDBService with getWatchProviders fallback used by streaming-cache.js

provides:
  - Server-side Edge Function proxy for Streaming Availability API (RapidAPI)
  - Server-side Edge Function proxy for OMDb ratings API
  - Server-side Edge Function proxy for ipapi.co country detection
  - Firestore streaming cache with 24h TTL and 48h document expiry
  - StreamingAvailabilityService and GeoIPService in api.js
  - Updated RatingsService routing through /api/omdb (no client-side key)
  - Country detection state fields (countryDetected, countryName) in state.js

affects:
  - 03-content-enrichment
  - detail-modal
  - streaming-ui
  - country-selector

# Tech tracking
tech-stack:
  added: [ipapi.co (free, no key), Streaming Availability API via RapidAPI, OMDb API via server proxy]
  patterns:
    - Vercel Edge Function proxy pattern (export const config runtime edge)
    - Firestore cache-aside pattern with TTL freshness check
    - Server-side-only API keys (never in VITE_ client env vars)
    - TMDB watch providers as fallback when streaming API fails

key-files:
  created:
    - api/streaming-availability.js
    - api/omdb.js
    - api/geoip.js
    - src/services/streaming-cache.js
    - tests/streaming.test.js
    - tests/ratings.test.js
  modified:
    - src/services/api.js
    - src/config.js
    - src/lib/state.js

key-decisions:
  - "OMDB_API_KEY removed from client config and VITE_ env vars — all OMDb calls now proxy through /api/omdb"
  - "Firestore streaming cache uses 24h freshness TTL with 48h expiry, keyed by tmdbId_COUNTRY"
  - "GeoIP falls back to TR on any failure — never surfaces an error to the user"
  - "StreamingAvailabilityService falls back to TMDB watch providers on 429/500 errors"

patterns-established:
  - "Proxy pattern: all third-party API calls with secret keys route through api/*.js Edge Functions"
  - "Firestore cache-aside: check cache first, fetch on miss, write back with expiresAt timestamp"
  - "Graceful degradation: streaming API failure falls back to TMDB providers (not null)"

requirements-completed: [STRM-01, STRM-02, STRM-04, DETL-02]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 03 Plan 01: API Proxy Layer and Data Services Summary

**Three Vercel Edge Function proxies (streaming, omdb, geoip) with Firestore cache-aside for streaming data, OMDb key moved server-side, country auto-detection service wired into app state.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-20T20:56:09Z
- **Completed:** 2026-03-21T00:00:40Z
- **Tasks:** 2
- **Files modified:** 9 (3 created in api/, 3 created in src/ or tests/, 3 modified)

## Accomplishments

- All three Edge Functions follow the `api/tmdb.js` pattern exactly: edge runtime, CORS headers, typed error responses
- OMDb API key completely removed from client-side config — zero chance of key exposure in built bundle
- Firestore streaming cache with 24h TTL freshness check and 48h document expiry prevents excessive RapidAPI calls
- TMDB watch providers serve as a zero-downtime fallback when Streaming Availability API fails
- Country detection (ipapi.co) always returns a result — falls back to TR, never throws

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Edge Function proxies (streaming-availability, omdb, geoip)** - `13e175b` (feat)
2. **Task 2: Create streaming cache service, update API services, integrate country detection** - `1ed5b72` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `api/streaming-availability.js` - Vercel Edge Function proxy for RapidAPI Streaming Availability; reads RAPIDAPI_KEY server-side
- `api/omdb.js` - Vercel Edge Function proxy for OMDb API; reads OMDB_API_KEY server-side
- `api/geoip.js` - Vercel Edge Function proxy for ipapi.co; returns TR fallback on any failure
- `src/services/streaming-cache.js` - Firestore cache-aside module: 24h TTL, 48h expiry, TMDB fallback
- `src/services/api.js` - Added StreamingAvailabilityService, GeoIPService; updated RatingsService to proxy /api/omdb and add awards field; updated API facade and window exports
- `src/config.js` - Removed OMDB_API_KEY and OMDB_BASE; added explanatory comment about server-side-only keys
- `src/lib/state.js` - Added countryDetected and countryName state fields
- `tests/streaming.test.js` - Wave 0 stubs: StreamingAvailabilityService.getProviders, getStreamingWithCache, GROUP_MAP
- `tests/ratings.test.js` - Wave 0 stubs: RatingsService proxy routing, return shape, awards field

## Decisions Made

- OMDB_API_KEY was removed from both CONFIG and API_URLS in config.js — it was previously exposed client-side via VITE_ prefix which would have been visible in the built JS bundle
- The streaming cache uses `${tmdbId}_${country.toUpperCase()}` as Firestore document ID for deterministic lookups without queries
- GeoIP proxy always returns HTTP 200 (even on upstream failure) to prevent UI error states

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

New environment variables required server-side (Vercel dashboard or .env.local for dev):
- `RAPIDAPI_KEY` — RapidAPI key for streaming-availability.p.rapidapi.com
- `OMDB_API_KEY` — OMDb API key (previously client-side as VITE_OMDB_API_KEY, now server-side only)

The `VITE_OMDB_API_KEY` env var is no longer read by the application and can be removed from .env.local.

## Next Phase Readiness

- All three Edge Function proxies are deployed-ready with correct Vercel Edge runtime config
- StreamingAvailabilityService and GeoIPService are available via window exports for legacy scripts
- Firestore streaming cache ready for consumption by detail modal components in Phase 03-02
- Country state fields ready for country selector UI in Phase 03-03

---
*Phase: 03-content-enrichment*
*Completed: 2026-03-21*
