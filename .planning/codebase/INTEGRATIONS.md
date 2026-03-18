# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Movie/TV Data:**
- TMDB (The Movie Database) - Primary data source for movie/TV show information
  - SDK/Client: Direct API calls via fetch in `src/services/api.js` (TMDBService)
  - Auth: API key via `VITE_TMDB_API_KEY` (public, rate-limited)
  - Endpoints: https://api.themoviedb.org/3
  - Image CDN: https://image.tmdb.org/t/p
  - Features: search, discover, trending, details, collections, genres, ratings

- OMDb (Open Movie Database) - IMDb ratings, Rotten Tomatoes, Metacritic scores
  - SDK/Client: Direct API calls (planned for ratings service)
  - Auth: API key via `VITE_OMDB_API_KEY`
  - Endpoints: https://www.omdbapi.com
  - Integrated in: `src/services/api.js` (RatingsService - stub implementation)

**Video Content:**
- YouTube Data API - Movie trailers and related videos
  - SDK/Client: Direct API calls via fetch in `src/services/api.js` (YouTubeService)
  - Auth: API key via `VITE_YOUTUBE_API_KEY` (public, rate-limited)
  - Endpoints: https://www.googleapis.com/youtube/v3
  - Features: search videos, get video details

- YouTube Embed - Video player integration
  - Method: Embedded iframe player in detail page modal
  - Implementation: `src/features/detail.js` (playVideo function)
  - No API key required for player

**AI & Recommendations:**
- Google Gemini AI - AI-powered movie discovery and recommendations
  - SDK/Client: Server-side proxy at `/api/gemini` (Vercel serverless function)
  - Auth: `GEMINI_API_KEY` (server-side only, never exposed to client)
  - Endpoints: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
  - Model: `gemini-2.0-flash` (default)
  - Features: generating movie recommendations based on user preferences/prompts
  - Implementation: `api/gemini.js` (Edge runtime, POST only)
  - Generation Config: temperature=0.9, topK=40, topP=0.95, maxOutputTokens=2048
  - Usage: `src/features/discover.js` (handleAISearch function)

**External Services (Planned/Infrastructure):**
- RapidAPI - Potential multi-API aggregation service
  - Auth: `RAPIDAPI_KEY` (server-side proxy: `/api/rapidapi`)
  - Status: Infrastructure in place but not actively used

- RevenueCat - In-app subscription management
  - Auth: `REVENUECAT_API_KEY` (server-side proxy: `/api/revenuecat`)
  - Status: Infrastructure in place but not actively used

## Data Storage

**Databases:**
- Firebase Firestore - Primary user data and preferences
  - Connection: Initialized via Firebase SDK in `services/auth.js`
  - Client: Firebase SDK (firebase-firestore-compat v10.7.1)
  - Collections: `users` (user profiles, tier status, preferences)
  - Usage: Store user tier (free/premium), favorites, watchlist, user ratings
  - Implementation: `services/auth.js` (fetchUserTier, upgradeToPremium), `src/features/profile.js` (saveUserRating, getUserRating)

**File Storage:**
- Local filesystem only for client-side (localStorage and sessionStorage)
  - localStorage key: `lumi_user` - persists user session and preferences
  - No external file storage detected (S3, GCS, etc.)

**Caching:**
- HTTP caching via Cache-Control headers in Vercel Functions
  - TMDB requests: `s-maxage=3600, stale-while-revalidate=86400` (1 hour fresh, 24 hour stale)
  - YouTube requests: Same caching policy
  - Browser caching: Standard HTTP headers, no service worker detected

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication - Primary user identity system
  - Implementation: `services/auth.js` (AuthService class singleton)
  - Providers supported:
    - Google (OAuth2 with popup flow)
    - Email/Password (Firebase native)
    - Mock/Demo accounts for testing (local-only)
  - Features: Registration, login, logout, profile sync, Firestore user documents
  - State persistence: localStorage backup (`lumi_user`) with Firebase as source of truth

**Session Management:**
- Firebase auth state change listeners in `services/auth.js`
- Custom event dispatch: `authStateChanged` event fired on auth state changes
- Fallback: Local storage for offline/mock mode

**Tester Accounts:**
- Mock login (local development when Firebase unavailable)
- Tester Premium account (testing premium features)
- Tester Free account (testing free tier limits)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, LogRocket, or similar service integrated
- Console logging only: `console.error()` and `console.warn()` throughout codebase

**Logs:**
- Browser console logging with service prefixes: `[Lumi]`, `[TMDB]`, `[YouTube]`, `[Gemini Proxy]`, `[Firebase]`
- Development mode: Enhanced logging with version and initialization details
- No centralized logging service detected

## CI/CD & Deployment

**Hosting:**
- Vercel (indicated by `.vercel/` directory and serverless function pattern)
- Static site hosting with Edge Functions for API proxies
- Edge runtime configuration in `/api/` functions for low-latency global distribution

**CI Pipeline:**
- GitHub Actions (infrastructure in place in `.github/` directory)
- Status: Build/test automation likely configured, details not examined

**Deployment Configuration:**
- Vercel project config: `.vercel/project.json`
- Build command: `npm run build` (Vite build)
- Output directory: `dist/`

## Environment Configuration

**Required env vars (Client-Side):**
- `VITE_TMDB_API_KEY` - The Movie Database API access
- `VITE_YOUTUBE_API_KEY` - YouTube Data API access
- `VITE_FIREBASE_API_KEY` - Firebase project API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase authentication domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project identifier
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase Cloud Storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Cloud Messaging identifier
- `VITE_FIREBASE_APP_ID` - Firebase application identifier
- `VITE_FIREBASE_MEASUREMENT_ID` - Google Analytics measurement ID

**Server-Side Only (Vercel Functions):**
- `GEMINI_API_KEY` - Google Gemini AI API access (CRITICAL: never client-side)
- `RAPIDAPI_KEY` - RapidAPI platform authentication (optional)
- `REVENUECAT_API_KEY` - RevenueCat subscription management (optional)

**Secrets Location:**
- Development: `.env` and `.env.local` (git-ignored)
- Production: Vercel Environment Variables dashboard
- Never committed: All secret files in `.gitignore`

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints configured for external services

**Outgoing:**
- CORS enabled on all API proxy functions:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, OPTIONS` (Gemini proxy)
  - `Access-Control-Allow-Headers: Content-Type`
  - Indicates browser-based client consumption

## API Proxy Architecture

**Purpose:**
- Hide server-side keys (Gemini)
- Add caching layer for rate-limited public APIs (TMDB, YouTube)
- Centralize API orchestration

**Proxy Functions:**
- `api/gemini.js` - Gemini AI requests (POST only, Edge runtime)
- `api/tmdb.js` - TMDB requests (transparent passthrough with caching, Edge runtime)
- `api/youtube.js` - YouTube requests (transparent passthrough with caching, Edge runtime)

**Proxy Pattern:**
- Client sends request to `/api/{service}?endpoint=/v3/...&...params`
- Proxy appends API key and forwards to external service
- Proxy adds caching headers and CORS headers
- Response returned to client as JSON

---

*Integration audit: 2026-03-18*
