---
phase: 02-hybrid-ai-search
plan: 01
subsystem: api, database, infra
tags: [openai, embeddings, firestore, vector-search, edge-functions, semantic-search]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Firebase Admin SDK integration pattern, Vercel Edge Function structure
provides:
  - Batch embedding generation via OpenAI text-embedding-3-small
  - Firestore vector index configuration with 512-dimensional embeddings
  - Client-side embedding utilities for version management and retraining detection
  - Infrastructure foundation for Plan 02 (semantic search API)
affects:
  - 02-02-semantic-search (requires embeddings in Firestore before search queries)
  - 02-03-search-ui (requires working embeddings infrastructure)

# Tech tracking
tech-stack:
  added:
    - ai@6.0.116 (Vercel AI SDK with embedMany and cosineSimilarity)
    - @ai-sdk/openai@3.0.41 (OpenAI provider for text-embedding-3-small)
  patterns:
    - Edge Function pattern for batch AI operations (api/embeddings.js)
    - Firestore versioned embeddings strategy (embedding_v1, v2...)
    - Client utility modules for Firestore operations (src/lib/embeddings.js)

key-files:
  created:
    - api/embeddings.js (189 lines) - batch embedding generation Edge Function
    - firestore/indexes/movie_embeddings_vector_index.json (20 lines) - Firestore vector index config
    - src/lib/embeddings.js (181 lines) - client-side embedding utilities
  modified:
    - package.json - added ai and @ai-sdk/openai dependencies

key-decisions:
  - "OpenAI text-embedding-3-small with 512-dimension reduction (66% cost savings vs 1536 dimensions)"
  - "Versioned embeddings strategy allows gradual migrations without service disruption"
  - "Batch processing with 50-movie limit for cost control and error recovery"
  - "Firestore vector index with year field for semantic search with temporal filtering"

requirements-completed:
  - DISC-01
  - DISC-02
  - DISC-05
  - PLAT-04

# Metrics
duration: 1min 17sec
completed: 2026-03-19
---

# Phase 02 Plan 01: Embedding Infrastructure Summary

**Batch embedding generation pipeline with OpenAI text-embedding-3-small, Firestore vector index configuration, and client-side utilities for semantic search foundation**

## Performance

- **Duration:** 1 min 17 sec
- **Started:** 2026-03-19T21:49:28Z
- **Completed:** 2026-03-19T21:50:45Z
- **Tasks:** 4/4 completed
- **Files created:** 3
- **Files modified:** 1
- **Commits:** 4 task commits

## Accomplishments

1. **AI SDK Dependencies Installed**
   - ai@6.0.116 for embedMany() batch operations and cosineSimilarity utilities
   - @ai-sdk/openai@3.0.41 for OpenAI model factory
   - Both libraries validated via npm ls

2. **Firestore Vector Index Configuration**
   - Created `firestore/indexes/movie_embeddings_vector_index.json` with 512-dimensional vector field
   - Added year field for compound queries (semantic search + temporal filtering)
   - Configuration ready for deployment via `firebase deploy --only firestore:indexes`

3. **Batch Embedding Generation Edge Function**
   - Implemented `/api/embeddings` POST endpoint for batch processing
   - Generates embeddings from movie metadata (title + year + description + genres)
   - Stores versioned embeddings (embedding_v1, v2, etc.) with metadata
   - Logs metrics to `api_metrics` collection for cost tracking
   - Configurable batch limit (1-100 movies, default 50) for cost control
   - Error handling for missing Firebase config and OpenAI API failures

4. **Client-side Embedding Utilities**
   - `getEmbeddingVersion()` - Queries first movie to extract current version, caches 5 minutes
   - `shouldRetrain()` - Checks LLM fallback ratio (>25%) and embedding age (>30 days)
   - `logMetricLocally()` - Prepares metrics for client-side aggregation before API submission
   - All utilities use Firebase SDK directly without API calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK and OpenAI dependencies** - `cf72d50` (feat)
2. **Task 2: Create Firestore vector index configuration** - `78df10f` (feat)
3. **Task 3: Create batch embedding generation Edge Function** - `017ae35` (feat)
4. **Task 4: Create client-side embedding utilities** - `2636d1d` (feat)

**Plan metadata:** Will be committed after STATE.md/ROADMAP.md updates

## Files Created/Modified

### Created
- `api/embeddings.js` (189 lines) - Batch embedding generation Edge Function with versioning, metric logging, and error handling
- `firestore/indexes/movie_embeddings_vector_index.json` (20 lines) - Firestore vector index configuration with 512 dimensions
- `src/lib/embeddings.js` (181 lines) - Client-side utilities: getEmbeddingVersion, shouldRetrain, logMetricLocally, clearVersionCache

### Modified
- `package.json` - Added ai@6.0.116 and @ai-sdk/openai@3.0.41 dependencies

## Decisions Made

- **Dimension reduction to 512:** Reduces storage and query costs by 66% with minimal accuracy loss (per research)
- **Versioning strategy:** Allows multiple embedding versions in Firestore for gradual migrations without recomputing entire library
- **Batch size of 50:** Balances API call efficiency against per-request cost and enables error recovery (failed batch doesn't lose progress)
- **Metric logging pattern:** `api_metrics` collection tracks all AI operations for cost analysis and retraining signals

## Deviations from Plan

None - plan executed exactly as written. All tasks completed with no auto-fixes required.

## Issues Encountered

None - clean execution. All syntax validations passed, dependencies installed without errors.

## Manual Deployment Step Required

**Before Plan 02 (semantic search) can execute, the Firestore vector index must be deployed:**

```bash
firebase deploy --only firestore:indexes
```

This deploys the configuration from `firestore/indexes/movie_embeddings_vector_index.json` to Firebase. Without this step, the `findNearest()` queries in Plan 02 will fail with "index not found" errors.

**Status:** Index configuration file created and validated. Deployment is a user responsibility before proceeding to Plan 02.

## Next Phase Readiness

**Plan 02 (Semantic Search API) is ready to proceed once:**
1. ✓ Embedding infrastructure is coded and committed (DONE)
2. ⏳ Firestore vector index is deployed (REQUIRES: User to run `firebase deploy --only firestore:indexes`)
3. ⏳ Embeddings are generated for initial movie library (REQUIRES: Calling `/api/embeddings` endpoint to populate database)

**Ready to execute Plan 02?**
- If you have embeddings already in Firestore: YES, proceed immediately
- If not: Call `POST /api/embeddings` once to generate initial batch, then proceed to Plan 02

---

*Phase: 02-hybrid-ai-search*
*Plan: 01*
*Completed: 2026-03-19*
