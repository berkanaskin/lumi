# Architecture Patterns

**Project:** Lumi (Movie/TV Discovery Platform)
**Domain:** AI-powered discovery with streaming availability aggregation and community ratings
**Researched:** 2026-03-19

## Recommended Architecture

Lumi's architecture combines a client-heavy SPA frontend with serverless backend services, organized into distinct functional layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER (Vite SPA)                  │
│  ┌──────────────┬──────────────┬──────────┬─────────────────┐  │
│  │   Discovery  │    Search    │  Detail  │  User Profile   │  │
│  │   (Browse)   │  (Hybrid AI)  │  Page    │  (Favorites)    │  │
│  └──────────────┴──────────────┴──────────┴─────────────────┘  │
│                              ↓                                   │
│                    State Management Layer                       │
│              (Client cache, user auth, favorites)               │
└─────────────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
    ┌─────────────┐      ┌──────────────┐    ┌────────────────┐
    │   Firebase  │      │   Vercel     │    │   Third-party  │
    │   (Auth +   │      │  Serverless  │    │     APIs       │
    │  Firestore) │      │  (Backend)   │    │   (TMDB, YouTube│
    └─────────────┘      └──────────────┘    │  , OMDb, etc)  │
                              ↓               └────────────────┘
                    ┌──────────────────────┐
                    │  Aggregation Layer   │
                    │  (Caching + Query    │
                    │   composition)       │
                    └──────────────────────┘
```

## Component Boundaries

### Frontend Components (Client Layer)

| Component | Responsibility | Communicates With | Data Owned |
|-----------|---------------|-------------------|------------|
| **Discovery UI** | Browse trending/popular titles, pagination, filtering | Content API, Firebase Auth | Current page, filters, scroll state |
| **Search UI** | Natural language input, query handling, results display | Hybrid Search API, Firebase Auth | Query history, search results cache |
| **Detail Page** | Show full content info: cast, ratings, streaming, videos | Content API, Availability API, Videos API, Ratings API, Community API | Expanded detail view, user's rating |
| **Profile Page** | User info, favorites, watchlist, premium status | Firebase Firestore, RevenueCat API | Favorites list, watchlist, user preferences |
| **Theme/i18n Manager** | Dark/light theme, language switching (EN/TR) | Local storage | User's theme preference, language choice |

### API/Service Layer (Backend - Vercel Serverless)

| Service | Responsibility | Upstream APIs | Output Cache Location |
|---------|---------------|----------------|----------------------|
| **Hybrid Search API** | Accept natural language query → embedding lookup → LLM fallback → result ranking | TMDB (fallback), Gemini AI (fallback) | Firestore (query cache + embeddings) |
| **Content API** | Fetch movie/TV metadata, enrich with images/descriptions | TMDB API | Firestore or Redis (content cache) |
| **Availability API** | Aggregate streaming platform presence by geo + query TMDB for watchlist data | TMDB (content links), JustWatch/Watchmode API (availability), IP geolocation service | Redis (short TTL), Firestore (content-availability mapping) |
| **Ratings Aggregation API** | Fetch external ratings (IMDB, Rotten Tomatoes, Metacritic) + community ratings | OMDb API (IMDB), Rotten Tomatoes API, Metacritic scraper, Firestore (community) | Redis (short TTL for external), Firestore (community ratings) |
| **Videos API** | Fetch trailers, behind-the-scenes, clips | YouTube Data API, TMDB (video links) | Firestore or Redis (video metadata) |
| **Community Ratings API** | Store/retrieve user ratings, compute community averages (Premium) | Firestore (user ratings collection) | Firestore (source of truth) |

### Data Layer

#### Firestore Collections

| Collection | Purpose | Key Fields | Indexed For |
|-----------|---------|-----------|------------|
| `users` | User identity and preferences | `uid`, `email`, `displayName`, `favorites[]`, `watchlist[]`, `theme`, `language`, `premiumStatus` | Auth lookups, favorites/watchlist queries |
| `user_ratings` | Community ratings (Premium feature) | `uid`, `contentId`, `contentType`, `rating`, `timestamp` | Compute averages by contentId |
| `movie_embeddings` | Vector search cache for semantic search | `tmdbId`, `title`, `embedding`, `description`, `genres`, `year` | Vector nearest-neighbor search |
| `content_streaming_map` | Streaming availability by geo | `tmdbId`, `geo`, `platforms[]`, `lastUpdated` | Query by (tmdbId, geo) |
| `user_search_cache` | Recent searches for autocomplete / UI state | `uid`, `query`, `results[]`, `timestamp` | User queries |

#### Third-Party Integrations

| Service | Purpose | Rate Limit Impact | Cache Strategy |
|---------|---------|-------------------|-----------------|
| **TMDB API** | Core movie/TV metadata (descriptions, cast, genres, images) | 40 req/10s | Long TTL (24h), per-title basis |
| **YouTube Data API** | Trailer/video content links | 10k quota/day | Long TTL (24h), cached in Firestore |
| **Gemini AI** | LLM fallback for complex queries | ~$0.075/1M tokens | Only for queries NOT resolved by embedding search |
| **JustWatch/Watchmode API** | Real-time streaming availability | Variable | Short TTL (6h), per-title geo-availability |
| **OMDb API** | IMDB ratings aggregation | 100k req/day | Short TTL (24h) to balance freshness vs cost |
| **Rotten Tomatoes / Metacritic** | Critic ratings | N/A (via scraping/API) | Medium TTL (7d), verified occasionally |
| **Firebase Auth** | User authentication (Google OAuth + email/password) | None (internal) | Session tokens in localStorage |
| **RevenueCat** | Subscription management | None (client-side SDK) | Premium status cached locally, verified on app load |

## Data Flow

### 1. Natural Language Search (Hybrid AI - Core Innovation)

```
User enters: "I want a dark thriller with a twist ending"
     ↓
[Client] Convert to embedding (lightweight client-side or server)
     ↓
[Search API] Query Firestore vector index for k-nearest embeddings
     ↓
Top 10 results found? → Return with confidence scores [80%+ match]
     ↓ No good matches (confidence < 80%)
[Search API] Fall back to Gemini LLM for semantic understanding
     ↓
Gemini parses mood/genre/mood, returns structured query → TMDB search
     ↓
[Content API] Fetch from TMDB, generate embedding, cache result
     ↓
Return results to client, sorted by relevance
```

**Confidence Assessment:**
- HIGH confidence on vector search fundamentals (Firebase docs + multiple implementations)
- MEDIUM confidence on exact fallback threshold (80% is industry standard but not Lumi-specific)

### 2. Streaming Availability Lookup

```
User views detail page for "Inception"
     ↓
[Detail Page] User location detected via IP geolocation
     ↓
[Availability API] Query Firestore for (tmdbId, geo) mapping
     ↓
Found in cache AND < 6h old? → Return immediately
     ↓ Cache miss or stale
[Availability API] Call JustWatch/Watchmode API for live data
     ↓
[Availability API] Update Firestore cache with platforms + TTL
     ↓
[Detail Page] Display: "Available on Netflix, BluTV (Turkey)"
     ↓
[Platform Deep-Link] User clicks → Direct to Netflix/BluTV play page
```

**Rate Limit Optimization:**
- Client specifies geo once (on first page load)
- Availability cached per-movie per-geo (prevents repeated API calls for same user viewing multiple movies)
- Batch availability requests where possible (e.g., on Browse page, fetch top 20 in parallel)

### 3. Community Ratings (Premium Feature)

```
User (Premium) submits rating: 4.5/5 for "Oppenheimer"
     ↓
[Client] Optimistic UI update (show rating immediately)
     ↓
[Community Ratings API] Write to Firestore `user_ratings` collection
     ↓
[Aggregation function] Triggered by Firestore write
     ↓
[Aggregation] Recompute average for contentId="Oppenheimer"
     ↓
[Content Detail Cache] Update cached detail with new community avg
     ↓
[Pubsub or polling] Other users viewing same movie see updated rating
```

**Consistency Model:**
- Firestore strong consistency (writes visible immediately to reader)
- Aggregation computed asynchronously (eventual consistency for averages, acceptable delay 1-2s)
- User's own rating shown optimistically before write confirmed

### 4. Content Enrichment Pipeline

```
TMDB returns: {id: 550, title: "Fight Club", description: "...", genres: ["Drama"]}
     ↓
[Content API] Enrich with:
  - YouTube API → fetch trailer link
  - OMDb API → fetch IMDB rating
  - Rotten Tomatoes → critic score
  - Firestore → community rating (if exists)
  - Availability API → streaming platforms
     ↓
[Caching Layer] Store enriched record in Firestore + Redis
     ↓
[Client] Receives full detail object with all scores
```

**Caching Strategy Specifics:**
- TMDB cache: 24h (rarely changes)
- Availability cache: 6h (platforms shift, but not hourly)
- Ratings cache: 12h for external (critic scores static), real-time for community (Firestore reads)

## Architecture Patterns

### Pattern 1: Hybrid AI Search (Embedding + LLM Fallback)

**What:** Two-tier search approach using vector embeddings as the primary path and LLM as fallback for complex queries.

**When:** This is Lumi's core differentiator. Use this for:
- Natural language queries from search bar
- Mood-based recommendations
- Complex genre/mood/tone combinations

**Implementation Flow:**

```typescript
// api/search.js (Vercel serverless)
export default async (req, res) => {
  const { query } = req.body;

  // Step 1: Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Step 2: Vector search in Firestore
  const candidates = await firestoreQuery()
    .collection('movie_embeddings')
    .nearestNeighbor('embedding', queryEmbedding, {
      limit: 10,
      distanceMeasure: 'COSINE'
    })
    .where('score', '>', 0.75) // 75% similarity threshold
    .get();

  if (candidates.length > 0 && avgScore(candidates) > 0.80) {
    // High confidence vector results
    return res.json({ results: candidates, source: 'vector' });
  }

  // Step 3: LLM fallback for low-confidence queries
  const geminiResults = await gemini.generateContent({
    prompt: `User wants: "${query}". Suggest 10 movies/shows matching this mood.`,
    model: 'gemini-1.5-pro'
  });

  // Parse Gemini response, fetch from TMDB, return
  return res.json({ results: geminiResults, source: 'llm' });
};
```

**Why This Pattern:**
- Cost Control: 80% of queries resolved via embedding search (cheap, ~$0.0001 per query)
- Accuracy: LLM captures nuanced queries embedding search misses
- Latency: Embedding search sub-100ms, LLM fallback only when needed (add ~2-3s, acceptable for complex queries)

### Pattern 2: Caching Layer with Tiered TTL

**What:** Multi-level cache strategy respecting API terms, balancing freshness vs. cost.

**When:** All external API calls should be cached. Different TTLs for different data types.

```
Layer 1: Browser Cache (localStorage)
  - User preferences, theme, language: permanent (until cleared)
  - Search history: 7 days

Layer 2: Firestore Cache (server-side)
  - TMDB content metadata: 24h
  - Streaming availability: 6h
  - External ratings: 12h
  - Community ratings: real-time (Firestore consistency)

Layer 3: Redis (optional, for high-traffic items)
  - Trending page results: 1h
  - Popular movie detail enrichment: 12h
```

**Why This Pattern:**
- TMDB terms: "Cache only for reasonable periods" → 24h is reasonable for metadata
- Cost: Reduces API calls by 80-90% for returning users
- Availability data: 6h TTL balances freshness (platform deals change daily) with cost (1 API call per movie per day)

### Pattern 3: Geo-Aware Availability Aggregation

**What:** Detect user location once, cache availability mappings per geography.

**When:** Show streaming platforms available in user's location.

```typescript
// On app load
const userGeo = await detectGeo(); // IP geolocation, ~5ms
sessionStorage.setItem('userGeo', userGeo); // "Turkey", "US", etc.

// When user views detail page
const availabilityKey = `${movieId}:${userGeo}`;
const cached = await firestore
  .collection('content_streaming_map')
  .doc(availabilityKey)
  .get();

if (cached.exists && !isStale(cached.data.lastUpdated)) {
  return cached.data.platforms; // ["Netflix", "BluTV"]
}

// Cache miss → fetch from Watchmode API
const platforms = await watchmodeAPI.search(movieId, userGeo);
await firestore.collection('content_streaming_map')
  .doc(availabilityKey)
  .set({
    platforms,
    lastUpdated: Date.now(),
    geo: userGeo
  });
```

**Why This Pattern:**
- Single geo detection per session (saves API calls)
- Streaming availability is geo-locked (Netflix US ≠ Netflix Turkey)
- Cache key includes geo (prevents serving wrong data to users in different regions)

### Pattern 4: Asynchronous Aggregation (Community Ratings)

**What:** Write ratings immediately (optimistic), compute aggregates asynchronously.

**When:** Premium community features where eventual consistency is acceptable.

```typescript
// Client submits rating
POST /api/community/rating
{
  contentId: "550",
  contentType: "movie",
  rating: 4.5,
  uid: "user123"
}

// Server: Write immediately, return optimistic response
Firestore.collection('user_ratings').add({
  uid,
  contentId,
  rating,
  timestamp
});
res.json({ success: true, rating: 4.5 }); // Immediate response

// Trigger: Firestore Cloud Function watches 'user_ratings'
onUpdate('user_ratings', async (change) => {
  const newRating = change.after.data();

  // Aggregate in background
  const ratings = await firestore
    .collection('user_ratings')
    .where('contentId', '==', newRating.contentId)
    .get();

  const avg = ratings.docs.reduce((sum, doc) =>
    sum + doc.data().rating, 0) / ratings.docs.length;

  // Update content cache with new average
  await firestore
    .collection('movie_embeddings')
    .doc(newRating.contentId)
    .update({ communityRating: avg });
});
```

**Why This Pattern:**
- No user wait time (write returns immediately)
- Reads eventually see updated average (1-2s delay acceptable for ratings)
- Scales: Multiple writes → single aggregation (reduces compute cost vs per-write calculation)

### Pattern 5: Separation of Concerns (SPA + Serverless)

**What:** Client handles UI/UX state. Server handles data composition and API orchestration.

**When:** Always. This is the foundational SPA pattern.

**Client Responsibilities:**
- Render search form, detail page, browse carousel
- Manage local state (current page, filters, scroll position, dark mode)
- Optimistic UI updates (rating submitted, favorited status)
- Route navigation between pages

**Server Responsibilities:**
- Orchestrate multiple API calls (TMDB + YouTube + OMDb + Watchmode)
- Compose enriched response objects
- Cache management (deciding what to cache and for how long)
- Rate limiting and API credential management
- Fallback logic (retry, circuit breaker, LLM fallback)

```typescript
// Client: Simple, stateless render
document.querySelector('.detail').innerHTML = `
  <img src="${movie.posterUrl}" />
  <h1>${movie.title}</h1>
  <p>Community Rating: ${movie.communityRating}/5</p>
  <p>Streaming on: ${movie.availability.platforms.join(', ')}</p>
`;

// Server: Complex orchestration, hidden from client
GET /api/content/detail/550
  ├─ TMDB API: Get core metadata
  ├─ YouTube API: Get trailer
  ├─ OMDb API: Get IMDB rating
  ├─ Firestore: Get community rating
  ├─ Watchmode API: Get availability
  └─ Return: Single enriched object
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Client-to-API Calls for Third-Party Services

**What:** Client JavaScript directly calls TMDB, YouTube, OMDb APIs.

**Why Bad:**
- Exposes API keys to client (security risk)
- No caching layer (repeated requests to same data)
- No rate limiting control (user could spam API)
- Can't implement fallback logic

**Instead:**
- Route all external API calls through Vercel serverless
- Server manages credentials, caching, rate limiting
- Client only talks to `/api/*` endpoints

### Anti-Pattern 2: Storing All Ratings in Single Document

**What:** One Firestore document contains all community ratings for a movie: `{ "550": [4.5, 5, 3, ...] }` with nested array of 10k+ ratings.

**Why Bad:**
- Document size limits (1MB soft limit per doc)
- Contentious writes (multiple users rating same movie at once → conflicts)
- Inefficient aggregation (must load entire array to compute average)

**Instead:**
- Separate collection: `user_ratings { uid, contentId, rating, timestamp }`
- Cloud Function aggregates on writes (eventual consistency acceptable)
- Query by `contentId` for efficient filtering

### Anti-Pattern 3: Embedding Search Without Fallback

**What:** Use only vector embeddings, assume every query can be expressed numerically.

**Why Bad:**
- Queries like "movies where the main character is an architect" don't embed well
- Edge cases: Very niche genres, specific actor combinations
- Creates poor UX when search returns no results

**Instead:**
- Implement LLM fallback for <80% confidence embeddings
- User doesn't notice the difference; always gets results

### Anti-Pattern 4: No Geo-Awareness in Availability

**What:** Cache streaming availability globally: `{ "550": ["Netflix", "BluTV"] }` without tracking location.

**Why Bad:**
- Netflix content differs by country (licensing deals)
- User in Turkey sees US Netflix content (impossible)
- Misleading recommendations

**Instead:**
- Geo-code all availability caches: `{ "550:Turkey": [...], "550:US": [...] }`
- Detect user location once per session
- Always query with (contentId, geo) tuple

### Anti-Pattern 5: Syncing Community Ratings to Detail Page in Real-Time Without Batching

**What:** Every time a user rates, immediately push to all other users viewing detail page via WebSocket/Pubsub.

**Why Bad:**
- High latency operations (Firestore write → aggregate → broadcast)
- Expensive at scale (1000 users all watching same popular movie)
- Adds complexity to client (must handle incoming updates)

**Instead:**
- Poll aggregated average on a fixed interval (e.g., every 10s)
- Or: Use eventual consistency (page refresh shows updated rating)
- Reserve real-time features for Premium tier if warranted

## Scalability Considerations

| Concern | At 1K users | At 10K users | At 100K users |
|---------|------------|--------------|---------------|
| **Search Volume** | ~100 queries/hr | ~1000 queries/hr | ~10K queries/hr |
| Approach | Embedding search for 80%, LLM fallback for 20% | Same, but cache embedding results aggressively (6h TTL) | Same, add Redis layer for popular queries |
| **Detail Page Load** | Compose from 5 APIs per view (~2s) | Cache enriched details (12h TTL) | Separate contentId into base + enrichment microservices |
| **Community Ratings** | Real-time Firestore reads (strong consistency) | Aggregate async, cache for 5m | Move aggregates to separate collection, update via Cloud Task scheduler |
| **Availability Data** | 6h cache per (movie, geo) | Same, but shard by geo (EU cache separate from US) | CDN cache availability responses, separate Firestore collection per region |
| **Storage** | Firestore document size fine | Add indexes on (contentId, geo) for efficient queries | Archive old ratings to BigQuery for analytics |

## Build Order Implications

### Phase 1: Establish Core Data Layer & Search Foundation
**Dependencies:** None (starting point)
**Build Order:**
1. Set up Firestore collections (`users`, `movie_embeddings`, `content_streaming_map`, `user_ratings`)
2. Implement basic Vercel API routes: `/api/content/detail` (TMDB + YouTube enrichment)
3. Implement embedding generation for movie metadata (generate once, cache in Firestore)
4. Implement vector search API: `/api/search/hybrid` (embedding → LLM fallback)

**Why First:** Vector search is the core differentiator. Without it, the app is just another title search. Foundation for all subsequent features.

**Output:** Users can search naturally (e.g., "dark thriller with twist") and get results.

### Phase 2: Availability & Ratings Aggregation
**Dependencies:** Core data layer from Phase 1
**Build Order:**
1. Implement `/api/availability` (Watchmode/JustWatch integration + geo-aware caching)
2. Implement `/api/ratings` (OMDb + community ratings aggregation)
3. Update detail page to display availability + all rating sources
4. Add Community Ratings API: `/api/community/rating` (write to Firestore, trigger aggregation)

**Why Second:** Depends on detail page infrastructure from Phase 1. These features enhance the detail page without changing search fundamentals.

**Output:** Detail pages show where to watch + aggregated ratings (IMDB, Rotten Tomatoes, community).

### Phase 3: Caching & Performance Optimization
**Dependencies:** Core functionality from Phases 1-2
**Build Order:**
1. Implement Redis caching for high-traffic endpoints (trending, popular)
2. Implement cache invalidation (TTL + event-driven)
3. Add client-side caching (localStorage for user prefs, session cache for recent searches)
4. Monitor API hit rates and adjust TTL based on data

**Why Third:** Only optimize after functionality is stable. Premature caching adds complexity without clear payoff.

**Output:** App response time <500ms for cached queries, reduced API cost by 80%.

### Phase 4: Premium Features & Advanced Aggregation
**Dependencies:** All above + authentication/subscription (already exists)
**Build Order:**
1. Implement Cloud Functions for async rating aggregation
2. Implement platform drop notifications (track availability changes, notify Premium users)
3. Implement full trivia access (Premium tier, gated in detail page)
4. Implement advanced filtering (Premium: by critic score, streaming service, etc.)

**Why Fourth:** Depends on everything below. Premium features enhance existing core without changing it.

**Output:** Premium users get notifications, advanced filtering, exclusive content.

## Component Dependencies

```
Phase 1: Search Foundation
  └─ Firestore collections
  └─ Embedding generation + storage
  └─ Hybrid search API (embedding + LLM fallback)

Phase 2: Enrichment & Community
  ├─ Depends on: Phase 1
  └─ Availability API (geo-aware caching)
  └─ Ratings aggregation API
  └─ Community ratings write API

Phase 3: Performance
  ├─ Depends on: Phases 1-2
  └─ Redis caching layer
  └─ Cache invalidation strategy
  └─ Client-side caching optimization

Phase 4: Premium
  ├─ Depends on: All above
  └─ Async aggregation (Cloud Functions)
  └─ Notifications system
  └─ Advanced filtering UI
```

## Critical Implementation Notes

### Embedding Generation Strategy

- **When to generate:** During Phase 1 backfill (all TMDB movies), then on new releases
- **Model:** Use Google's `textembedding-gecko` (free tier available via Vertex AI)
- **Dimension:** 768 dimensions (standard for gecko)
- **Update frequency:** Batch generate weekly for new releases, store in Firestore with ttl trigger

### API Orchestration in Vercel

Vercel serverless has a 10-15 second timeout for Hobby/Pro plans. For detail page enrichment (5 parallel API calls):

```typescript
// Good: Parallel requests with timeout
const [tmdb, youtube, omdb, availability, community] = await Promise.all([
  fetchTMDB(movieId).catch(() => null),
  fetchYouTube(movieId).catch(() => null),
  fetchOMDb(movieId).catch(() => null),
  fetchAvailability(movieId, geo).catch(() => null),
  fetchCommunityRating(movieId).catch(() => null)
]);

// Returns partial data if 1 API fails, still responsive
return { tmdb, youtube, omdb, availability, community };
```

This pattern ensures graceful degradation: if OMDb is down, user still sees TMDB + availability.

### Community Ratings: Eventual Consistency Model

Expected behavior:
- User submits rating → immediately optimistic update on their screen
- Other users viewing same movie: rating appears in 1-2 seconds (Cloud Function aggregation)
- This is acceptable for a discovery app (not a real-time gaming leaderboard)

If real-time consistency is required later, move to Realtime Database (slower queries but instant updates).

## Sources

### Vector Search & Embeddings
- [Firebase Vector Search Documentation](https://firebase.google.com/docs/firestore/vector-search)
- [Google Cloud Blog: Firestore Vector Similarity Search](https://cloud.google.com/blog/products/databases/get-started-with-firestore-vector-similarity-search)
- [How to Implement Vector Search in Firestore](https://oneuptime.com/blog/post/2026-02-17-how-to-implement-vector-search-in-firestore-for-ai-powered-similarity-matching/view)
- [Movie Recommendations using Vector Database](https://superlinked.com/vectorhub/articles/movie-recommendation-using-vectordb)
- [Building Movie Recommendation with ScyllaDB Vector Search](https://www.scylladb.com/2025/10/21/building-a-movie-recommendation-app-with-scylladb-vector-search/)

### Streaming Availability & Aggregation
- [Watchmode API](https://api.watchmode.com/)
- [How Streaming Aggregators Work](https://blog.bitmar.com/2025/12/how-do-streaming-aggregators-work.html)
- [Streaming Service Aggregator Database Structure](https://www.databasesample.com/database/streaming-service-aggregator-database)
- [API Aggregation: Combining Multiple APIs](https://api7.ai/learning-center/api-101/api-aggregation-combining-multiple-apis)

### Community Ratings & Database Design
- [Relational Database Design for Reviews & Ratings](https://www.geeksforgeeks.org/sql/how-to-design-a-relational-database-for-customer-reviews-and-ratings-platform/)
- [MongoDB Schema Design for Ratings](https://www.mongodb.com/community/forums/t/schema-design-for-ratings-system/8891)

### Caching Strategies
- [Caching Best Practices in REST API Design](https://www.speakeasy.com/api-design/caching)
- [Caching Strategies Across Application Layers](https://dev.to/budiwidhiyanto/caching-strategies-across-application-layers-building-faster-more-scalable-products-h08)
- [Complete Cache Strategy Guide](https://shinagawa-web.com/en/blogs/cache-strategy-optimization)
- [Cache Optimization: Strategies to Cut Latency](https://redis.io/blog/guide-to-cache-optimization-strategies/)

### Vercel & Serverless Patterns
- [T4 Stack: Next.js + Vercel AI SDK + Local RAG](https://www.sitepoint.com/t4-stack-nextjs-16-vercel-ai-sdk-local-rag-tutorial/)
- [Vercel AI Review 2026](https://www.truefoundry.com/blog/vercel-ai-review-2026-we-tested-it-so-you-dont-have-to/)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)

### SPA Architecture
- [What is a Single Page Application](https://softwaremind.com/blog/what-is-single-page-application-spa/)
- [Architecture of SPA](https://developerhandbook.stakater.com/frontend/architecture/spa-applications-architecture.html)
- [Principles of Building Single-Page Applications](https://www.linkedin.com/pulse/principles-building-single-page-applications-spas-ratko-%C4%87osi%C4%87)
- [SPA + REST as Abstraction](https://www.caktusgroup.com/blog/2019/12/19/single-page-application-rest-abstraction/)

### AI Discovery Systems
- [Akta's AI-First Video Platform](https://www.tvtechnology.com/infrastructure/ces-aktas-ai-first-video-platform-adds-new-capabilities)
- [What Is AI Video Discovery (2026 Guide)](https://www.momentslab.com/blog/what-is-ai-video-discovery-an-updated-guide-for-2026)
- [Netflix's Generative AI-Powered Search](https://techcrunch.com/2025/05/07/netflix-debuts-its-generative-ai-powered-search-tool/)
