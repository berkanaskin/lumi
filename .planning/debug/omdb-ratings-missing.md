---
status: awaiting_human_verify
trigger: "Detail page only shows single TMDB score (8.5/10) instead of all 3 platform ratings (IMDb, Rotten Tomatoes, Metacritic). The ratings bar with logos should appear but doesn't."
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:01:00Z
symptoms_prefilled: true
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED - api/omdb.js uses process.env.OMDB_API_KEY but only VITE_OMDB_API_KEY is set in env files. Fix: add OMDB_API_KEY (no VITE_ prefix) to .env.local, OR change api/omdb.js to also fall back to VITE_OMDB_API_KEY
test: Fix applied - add server-side OMDB_API_KEY to .env.local
expecting: OMDb proxy returns valid data; ratings bar populates
next_action: Apply fix to .env.local and verify the omdb.js is reading the right variable

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: After opening a detail modal, ratings bar should show IMDb score/10, Rotten Tomatoes %, and Metacritic /100 with their respective logos
actual: Only TMDB score (★ 8.5/10) shows in the hero section. No ratings bar with IMDb/RT/MC logos appears.
errors: Unknown - need to check console and API responses
reproduction: Open any movie detail page (e.g. Forrest Gump). The ratings bar area shows a skeleton shimmer but never resolves to actual ratings.
started: Since Phase 3 implementation. The OMDb proxy was created but ratings may not be loading.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: "The second renderDetail call is not firing or state.currentAllRatings is not set before it"
  evidence: "Code is correct: state.currentAllRatings = allRatings (line 126) is set BEFORE renderDetail is called (line 138), and renderDetail reads from state.currentAllRatings (line 492)"
  timestamp: 2026-03-22T00:01:00Z

- hypothesis: "api/omdb.js endpoint is missing or misconfigured"
  evidence: "The endpoint exists and is correctly structured. The URL construction and response parsing logic are all correct."
  timestamp: 2026-03-22T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-22T00:01:00Z
  checked: ".env, .env.local, api/omdb.js"
  found: "api/omdb.js uses process.env.OMDB_API_KEY (server-side var). Both .env and .env.local only define VITE_OMDB_API_KEY=97f317e5 (client-side var). No OMDB_API_KEY (without VITE_ prefix) is defined anywhere."
  implication: "The edge function builds URL: https://www.omdbapi.com/?i=tt...&apikey=undefined. OMDb returns Response=False. RatingsService.getAllRatings() returns null. buildRatingsHTML(tmdbScore, null) returns skeleton div that never resolves."

- timestamp: 2026-03-22T00:01:00Z
  checked: "buildRatingsHTML in detail.js line 608-651"
  found: "if (!allRatings) return '<div class=\"ratings-skeleton\"></div>' — skeleton shown on first render pass (allRatings=null), but the skeleton also persists on second render since allRatings is still null due to the env var mismatch"
  implication: "The skeleton never resolves to actual ratings. User sees perpetual shimmer."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: The OMDb API key is stored as VITE_OMDB_API_KEY (Vite client-side prefix) in both .env and .env.local, but api/omdb.js reads process.env.OMDB_API_KEY (without the VITE_ prefix, the correct server-side env var name for Vercel Functions). This mismatch means the edge function always sends apikey=undefined to OMDb, which responds with Response=False, causing getAllRatings() to return null, and the ratings bar to show a permanent skeleton shimmer.
fix: Added OMDB_API_KEY=97f317e5 (without VITE_ prefix) to both .env and .env.local. The same key value (97f317e5) was already present as VITE_OMDB_API_KEY — this just adds it under the correct name that process.env reads in the edge function. For Vercel production, OMDB_API_KEY must also be added in the Vercel dashboard > Project Settings > Environment Variables.
verification:
files_changed: [".env", ".env.local"]
