# External Integrations

**Analysis Date:** 2026-05-07

## APIs & External Services

**Movie/TV Data:**
- TMDB (The Movie Database) - Primary movie/TV metadata source
  - Client: `src/services/api.js` (TMDBService) → proxy `/api/tmdb`
  - Auth: `VITE_TMDB_API_KEY` (also injected server-side by proxy)
  - Endpoints: https://api.themoviedb.org/3, image CDN https://image.tmdb.org/t/p
  - Features: search, discover, trending, movie/TV details, collections, genres, credits (used for new crew section: Director, Writer, Producer in `src/features/detail.js`)

- OMDb - IMDb / Rotten Tomatoes / Metacritic ratings
  - Client: proxy `/api/omdb` (Edge runtime)
  - Auth: `VITE_OMDB_API_KEY` server-injected
  - Used by: `src/services/api.js` (RatingsService)

**Video Content:**
- YouTube Data API v3 - Trailers, related videos
  - Client: `src/services/api.js` (YouTubeService) → proxy `/api/youtube` (Edge)
  - Auth: `VITE_YOUTUBE_API_KEY`
  - Features: video search, video details
- YouTube Embed - in-app trailer playback (iframe), no API key needed

**AI & Recommendations:**
- Google Gemini AI - generative recommendations
  - Proxy: `api/gemini.js` (Edge runtime, POST only)
  - Model: `gemini-2.5-flash` (hardcoded URL: `v1beta/models/gemini-2.5-flash:generateContent`)
  - Auth: `GEMINI_API_KEY` (server-only)
  - Recent work: simplified — Gemini billing enabled, no fallback path; retry-on-rate-limit (5s wait, then retry once)
  - Used by: `src/features/discover.js` (handleAISearch)

- Vercel AI SDK + AI Gateway - structured LLM calls
  - Function: `api/search.js` (Node.js runtime, `maxDuration: 30`)
  - Model: `gemini-2.5-flash-lite` via `@ai-sdk/google`
  - Auth: `AI_GATEWAY_API_KEY` (Vercel AI Gateway routing)
  - Used by: `src/pages/search-results.js` semantic search

- OpenAI Embeddings - vector search backbone
  - Function: `api/embeddings.js` (Node.js runtime)
  - Model: `text-embedding-3-small`
  - Auth: `OPENAI_API_KEY`
  - Storage: Firestore (admin SDK writes embedding vectors + metadata)

**Streaming Availability:**
- RapidAPI - Streaming Availability service
  - Function: `api/streaming-availability.js` (Edge runtime)
  - Endpoint: `https://streaming-availability.p.rapidapi.com/shows/{imdbId}?country=...&series_granularity=show`
  - Auth: `RAPIDAPI_KEY` (server-only), `X-RapidAPI-Host: streaming-availability.p.rapidapi.com`
  - Cache layer: `src/services/streaming-cache.js`

**Geolocation:**
- Vercel Geo (Edge) - country detection for streaming providers
  - Function: `api/geoip.js` (Edge runtime, reads `request.geo`)
  - Used to default `country` param for streaming-availability calls

**Cost / Ops:**
- `api/cost-dashboard.js` (Node.js runtime) - aggregates per-feature LLM/API spend, reads from Firestore admin

**Subscriptions (planned, infra in place):**
- RevenueCat - mobile in-app subscription management
  - Auth: `REVENUECAT_API_KEY` (server-only)
  - Status: env var slot reserved; no active proxy file in `api/`

## Data Storage

**Databases:**
- Firebase Firestore - primary user data + LLM caches
  - Client SDK: `firebase` 12.7.0 (modular)
  - Admin SDK: `firebase-admin` 13.7.0 (server-side, in `api/search.js`, `api/embeddings.js`, `api/cost-dashboard.js`)
  - Collections (observed): `users` (tier, favorites, watchlist, ratings), embedding/cache collections (per `api/embeddings.js`), cost tracking docs
  - Rules: `firestore.rules` (committed)
  - Indexes: `firestore.indexes.json` (committed)
  - Project config: `.firebaserc`, `firebase.json`

**File Storage:**
- Browser localStorage (`lumi_user`) - session/profile cache
- sessionStorage - transient UI state
- No external blob storage (no S3, no Vercel Blob, no Firebase Storage in active use)

**Caching:**
- Vercel Edge Cache via `Cache-Control` headers on Edge proxies
  - TMDB / YouTube / OMDb: `s-maxage=3600, stale-while-revalidate=86400`
- Streaming-availability: in-memory + Firestore-backed cache (`src/services/streaming-cache.js`)
- No service worker, no Vercel Runtime Cache yet

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Implementation: `services/auth.js` (AuthService singleton)
  - Methods: Google OAuth (popup), Email/Password, Mock/Demo (offline dev)
  - Profile sync: Firestore `users/{uid}` document
  - Local cache: `localStorage.lumi_user`
  - Event bus: `authStateChanged` custom event

**Tester Accounts:**
- Mock login (no Firebase)
- Tester Premium / Tester Free (toggle premium-gated features)

## Monitoring & Observability

**Error Tracking:**
- None integrated (no Sentry / LogRocket)
- Console-only with prefixed tags: `[Lumi]`, `[TMDB]`, `[YouTube]`, `[Gemini Proxy]`, `[Firebase]`, `[Search]`, `[Embeddings]`

**Analytics:**
- Firebase `measurementId` slot present (`VITE_FIREBASE_MEASUREMENT_ID`); no explicit Analytics calls observed
- No Vercel Web Analytics / Speed Insights wired up yet

## CI/CD & Deployment

**Hosting:**
- Vercel (`.vercel/` present, `vercel.json` committed)
- Static `dist/` + 9 serverless functions under `api/`
  - Edge runtime: `gemini`, `tmdb`, `youtube`, `omdb`, `geoip`, `streaming-availability`
  - Node.js runtime: `search` (maxDuration 30), `embeddings`, `cost-dashboard`

**Firebase:**
- Firestore rules + indexes deployed via `firebase` CLI
- `firebase.json` defines deployment targets

**CI Pipeline:**
- `.github/` directory present (workflows not deeply inspected)

## Environment Configuration

**Client (public, `VITE_`):**
- `VITE_TMDB_API_KEY`, `VITE_YOUTUBE_API_KEY`, `VITE_OMDB_API_KEY`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

**Server-only (Vercel Functions):**
- `GEMINI_API_KEY` - Gemini direct REST proxy
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway (used by `ai` SDK calls)
- `OPENAI_API_KEY` - embeddings
- `RAPIDAPI_KEY` - streaming-availability
- `FIREBASE_ADMIN_*` (service account JSON or split fields) - admin SDK
- `REVENUECAT_API_KEY` - reserved (not active)

**Secrets Location:**
- Local: `.env.local` (git-ignored)
- Production: Vercel Environment Variables dashboard
- Never committed (verified by `.gitignore`)

## Webhooks & Callbacks

**Incoming:** None configured.

**Outgoing (CORS on proxies):**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS` (Gemini, search, embeddings)
- `Access-Control-Allow-Methods: GET, OPTIONS` (TMDB, YouTube, OMDb, geoip, streaming-availability)
- `Access-Control-Allow-Headers: Content-Type`

## API Proxy Architecture

**Purpose:**
- Hide server-only secrets (Gemini, OpenAI, RapidAPI, AI Gateway, Firebase admin)
- Add Vercel Edge cache layer for rate-limited public APIs
- Centralize geolocation, cost tracking, semantic search

**Proxy / Function Map:**
| File | Runtime | Purpose |
|---|---|---|
| `api/gemini.js` | edge | Direct Gemini REST passthrough (gemini-2.5-flash) |
| `api/tmdb.js` | edge | TMDB cached passthrough |
| `api/youtube.js` | edge | YouTube cached passthrough |
| `api/omdb.js` | edge | OMDb cached passthrough |
| `api/streaming-availability.js` | edge | RapidAPI streaming-availability |
| `api/geoip.js` | edge | Country detection from request.geo |
| `api/search.js` | nodejs (maxDuration 30) | Semantic search via AI SDK + gemini-2.5-flash-lite |
| `api/embeddings.js` | nodejs | OpenAI embeddings + Firestore writes |
| `api/cost-dashboard.js` | nodejs | LLM/API spend aggregation from Firestore |

**Pattern:**
- Client → `/api/{service}?endpoint=...` → proxy injects key → external API → cached response

---

*Integration audit: 2026-05-07*
