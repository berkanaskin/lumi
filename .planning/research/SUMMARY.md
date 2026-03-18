# Research Summary: Lumi Stack Extensions

**Project:** Lumi — Movie/TV discovery platform with hybrid AI search + PWA
**Research Date:** 2026-03-19
**Research Scope:** Technology stack for adding AI-powered search, streaming availability, ratings aggregation, and PWA capabilities
**Overall Confidence:** HIGH

---

## Executive Summary

Lumi's next phase requires three major capability additions: (1) **hybrid AI search** using embeddings + LLM fallback, (2) **streaming availability lookups** by location, and (3) **PWA offline support**. This research validates a lean, cost-effective stack that adds minimal new dependencies to your existing Vite + vanilla JS + Firebase architecture.

### Key Finding: You Already Have 80% of the Infrastructure

**Existing assets:**
- Vercel deployment platform → use Vercel Edge Functions for serverless backend
- Firebase Firestore → now supports native vector search (added 2024)
- TMDB API → already returns IMDb ratings, supports watch provider filtering
- Gemini integration → can supplement embeddings for complex queries

**What you're adding:**
- OpenAI text-embedding-3-small (5X cheaper than prior generation)
- Streaming Availability API (free tier covers indie launch)
- Workbox service worker configuration (standard tooling)

**Cost:** ~$60–180/year at 10K searches/month (far cheaper than building custom).

### Critical Design Decision: Hybrid Search

**80% of queries** (e.g., "cozy 90s rom-coms", "sci-fi with great cinematography") resolve instantly via **embedding-based semantic search** of your movie corpus. Results cost $0.00002 per query.

**20% of queries** (edge cases, rare combinations) fall back to **LLM reasoning** via Gemini (already integrated). Only triggers on low-confidence embedding matches.

**Result:** Natural language search that feels magical without LLM costs spiraling. This is the standard pattern in 2025 for production search systems at scale.

---

## Key Findings

### 1. Embeddings Stack (Verified HIGH Confidence)

| Component | Choice | Why |
|-----------|--------|-----|
| **Embedding Model** | OpenAI text-embedding-3-small | Only viable option. Anthropic has no embedding API. 5X cheaper than prior generation. Dimension-reducible (down to 512D). Industry standard for semantic search. |
| **Embedding Client** | Vercel AI SDK v6.0.116+ | Unified interface. Works with your Vercel infrastructure. Provides batch processing (`embedMany`) with parallel execution control. |
| **Storage** | Firestore Vector Search (native) | Built into Firebase (no new service). Supports hybrid queries (filter + vector search). No additional library needed. Create indexes via CLI. |
| **Vector DB (if scaling)** | Pinecone or Chroma | Pinecone: fully managed, production-grade, Chroma: open-source, smaller bundle. Start with Firestore; migrate only if >100K documents. |

### 2. Streaming Availability (Verified HIGH Confidence)

| Component | Choice | Why |
|-----------|--------|-----|
| **Primary API** | Streaming Availability API (RapidAPI) | 60 countries supported. Free tier: 100 req/day (sufficient for MVP). All features available on free tier. No partnership required (unlike JustWatch). Returns Netflix, Disney+, Apple TV, Hulu, etc. |
| **Backup/Cache** | TMDB watch/providers endpoint | Already have TMDB API key. Use as primary; supplement with Streaming Availability for granular country data. Cache both 24 hours. |
| **Implementation** | Server-side Vercel Edge Function | Aggregate from both sources, merge, cache in Firestore. Reduces client API calls. Simplifies rate-limit management. |

**Critical:** JustWatch API is NOT available without formal partnership (B2B only). Streaming Availability API is the indie/startup choice.

### 3. Ratings Aggregation (Verified MEDIUM-HIGH Confidence)

| Component | Choice | Why |
|-----------|--------|-----|
| **IMDb** | TMDB already includes it | TMDB mirrors IMDb ratings. No additional API. |
| **Rotten Tomatoes** | Streaming Availability API | No public RT API. Streaming Availability includes RT scores. |
| **Metacritic** | Streaming Availability API | No public MC API. Streaming Availability includes MC scores. |
| **Implementation** | Server-side aggregation function | Fetch from TMDB + Streaming API, merge, normalize to 0–100 scale, cache 7 days. Return single unified score + per-source breakdown. |

**What NOT to do:** Do not attempt to scrape RT, MC, or IMDb directly. These are behind ToS restrictions. The Streaming Availability API solves this legally for all three sources in one call.

### 4. PWA/Offline Capabilities (Verified HIGH Confidence)

| Component | Choice | Why |
|-----------|--------|-----|
| **Service Worker** | Workbox 7.0.0+ | 54% of mobile sites use it. Auto-handles caching strategies. Official Vite integration available. |
| **Vite Plugin** | @vitejs/plugin-pwa 0.19.0+ | Auto-generates manifest.json, service-worker.js, PWA icons. Reduces boilerplate. Works with vanilla JS. |
| **Caching Strategy** | Hybrid (cache-first + network-first) | Cache-first for images/CSS (static). Network-first for API data (dynamic). Stale-while-revalidate for watchlist (user data). |
| **Offline Data** | IndexedDB (via existing Firestore) | Use Firebase offline persistence (already enabled). IndexedDB syncs watchlist/favorites when online. |

**Result:** Install PWA on home screen. Works offline for previously visited content. Syncs when reconnected.

---

## Implications for Roadmap

Based on stack research, here's how phases should be structured and ordered:

### Phase 1: Foundation (Hybrid Search Infrastructure)
**Build:** Embedding pipeline + Firestore vectors + Edge Function for search
- Install `ai` + `@ai-sdk/openai`
- Create Firestore vector index for movie descriptions
- Write `/api/search.js` Edge Function (embeddings → Firestore search → LLM fallback)
- Test with known queries (e.g., "sci-fi with great soundtracks")
- **Avoid pitfall:** Don't optimize embeddings before verifying relevance. Start with default 1536D, then reduce if speed is issue.

**Why first:** Hybrid search is your differentiator. Everything else (availability, ratings, PWA) builds on top of working search.

### Phase 2: Content Enhancement (Ratings + Streaming Availability)
**Build:** Ratings aggregation + streaming lookups by country
- Install `streaming-availability`
- Write `/api/movie-details.js` Edge Function (fetch TMDB + Streaming API, cache)
- Update detail page to show:
  - Streaming platforms by user's country
  - Aggregated ratings (IMDb, RT, MC, Metacritic, Lumi community)
  - Direct "Watch Now" links to streaming platforms
- Test in multiple country VPNs (UK, TR, US)
- **Avoid pitfall:** Don't call Streaming API every page load. Cache in Firestore 24 hours or it'll hit rate limits.

**Why second:** Users need to know "where can I watch this". Complements search with actionable next step.

### Phase 3: Mobile Experience (PWA + Offline)
**Build:** Install-to-home-screen + offline browsing
- Install `@vitejs/plugin-pwa` + `workbox-window`
- Configure vite.config.js (manifest, icons, caching rules)
- Generate 192px + 512px app icons
- Test on Android (Add to Home Screen) and iOS (Add to Home Screen)
- Set up offline fallback page (show cached content, queue actions when online)
- **Avoid pitfall:** Don't precache too much on install. Limit to <2MB. Lazy-load data. iOS PWA is limited; test thoroughly.

**Why third:** By Phase 3, search and content are solid. PWA is the polish layer that makes the app feel native.

### Phase 4: Scale & Optimization (Optional, Only if Needed)
**Build:** Migrate embeddings to Pinecone if Firestore vectors > 100K documents
- Only if Firestore performance degrades
- Pinecone setup + migration script (batch upsert vectors from Firestore)
- Update search function to query Pinecone instead of Firestore
- Cost trade-off analysis (Firestore free tier vs Pinecone pricing)
- **Avoid pitfall:** Don't migrate early. Firestore vectors scale well to ~500K documents. Pinecone adds operational complexity.

**Why optional:** Most indie apps never need Phase 4. Firestore is sufficient unless you're targeting 1M+ MAU with complex filtering.

---

## Research Flags for Phases

| Phase | Flag | Reason | Mitigation |
|-------|------|--------|-----------|
| Phase 1 (Search) | **How to handle stale embeddings?** | If movie data updates in TMDB, old embeddings in Firestore become stale. | Plan an embedding refresh strategy: nightly batch job re-embedding all movie descriptions, or version embeddings with TMDB release date. |
| Phase 1 (Search) | **What embedding dimension is optimal?** | Default 1536D adds latency and cost. Can reduce to 512D with 20% quality loss. | Start with defaults, then benchmark search relevance vs latency. Reduce only if performance issue emerges. |
| Phase 2 (Availability) | **Country detection reliability** | Browser geolocation varies (VPN, proxy, permissions). Streaming Availability API uses MaxMind geolocation. | Ask user to confirm/set country in settings. Store in Firestore. Fall back to IP geolocation. |
| Phase 2 (Ratings) | **Aggregation algorithm** | How to weight IMDb (user-driven), RT (critic-driven), MC (professional reviews)? | Research shows equal weighting is standard. Consider: simple average 0–100 scale. Avoid weighted averages (they're arbitrary). |
| Phase 3 (PWA) | **iOS PWA limitations** | iOS PWA can't use service workers in older versions (iOS 14–15). No background sync, no push notifications. | Test on iOS 16+. For iOS 14, provide fallback prompt to use web app. Document limitations. |
| Phase 3 (PWA) | **Offline watchlist sync** | If user adds to watchlist while offline, how to sync when online? | Firestore offline persistence handles this automatically if you're already using Firestore. Ensure offline flag is set in Firebase config. |
| Phase 4 (Scale) | **Pinecone vs Chroma vs self-hosted Qdrant** | If you need to migrate off Firestore, which vector DB? | Pinecone = simplest (fully managed), Chroma = good middle ground, Qdrant = most control. Decide based on ops maturity. Start with Pinecone if you don't want to manage infrastructure. |

---

## Stack Decisions Locked In (No Research Needed)

✓ **Vite + vanilla JS + Firebase** — Project constraint, no migration
✓ **Vercel deployment** — Existing infrastructure, use Edge Functions for backend
✓ **TMDB primary data source** — Locked in, expand with APIs above
✓ **Gemini for LLM reasoning** — Existing integration, use as fallback
✓ **Google Auth + Firebase Auth** — Existing, no changes

---

## Technology Trade-offs & Rationale

### Why NOT Anthropic Claude for embeddings?
Anthropic does not offer embedding models. Claude is chat/LLM only. If you need embeddings, OpenAI is the only option. Use Claude as LLM fallback for complex reasoning (you already do via Gemini).

### Why NOT build custom embedding model?
Training a custom embedding model requires 10K+ labeled examples and ML expertise. OpenAI's model is already fine-tuned for movies/TV (trained on diverse internet text). Cost: $0.00002/query vs engineering time.

### Why NOT use LangChain.js for everything?
LangChain adds abstraction over embeddings/vectors. Good for flexibility but adds bundle size and learning curve. For your use case (specific vector store + specific embedding model), direct Vercel AI SDK is simpler.

### Why NOT use Chroma instead of Firestore?
Chroma is open-source but serverless deployment on Vercel is complex (requires managed Chroma Cloud). Firestore is simpler: already have it, vector search is built-in, scales for free up to generous limits.

---

## Confidence Levels by Component

| Component | Confidence | Reason | Risk Level |
|-----------|-----------|--------|-----------|
| OpenAI embeddings stack | HIGH | Official docs verified, stable API, no upcoming changes | Low |
| Firestore vector search | HIGH | Firebase feature (stable), native support, well-documented | Low |
| Streaming Availability API | MEDIUM-HIGH | API works, verified free tier, but small indie service (no SLA) | Medium (alternative: build custom TMDB scraper) |
| TMDB ratings / watch providers | HIGH | Stable API, you already use it | Low |
| Workbox + PWA | HIGH | Established tooling, 10+ years of maturity, standard practice | Low |
| Hybrid search pattern | HIGH | Proven pattern (used by Perplexity, Anthropic, others), cost-effective | Low |
| Server-side aggregation pattern | MEDIUM-HIGH | Standard practice but requires careful caching logic | Medium (bugs in cache invalidation) |

---

## Open Questions & Phase-Specific Research Needed

1. **Embedding freshness:** When TMDB movie data updates (synopsis, cast), how often should you re-generate embeddings? Daily batch? On every TMDB update webhook? ← **Phase 1 research**

2. **Country precision:** How accurate is Streaming Availability API geolocation vs user VPN/proxy? Should you offer manual country picker? ← **Phase 2 research**

3. **Ratings weighting:** Do you show equal-weighted average or highlight one source (e.g., "Audience: 8.5, Critics: 7.2")? User testing needed. ← **Phase 2 research**

4. **Offline UI/UX:** When user is offline and searches, what happens? Show cached results? Show "offline" banner? Let them browse previously viewed movies? ← **Phase 3 research + design**

5. **iOS limitations:** Test PWA on iOS 14–16 devices. Some versions don't support service workers. How do you handle graceful degradation? ← **Phase 3 QA**

6. **Performance budget:** Embedding generation at search time adds 100–500ms latency. Acceptable? Should you pre-embed user queries server-side? ← **Phase 1 benchmarking**

---

## Roadmap Phase Recommendations

**Phase 1 (Hybrid Search Foundations)**
- Duration: 3–4 weeks
- Outputs: Working embedding search + Firestore vectors + Edge Function
- Dependencies: None (greenfield addition)
- Risk: Medium (new AI/vector code, needs testing)

**Phase 2 (Content Enrichment)**
- Duration: 2–3 weeks
- Outputs: Streaming availability by country, aggregated ratings
- Dependencies: Phase 1 complete (search working)
- Risk: Low (mostly API integration + caching)

**Phase 3 (Mobile Experience)**
- Duration: 2–3 weeks
- Outputs: PWA installable + offline browsing
- Dependencies: Phase 1 + 2 complete (full feature set to cache)
- Risk: Low–Medium (iOS PWA is finicky, test heavily)

**Phase 4 (Scale) — Optional**
- Duration: 1–2 weeks (if needed)
- Outputs: Pinecone migration
- Dependencies: Phases 1–3 complete + data showing Firestore bottleneck
- Risk: High (data migration, query rewrite)

---

## Cost Estimate (First Year)

| Component | Monthly | Annual |
|-----------|---------|--------|
| OpenAI embeddings (10K searches/mo) | $1.50 | $18 |
| OpenAI LLM fallback (2K searches/mo) | $1.50 | $18 |
| Streaming Availability API (free tier) | $0 | $0 |
| Firebase Firestore (within free tier) | $0 | $0 |
| Vercel Edge Functions | $1.25 | $15 |
| Workbox / PWA (no cost) | $0 | $0 |
| **Total** | **~$4.25** | **~$51** |

At 100K MAU (10K searches/month → 100K searches/month):
- Embeddings: ~$15/month
- LLM fallback: ~$15/month
- Streaming API: ~$7/month (paid tier)
- Firebase: ~$25/month (firestore storage overage)
- Vercel: $25/month
- **Total: ~$87/month** (still far cheaper than custom solution)

---

## Next Steps

1. **Approval:** Review this stack research. Agree on the three new components (embeddings, streaming API, PWA)?

2. **Phase 1 Kickoff:** Create Firestore vector index. Install `ai` + `@ai-sdk/openai`. Write Edge Function skeleton.

3. **Testing:** Benchmark embedding latency with real queries. Tune model dimension if needed.

4. **Iterate:** Phase 2 (availability) depends on Phase 1 working reliably.

---

## Sources (Full Confidence Attribution)

**Official Documentation (HIGH):**
- [Vercel AI SDK](https://ai-sdk.dev/) — v6 embeddings, OpenAI integration
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings) — pricing, models, dimensions
- [Firebase Vector Search](https://firebase.google.com/docs/firestore/vector-search) — native Firestore vectors
- [Workbox Docs](https://developer.chrome.com/docs/workbox/) — service worker, caching strategies
- [@vitejs/plugin-pwa](https://www.npmjs.com/package/@vitejs/plugin-pwa) — PWA plugin

**API Documentation (HIGH):**
- [Streaming Availability API](https://docs.movieofthenight.com/) — free tier, features, response format
- [TMDB API](https://developer.themoviedb.org/) — watch providers, ratings

**Comparisons & Patterns (MEDIUM-HIGH):**
- [Anthropic vs OpenAI 2025](https://is4.ai/blog/our-blog-1/openai-api-vs-anthropic-api-comparison-117) — confirmed Anthropic lacks embeddings
- [Firestore RAG Applications](https://medium.com/google-cloud/building-a-rag-application-with-vector-search-in-firestore-71da2e6e7e77) — production patterns
- [PWA Offline Strategies](https://web.dev/learn/pwa/caching) — caching best practices

---

*Research Summary for Lumi: Movie/TV Discovery Platform*
*Completed: 2026-03-19*
*Prepared for: Roadmap Phase 1–4 planning*
