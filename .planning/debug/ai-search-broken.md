---
status: awaiting_human_verify
trigger: "AI-powered search (Discover page) does not work. When users type a natural language query and submit, no results appear."
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:05:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — Three compounding bugs, all fixed.
test: Awaiting human verification in production/staging environment
expecting: AI search returns results for natural language queries
next_action: User deploys and tests

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: User types "Beni ağlatacak romantik bir film" in the AI search box on the Discover page, and gets movie recommendations matching their description
actual: AI search returns error or no results
errors: Unknown - likely API endpoint failure
reproduction: Go to Discover page, type a movie description in the AI search input, click search
started: May never have worked in production - depends on env vars being set

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Missing OPENAI_API_KEY / TMDB_API_KEY environment variables
  evidence: Those are runtime env vars set in Vercel dashboard; the code correctly errors if missing. Code structure is correct for env vars.
  timestamp: 2026-03-22T00:01:00Z

- hypothesis: UI wiring broken (handleAISearch not connected)
  evidence: discover.js properly exports handleAISearch and assigns it to window.handleAISearch. SearchService.hybridSearch is properly wired through api.js. UI side is intact.
  timestamp: 2026-03-22T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-22T00:00:30Z
  checked: package.json dependencies
  found: firebase-admin is NOT listed in dependencies. Only @ai-sdk/openai, ai, and firebase (client SDK) are listed.
  implication: Vercel fails to install firebase-admin at deploy time. api/search.js imports from 'firebase-admin/app' and 'firebase-admin/firestore' — MODULE_NOT_FOUND crash on every cold start, causing 500 errors on every request.

- timestamp: 2026-03-22T00:00:40Z
  checked: api/search.js line 33 — initializeApp call
  found: initializeApp({ credential: cert(serviceAccount) }) called on every request without getApps() guard. Firebase Admin SDK throws "Firebase App named '[DEFAULT]' already exists" on second invocation in a warm Lambda.
  implication: Even if firebase-admin were installed, the second request to the same warm serverless instance would crash.

- timestamp: 2026-03-22T00:00:50Z
  checked: displayDiscoverResultsView (discover.js lines 274-303) vs API response shape (api/search.js)
  found: displayDiscoverResultsView reads movie.poster_path, movie.vote_average, movie.release_date, movie.id (TMDB field names). api/search.js returned: poster, rating, year, tmdbId. Complete field name mismatch.
  implication: Even if search succeeded, all cards rendered with broken images, "N/A" ratings, blank years. Clicking any card called openDetailModal(undefined, 'movie') — no navigation.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Three bugs: (1) firebase-admin missing from package.json — MODULE_NOT_FOUND crash on every Lambda cold start; (2) initializeApp called without getApps() guard — duplicate-app crash on warm Lambda reuse; (3) api/search.js returned custom field names (poster, rating, year, tmdbId) but displayDiscoverResultsView in discover.js expects TMDB field names (poster_path, vote_average, release_date, id) — results appear empty/broken even when search succeeds.
fix: (1) Added firebase-admin ^13.0.0 to package.json dependencies and ran npm install (installed v13.7.0); (2) Added getApps() guard in initializeFirebase() — reuses existing app on warm invocations; (3) Normalized result objects in getTMDBMovie() and vector-search loop to use TMDB field names (id, poster_path, vote_average, release_date, genre_ids).
verification: Pending human verification in deployed environment
files_changed: [package.json, api/search.js]
