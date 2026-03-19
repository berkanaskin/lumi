# Phase 2: Hybrid AI Search - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Natural language movie/TV discovery via hybrid AI search (embedding-based semantic search + LLM fallback). Includes autocomplete enhancement for title/actor/genre search, personalized recommendations from watchlist, diversity injection, and API cost monitoring. Does NOT include streaming availability, ratings aggregation, or premium features — those are Phases 3 and 4.

</domain>

<decisions>
## Implementation Decisions

### Search UX Flow
- Submit-then-results: User writes query, presses Enter/submit, results appear as poster grid
- No streaming/real-time results — full batch after submit
- Empty/ambiguous queries show closest matches with explanation (not "no results" wall)
- Search history saved silently for personalization — not displayed to user
- Existing autocomplete (search.js) enhanced — faster, prettier, poster thumbnails — not rewritten
- Film search and AI search remain separate sections (carried from Phase 1)

### Recommendation Quality
- Infinite scroll: First 12 results load, more load as user scrolls down
- Diversity injection in separate section: "Belki de bunu beğenirsin" / "You might also like" section with results outside user's typical genres
- Result cards show: poster, title, year, genre, TMDB rating (poster + basic info, no AI explanation per card)

### Personalization Depth
- Watchlist-based: Derive user preferences from watchlist + favorites content
- Active immediately after login — no minimum threshold needed
- Search history used silently for preference enrichment (not shown to user)
- No rating-based or behavior-tracking personalization in v1

### Cost Dashboard
- Admin-only panel at hidden route (e.g., /admin or similar)
- Metrics: Claude's discretion for v1 — at minimum: total embedding calls, total LLM calls, estimated cost, embedding vs LLM ratio

### Claude's Discretion
- Embedding pipeline architecture (batch vs on-demand generation)
- Firestore vector index configuration details
- LLM fallback threshold (confidence score cutoff)
- Cost dashboard specific metrics beyond the minimum
- Exact autocomplete enhancement details (debounce timing, poster thumbnail size)
- Infinite scroll batch size and loading behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing AI Search
- `src/features/discover.js` — Current Gemini AI search (handleAISearch), mood/era mappings, poetic placeholders
- `api/gemini.js` — Existing Gemini server-side proxy (Edge runtime)
- `src/services/api.js` — API service layer (TMDBService, YouTubeService)

### Search Feature
- `src/features/search.js` — Current autocomplete and title search implementation
- `src/lib/constants.js` — Genre mappings, mood genres, daily recommendation constants

### State & Data
- `src/lib/state.js` — Global state with watchlist/favorites data (personalization source)
- `services/auth.js` — Firebase auth + Firestore (user data storage)
- `src/config.js` — Environment variables and API configuration

### Research
- `.planning/research/STACK.md` — OpenAI text-embedding-3-small, Firestore vector search, Vercel AI SDK
- `.planning/research/ARCHITECTURE.md` — Hybrid search architecture, caching patterns
- `.planning/research/PITFALLS.md` — Filter bubble risk, embedding degradation, API cost spiral

### Design System (from Phase 1)
- `src/styles/tokens.css` — Design tokens for consistent styling
- `src/styles/cards.css` — Movie card styling (poster-dominant pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/discover.js`: Gemini AI search already works — MOOD_GENRES, POETIC_PLACEHOLDERS, handleAISearch()
- `src/features/search.js`: Autocomplete with debounce — enhance, don't rewrite
- `src/services/api.js`: TMDBService with search, discover, trending — extend with vector search endpoint
- `api/gemini.js`: Vercel Edge Function proxy for Gemini — model for new embedding/search endpoints
- `src/ui/movie-card.js`: Poster-dominant card with hover overlay — reuse for search results
- `src/lib/state.js`: Watchlist/favorites in state — read for personalization signals

### Established Patterns
- API calls through Vercel Edge Functions (api/*.js) — new embedding/search endpoints follow same pattern
- Feature modules export init functions called from main.js
- DOM-centric rendering with innerHTML templates + event delegation
- localStorage + Firestore dual persistence

### Integration Points
- `src/main.js` — Add search initialization for new hybrid system
- `api/` directory — New Edge Functions for embedding generation and vector search
- `src/config.js` — New environment variables for OpenAI API key
- Firestore — New collection for movie embeddings + vector index

</code_context>

<specifics>
## Specific Ideas

- Hybrid search ratio target: 80% embedding / 20% LLM (from project research)
- Cost target: ~$60-180/year at 10K searches/month
- Poetic Turkish placeholders already exist in discover.js — maintain this character
- "Belki de bunu beğenirsin" diversity section should feel like a friendly suggestion, not an ad

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-hybrid-ai-search*
*Context gathered: 2026-03-20*
