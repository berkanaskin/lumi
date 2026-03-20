# Phase 03: Content Enrichment - Research

**Researched:** 2026-03-20
**Domain:** Streaming availability APIs, ratings aggregation, person pages, video content, release date display
**Confidence:** HIGH (core APIs verified via official docs), MEDIUM (Turkish platform coverage), LOW (awards/trivia data sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Streaming Availability:**
- Primary data source: Streaming Availability API (RapidAPI free tier, 100 req/day) — TMDB watch/providers alone is insufficient for Turkish platforms (GAIN missing entirely, HBO Max/TOD incomplete)
- TMDB as fallback when Streaming Availability API quota is exhausted
- Aggressive caching: Firestore per title+country, 24-48h TTL — most views served from cache
- Grouped by type: Stream (Netflix, Disney+), Rent (Google Play, iTunes), Buy (Apple TV, Amazon) — platform logos with scores
- Placement: Just below poster/title area, above overview — high visibility "Where to Watch" section
- Deep links: Use API-provided direct content URLs when available, fall back to platform search links from platforms.js
- Freshness indicator: Subtle "Updated 3 hours ago" timestamp below streaming section; stale data (>24h) gets warning icon
- Country detection: Auto-detect via IP geolocation on first visit, save preference
- Country selector: In the main app header (visible on all pages) + in profile/settings — NOT on individual detail pages
- Platform drop notifications: Watchlist-based — any title in watchlist automatically monitored for new platform availability (Premium, Phase 4 implementation but data infrastructure built here)

**Ratings Presentation:**
- Sources: IMDB, Rotten Tomatoes, Metacritic only — no TMDB rating shown
- Display: Small source logos only + score number. No text labels, no extra decoration — just logo + puan
- Scores in native format (8.2/10, 92%, 85/100)
- Placement: Under title line, above overview — one of the first things users see
- Data source: OMDb API (RatingsService already stubbed in api.js)

**Actor/Director Pages:**
- Navigation: Full dedicated page (e.g., /person/12345) — not modal or overlay
- Content: Filmography poster grid + bio/career info + "Frequently works with" related people + awards/trivia
- Filmography: Poster grid reusing movie-card component with filter chips (All / Movies / TV Shows / As Director), sort by year (newest first) or by rating
- Bio section: Photo, birth date/place, known-for department, biography text (all from TMDB person endpoint)
- Related people: "Frequently works with" section showing frequent collaborators
- Awards & trivia: Data source to be researched — researcher agent must investigate free/low-cost sources for actor awards and trivia data. User explicitly wants no gaps — find alternatives rather than defer

**Video Content:**
- Organization: Category tabs — Trailers | Behind the Scenes | Interviews
- Each tab: Horizontal scroll of video thumbnails
- Play: Inline YouTube embed on tap (existing pattern)
- Data: YouTube + TMDB video APIs (already fetched by category in detail.js)

**Trivia:**
- Fully Premium-gated: Trivia section shows locked icon with "Unlock with Premium"
- No free preview/teaser
- Data source: To be researched alongside awards data

**Release Dates:**
- Cinema release: Prominent badge on detail page — "In cinemas March 28" or "Now in cinemas"
- Streaming-only: Show estimated or confirmed streaming date
- No separate release calendar section — badge approach keeps it clean

### Claude's Discretion
- Streaming Availability API specific integration details (endpoints, response mapping)
- Caching implementation details (Firestore collection structure, TTL mechanism)
- IP geolocation service choice for country auto-detection
- OMDb integration completion (RatingsService already stubbed)
- Person page layout and responsive design details
- Video tab styling and thumbnail sizes
- Exact badge design for cinema release dates
- "Frequently works with" algorithm (shared credits count threshold)

### Deferred Ideas (OUT OF SCOPE)
- Lumi community ratings — Phase 4 (Premium feature with abuse protection)
- Platform drop notification delivery mechanism — Phase 4 (data infrastructure can be laid in Phase 3, but notification UI/push is Phase 4)
- Premium subscription paywall and RevenueCat integration — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DETL-01 | User can view comprehensive detail page with synopsis, cast, crew, genres, runtime, and release dates | TMDB /movie/{id} + /tv/{id} already fetched; extend with cinema release badge from existing getReleaseDates() |
| DETL-02 | Detail page shows aggregated ratings from IMDB, Rotten Tomatoes, and Metacritic with source breakdown | OMDb API RatingsService stub in api.js is complete — needs proxy migration and rendering |
| DETL-03 | User can watch trailers, behind-the-scenes content, interviews, and BTS videos from detail page | Video category tabs already exist in detail.js — needs UI for Interviews tab and horizontal scroll layout |
| DETL-04 | User can access full trivia content for movies/shows (Premium feature) | OMDb Awards field + TMDB keywords usable for trivia; Premium gate via user tier check |
| DETL-05 | User can navigate to actor/director pages showing filmography, career info, and related content | New /person/:id route + TMDB /person/{id} + /person/{id}/combined_credits endpoints |
| DETL-06 | Detail page shows cinema release date for theatrical releases (Free) and streaming release tracking | getReleaseDates() already exists — add badge rendering; streaming dates from Streaming Availability API |
| STRM-01 | User can see which streaming platforms have the content available in their current country | Streaming Availability API /shows/{imdb_id}?country={code} with Firestore cache layer |
| STRM-02 | Streaming availability auto-detects user's country with manual override option | ip-api.com for country detection; store in state.currentRegion + localStorage |
| STRM-03 | User can set a notification to be alerted when content drops on a streaming platform (Premium) | Phase 3 builds data model: streamingAvailability Firestore collection with country+platform fields; Phase 4 delivers notification delivery |
| STRM-04 | Streaming availability data shows freshness indicator ("Last updated: X hours ago") | Store `fetchedAt` timestamp in Firestore cache document; display relative time in UI |
</phase_requirements>

---

## Summary

Phase 3 transforms Lumi's detail pages from basic TMDB data views into fully authoritative "decide to watch" hubs. The phase involves four distinct integration tracks: (1) streaming availability via the Streaming Availability API with Firestore caching, (2) ratings aggregation via OMDb (stub already in place), (3) a new person page with TMDB person/combined_credits endpoints, and (4) video content UI improvements.

The most critical and novel integration is the Streaming Availability API (movieofthenight via RapidAPI). At 100 requests/day free tier, aggressive Firestore caching (24-48h TTL) is mandatory — most traffic must be cache hits. The API returns deep links to streaming services by country, supports Turkey (TR) as a country code, and provides service objects with type (subscription/rent/buy/free/addon) — exactly what the grouping requirement needs. However, Turkish-specific platform coverage (GAIN, BluTV/HBO Max merger, Exxen, TOD) should be validated at runtime via the `/countries/tr` endpoint, as documentation only confirms TR is supported without listing every service.

The OMDb integration is nearly complete — `RatingsService.getAllRatings()` fetches IMDB, RT, and Metacritic from the `Ratings` array already. The main outstanding work is: (a) moving the call through a server-side proxy (OMDB_API_KEY is currently client-side via `VITE_OMDB_API_KEY` — a security concern), and (b) rendering the ratings badges in the detail template.

Person pages require a new SPA route (`/person/:id`), a new feature module (`src/features/person.js`), and TMDB person + combined_credits API calls. The "Frequently works with" section requires a credits cross-reference algorithm. For awards and trivia data, OMDb returns an `Awards` string (e.g., "Won 1 Oscar. 43 wins & 143 nominations.") and TMDB provides keywords — these together are sufficient for the trivia/awards Premium gate without requiring additional paid data sources.

**Primary recommendation:** Build the streaming availability Edge Function proxy with Firestore cache first (STRM-01, the hardest part), then complete OMDb ratings rendering (DETL-02, mostly done), then person pages (DETL-05), then video tabs and release badges (DETL-03, DETL-06).

---

## Standard Stack

### Core APIs

| API | Version/Tier | Purpose | Notes |
|-----|-------------|---------|-------|
| Streaming Availability API | RapidAPI free (100 req/day) | Platform availability by country + deep links | Primary source for Turkey coverage |
| TMDB REST API | v3 (existing) | Person details, combined_credits, release_dates | Already integrated via api/tmdb.js proxy |
| OMDb API | Free (1,000 req/day) | IMDB + RT + Metacritic ratings | Stub already in RatingsService; needs proxy |
| ip-api.com | Free (45 req/min) | Country detection via IP geolocation | No API key required on free tier |
| YouTube Data API | v3 (existing) | Interview video search by person name | Already in YouTubeService |

### Infrastructure

| Component | Use |
|-----------|-----|
| Vercel Edge Functions (`api/*.js`) | Proxy for Streaming Availability API (hides RAPIDAPI_KEY) and OMDb (hides OMDB_API_KEY) |
| Firebase Firestore | Streaming availability cache: `streamingAvailability/{tmdbId}_{country}` |
| `src/lib/state.js` | `state.currentRegion` already exists (default 'TR') |
| `src/lib/platforms.js` | Fallback deep links when API doesn't return direct URL |

### No New npm Packages Needed

All required functionality is achievable with existing stack (fetch API, Firebase SDK already installed, Vite already configured). Do NOT add axios, date-fns, or any streaming-specific npm packages.

---

## Architecture Patterns

### Recommended Project Structure Additions

```
src/
├── features/
│   ├── detail.js          # Extend: add ratings render, streaming section, release badge
│   └── person.js          # NEW: person page feature module
├── services/
│   └── api.js             # Extend: StreamingAvailabilityService, person methods
├── lib/
│   └── navigation.js      # Extend: add /person/:id route handling
api/
├── streaming-availability.js   # NEW: Edge Function proxy for RapidAPI
└── omdb.js                     # NEW: Edge Function proxy for OMDb (move key server-side)
```

### Pattern 1: Streaming Availability API Integration

**What:** GET `/shows/{imdbId}` with country filter, cache response in Firestore for 24-48h
**Endpoint:** `https://streaming-availability.p.rapidapi.com/shows/{imdbId}?country=tr`
**Header:** `X-RapidAPI-Key: {RAPIDAPI_KEY}` (server-side only in Edge Function)
**Response shape:**
```javascript
// streamingOptions is keyed by lowercase country code
{
  "streamingOptions": {
    "tr": [
      {
        "service": { "id": "netflix", "name": "Netflix", "themeColorCode": "#E50914" },
        "type": "subscription",  // "subscription" | "free" | "rent" | "buy" | "addon"
        "link": "https://www.netflix.com/tr/title/12345",
        "videoLink": "https://...",  // direct deep link when available
        "quality": "hd",
        "audios": [{ "language": "tur" }],
        "subtitles": [{ "closedCaptions": false, "locale": { "language": "tur" } }],
        "expiresSoon": false,
        "availableSince": 1670729202
      }
    ]
  }
}
```

**Grouping mapping:**
```javascript
// Map API "type" to display group
const GROUP_MAP = {
  subscription: 'stream',
  free: 'stream',
  addon: 'stream',
  rent: 'rent',
  buy: 'buy'
};
```

**CRITICAL — BluTV/HBO Max merger (April 2025):** The Turkish market has a BluTV + HBO Max merger. The Streaming Availability API may return either `blutv` or `max` service ID for Turkey. Both should be treated as valid. The current `PLATFORM_URLS` in platforms.js has `HBO Max` pointing to `play.hbomax.com` — update to `play.max.com` for Turkey specifically.

### Pattern 2: Firestore Streaming Cache

**Collection:** `streamingAvailability`
**Document ID:** `{tmdbId}_{countryCode}` (e.g., `550_tr`)
**Document structure:**
```javascript
{
  tmdbId: "550",
  country: "tr",
  imdbId: "tt0137523",
  providers: [
    { serviceId: "netflix", serviceName: "Netflix", type: "subscription", link: "...", logoPath: "..." }
  ],
  fetchedAt: Timestamp,    // for freshness indicator
  expiresAt: Timestamp     // for TTL — set to fetchedAt + 48h
}
```

**TTL approach:** Firestore native TTL requires a TTL policy configured in Firebase console (mark `expiresAt` field as TTL field). For the Edge Function, check `fetchedAt` — if `Date.now() - fetchedAt > 24h`, refetch. The Firestore TTL policy auto-deletes stale docs (cleanup), but the app-level TTL check (24h) controls when to refetch live.

**Important:** Firestore TTL deletion is NOT instant — it can take up to 72 hours after the TTL timestamp. App-level age check is the real freshness control.

### Pattern 3: OMDb Proxy (Security Fix Required)

**Current state:** `RatingsService.getAllRatings()` calls OMDb directly from the browser with `VITE_OMDB_API_KEY`. This exposes the key client-side — violates PLAT-05.

**Fix:** Create `api/omdb.js` Edge Function, move key to server-side `OMDB_API_KEY` env var, update `RatingsService` to call `/api/omdb?imdbId={id}`.

**OMDb response — Ratings array (already handled by existing code):**
```javascript
// data.Ratings array from OMDb
[
  { "Source": "Internet Movie Database", "Value": "8.8/10" },
  { "Source": "Rotten Tomatoes",          "Value": "89%" },
  { "Source": "Metacritic",               "Value": "66/100" }
]
// Also: data.Awards = "Won 2 Oscars. 36 wins & 54 nominations."
// data.imdbRating = "8.8"
// data.Metascore = "66"
```

**Limitation:** OMDb does NOT return Rotten Tomatoes data for TV shows (known issue, documented in omdbapi/OMDb-API GitHub issues). For TV, RT score will be null — display "N/A" gracefully.

### Pattern 4: Person Page (New Route)

**Route:** `/person/{tmdbPersonId}` — SPA page, not modal
**HTML:** New `<section class="view" id="view-person">` in index.html
**Navigation entry in PAGES constant:**
```javascript
person: {
  id: 'view-person',
  title: 'Kişi',
  icon: 'person'
}
```

**Navigation trigger (from detail page cast/crew click):**
```javascript
// In detail.js renderDetail — cast member click handler
element.addEventListener('click', () => {
  navigateTo('person');
  loadPersonPage(personId);
});
```

**TMDB endpoints needed:**
```
GET /person/{id}                    — bio, birthday, place_of_birth, profile_path, known_for_department
GET /person/{id}/combined_credits   — cast[] + crew[] each with media_type, poster_path, release_date/first_air_date, vote_average
GET /person/{id}/external_ids       — imdb_id for OMDb lookup (if awards needed)
```

**combined_credits response:**
```javascript
{
  cast: [
    { id, title/name, media_type, character, poster_path, release_date/first_air_date, vote_average }
  ],
  crew: [
    { id, title/name, media_type, job, department, poster_path, release_date/first_air_date, vote_average }
  ]
}
```

**Filter chips implementation:**
```javascript
// All: cast + crew deduplicated by id
// Movies: cast.filter(c => c.media_type === 'movie')
// TV Shows: cast.filter(c => c.media_type === 'tv')
// As Director: crew.filter(c => c.job === 'Director')
```

**"Frequently works with" algorithm:**
1. Take all movie/TV IDs from person's combined_credits (cast)
2. For each title, fetch credits (or use already-fetched details)
3. Count co-occurrence of other people across those titles
4. Return top 5-8 co-stars with count >= 2
5. **Performance concern:** This could be expensive. Use TMDB `append_to_response` on person details to batch, or limit to top 10 titles by vote_count. Threshold: minimum 2 shared titles.

### Pattern 5: Country Detection

**Service:** ip-api.com free tier
**Endpoint:** `http://ip-api.com/json/?fields=countryCode`
**Rate limit:** 45 requests/minute (sufficient — called once per session)
**No API key required on free tier**
**HTTPS limitation:** ip-api.com free tier does NOT support HTTPS (`http://` only). Must call from a server-side Edge Function or accept the downgrade (production Vercel runs HTTPS). Solution: proxy via `api/geoip.js` Edge Function which calls `http://ip-api.com/json/` server-side.

Alternative (if ip-api.com HTTPS restriction is a blocker): `https://ipapi.co/json/` (free, HTTPS, 1,000 req/day).

**Recommended:** ipapi.co — free, HTTPS-native, 1,000 req/day, no signup required for basic country detection.

```javascript
// ipapi.co response
{ "ip": "...", "country_code": "TR", "country_name": "Turkey", "city": "..." }
```

**Storage:** Save to `state.currentRegion` + `localStorage.setItem('lumi_country', 'TR')`.

### Pattern 6: Cinema Release Badge

**Data source:** `getReleaseDates(id, 'TR')` already exists in TMDBService
**Release type codes (TMDB):** 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV
**Badge logic:**
```javascript
// From getReleaseDates() response
const theatricalRelease = releases.find(r => r.type === 3); // type 3 = Theatrical
const releaseDate = theatricalRelease?.release_date;
const isInCinemas = releaseDate && new Date(releaseDate) <= new Date() && isRecent(releaseDate, 60); // within 60 days
const isComing = releaseDate && new Date(releaseDate) > new Date();
```

### Anti-Patterns to Avoid

- **Direct OMDb calls from browser:** VITE_ prefix exposes key — always proxy through `/api/omdb`
- **Fetching streaming availability on every page open:** 100 req/day is exhausted fast — cache-first, always check Firestore before API
- **Loading all person credits without filtering:** combined_credits for prolific actors can return 200+ items — always paginate/limit UI to 50-80 visible, sort by vote_count desc
- **Polling for freshness updates:** Don't auto-refresh — only update on manual trigger or when cache is stale at page open
- **Separate routing library:** navigation.js is a simple SPA router; extend it, don't replace it

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming availability by country | Custom scraper or TMDB-only lookup | Streaming Availability API (movieofthenight) | TMDB missing GAIN, incomplete Turkish coverage; API has 60 countries, deep links, type grouping |
| Relative time display ("3 hours ago") | Custom date formatter | `Intl.RelativeTimeFormat` (native browser API) | Handles TR locale correctly, no library needed |
| IP geolocation | Custom GeoIP database | ipapi.co free endpoint | Maintenance-free, no storage, no database to update |
| Ratings parsing | Custom OMDb response parser | Existing `RatingsService.getAllRatings()` — already complete | Logic is correct, just needs proxy migration |
| Person page routing | New routing library | Extend `PAGES` in navigation.js + add view section | Consistent with existing SPA pattern |

**Key insight:** The existing API infrastructure (TMDB proxy, YouTube proxy, Firebase) handles 90% of the data needs. The only truly new integration is the Streaming Availability API proxy — everything else is extending existing services.

---

## Common Pitfalls

### Pitfall 1: Streaming Availability API Country Code Case Sensitivity
**What goes wrong:** API uses lowercase country codes (`"tr"`) in `streamingOptions` keys, but `state.currentRegion` is uppercase `"TR"`.
**Why it happens:** Different conventions between TMDB (uppercase) and Streaming Availability API (lowercase).
**How to avoid:** Normalize in the proxy: always lowercase for API request, uppercase for state. Or normalize at read time: `data.streamingOptions[country.toLowerCase()]`.
**Warning signs:** Empty streaming results even when content is available.

### Pitfall 2: OMDb Missing RT Data for TV Shows
**What goes wrong:** `allRatings.rottenTomatoes.tomatometer` is null for TV series.
**Why it happens:** OMDb does not return Rotten Tomatoes scores for TV shows (known API limitation, documented in GitHub issues).
**How to avoid:** Render ratings badges conditionally — only show RT badge if `tomatometer !== null`. Never show "0%" — show nothing.
**Warning signs:** Ratings row shows "0%" for TV shows.

### Pitfall 3: Firestore Cache Cold Start Exhausts API Quota
**What goes wrong:** First day of deployment, every unique title+country combination hits the API live — 100 req/day exhausted before afternoon.
**Why it happens:** Cache is empty on first run, every detail page open hits the API.
**How to avoid:** (a) Cache aggressively at 48h TTL. (b) Fall back to TMDB watch/providers gracefully when Streaming Availability API returns 429. (c) Consider pre-warming cache for top 20 trending titles on deploy.
**Warning signs:** Streaming section shows "Bilgi bulunamadı" on frequently-opened titles.

### Pitfall 4: Person Page Without History State
**What goes wrong:** User opens detail → navigates to person → presses back → lands on home instead of detail.
**Why it happens:** `navigation.js` only tracks one level of history (`state.lastPage`).
**How to avoid:** Before navigating to person page, save `state.returnToDetail = { id, type }`. On back navigation from person page, restore the detail modal.
**Warning signs:** User loses context when navigating to actor page.

### Pitfall 5: BluTV/HBO Max Merger (April 2025)
**What goes wrong:** Turkish users see no HBO Max results even though the content is available (now on BluTV).
**Why it happens:** BluTV merged with HBO Max in April 2025. The Streaming Availability API may have updated service IDs for Turkey.
**How to avoid:** At runtime, call `GET /countries/tr` to get the actual current service list. Update `platforms.js` to handle both `blutv` and `max` service IDs mapping to the same platform URL for TR.
**Warning signs:** HBO Max or BluTV content not shown in Turkish streaming results.

### Pitfall 6: "Frequently Works With" N+1 Query Problem
**What goes wrong:** Person page makes one API call per filmography title to fetch co-stars — 50 titles = 50 API calls.
**Why it happens:** The naive implementation fetches full credits for each title.
**How to avoid:** Limit to top 10 titles by `vote_count` before fetching. Use `append_to_response=credits` on TMDB to batch where possible.
**Warning signs:** Person page takes 5+ seconds to load, TMDB rate limit errors.

---

## Code Examples

### Streaming Availability Edge Function (New: api/streaming-availability.js)

```javascript
// Source: follows api/tmdb.js pattern (verified from codebase)
export const config = { runtime: 'edge' };

export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const imdbId = searchParams.get('imdbId');
    const country = (searchParams.get('country') || 'tr').toLowerCase();

    if (!imdbId) {
        return new Response(JSON.stringify({ error: 'Missing imdbId' }), { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    const url = `https://streaming-availability.p.rapidapi.com/shows/${imdbId}?country=${country}&series_granularity=show`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
            }
        });
        const data = await response.json();
        const options = data.streamingOptions?.[country] || [];

        return new Response(JSON.stringify({ options, fetchedAt: Date.now() }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                // No CDN cache — we manage freshness in Firestore
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Streaming lookup failed' }), { status: 500 });
    }
}
```

### Firestore Cache Read/Write Pattern

```javascript
// Source: follows existing Firestore usage pattern in services/auth.js
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

async function getStreamingWithCache(tmdbId, imdbId, country) {
    const db = getFirestore();
    const cacheKey = `${tmdbId}_${country.toUpperCase()}`;
    const cacheRef = doc(db, 'streamingAvailability', cacheKey);
    const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Try cache first
    const cached = await getDoc(cacheRef);
    if (cached.exists()) {
        const data = cached.data();
        const age = Date.now() - data.fetchedAt.toMillis();
        if (age < TTL_MS) {
            return data; // Cache hit
        }
    }

    // Cache miss or stale — fetch live
    const response = await fetch(`/api/streaming-availability?imdbId=${imdbId}&country=${country}`);
    const fresh = await response.json();

    // Write to Firestore
    const expiresAt = Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000);
    await setDoc(cacheRef, {
        tmdbId, imdbId, country: country.toUpperCase(),
        providers: fresh.options,
        fetchedAt: Timestamp.now(),
        expiresAt,  // for Firestore TTL policy
    });

    return { providers: fresh.options, fetchedAt: Timestamp.now() };
}
```

### OMDb Proxy Edge Function (New: api/omdb.js)

```javascript
// Moves OMDB_API_KEY server-side (fixes PLAT-05 violation)
export const config = { runtime: 'edge' };

export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const imdbId = searchParams.get('imdbId');
    const apiKey = process.env.OMDB_API_KEY;

    if (!imdbId || !apiKey) {
        return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 });
    }

    const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 's-maxage=86400', // 24h CDN cache — ratings rarely change
        }
    });
}
```

### Person Combined Credits Filter Logic

```javascript
// Source: pattern consistent with existing filter in TMDBService.getCredits()
function buildFilmography(combinedCredits, filter = 'all') {
    const { cast = [], crew = [] } = combinedCredits;

    let items;
    switch (filter) {
        case 'movies':
            items = cast.filter(c => c.media_type === 'movie');
            break;
        case 'tv':
            items = cast.filter(c => c.media_type === 'tv');
            break;
        case 'director':
            items = crew.filter(c => c.job === 'Director');
            break;
        default: // 'all'
            // Deduplicate by id
            const seen = new Set();
            items = [...cast, ...crew].filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });
    }

    // Sort by year descending (newest first)
    return items
        .filter(item => item.poster_path) // Only items with posters
        .sort((a, b) => {
            const yearA = parseInt((a.release_date || a.first_air_date || '0').substring(0, 4));
            const yearB = parseInt((b.release_date || b.first_air_date || '0').substring(0, 4));
            return yearB - yearA;
        })
        .slice(0, 80); // Limit UI to 80 items
}
```

### Country Detection (ipapi.co)

```javascript
// Called once per session, result saved to state + localStorage
async function detectUserCountry() {
    const saved = localStorage.getItem('lumi_country');
    if (saved) {
        updateState({ currentRegion: saved });
        return saved;
    }

    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = data.country_code || 'TR';
        localStorage.setItem('lumi_country', country);
        updateState({ currentRegion: country });
        return country;
    } catch (e) {
        console.warn('[Geo] Country detection failed, defaulting to TR');
        return 'TR';
    }
}
```

### Awards Data from OMDb (for Trivia Premium section)

```javascript
// OMDb returns awards as a plain string — parse it for display
// data.Awards = "Won 2 Oscars. 36 wins & 54 nominations."
function parseAwards(awardsString) {
    if (!awardsString || awardsString === 'N/A') return null;
    return {
        raw: awardsString,
        hasOscars: awardsString.toLowerCase().includes('oscar'),
    };
}
```

### Ratings Rendering (Logo + Score Pattern)

```javascript
// Source: locked decision — logos only, native format scores
function renderRatingsBadges(ratings) {
    if (!ratings) return '';
    const badges = [];

    if (ratings.imdb !== null) {
        badges.push(`
            <div class="rating-badge">
                <img src="/assets/logos/imdb.svg" alt="IMDb" class="rating-logo">
                <span class="rating-score">${ratings.imdb}/10</span>
            </div>
        `);
    }
    if (ratings.rottenTomatoes?.tomatometer !== null) {
        badges.push(`
            <div class="rating-badge">
                <img src="/assets/logos/rt.svg" alt="Rotten Tomatoes" class="rating-logo">
                <span class="rating-score">${ratings.rottenTomatoes.tomatometer}%</span>
            </div>
        `);
    }
    if (ratings.metacritic !== null) {
        badges.push(`
            <div class="rating-badge">
                <img src="/assets/logos/metacritic.svg" alt="Metacritic" class="rating-logo">
                <span class="rating-score">${ratings.metacritic}/100</span>
            </div>
        `);
    }

    return `<div class="ratings-row">${badges.join('')}</div>`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TMDB watch/providers as sole streaming source | Streaming Availability API as primary, TMDB as fallback | Decision: Phase 3 | Turkish coverage: GAIN now trackable |
| OMDb called directly from browser (VITE_ key exposed) | OMDb via server-side proxy | Must fix in Phase 3 | Fixes PLAT-05 security requirement |
| Detail page as modal only | Person pages as full SPA routes | Phase 3 | Enables filmography browsing, back navigation |
| HBO Max Turkey platform | BluTV + HBO Max merger (April 2025) | April 2025 | Service ID in Streaming Availability API may be `max` or `blutv` for TR |

**Important event:** BluTV and HBO Max merged in Turkey (April 2025). The platform URL in `platforms.js` has `HBO Max` pointing to `play.hbomax.com` (old) and `Max` pointing to `play.max.com`. For Turkey, this combined service should map to the merged entity. Validate current service ID via the API's `/countries/tr` endpoint at implementation time.

---

## Awards and Trivia Data Sources

**Research finding — no dedicated free awards API exists.** The best available free sources:

| Source | Data Available | Quality | Access |
|--------|---------------|---------|--------|
| OMDb `Awards` field | Awards summary string ("Won 2 Oscars. 43 wins & 143 nominations.") | LOW (aggregate text, not structured) | Already integrated |
| TMDB keywords (`/movie/{id}/keywords`) | Genre tags and plot keywords — usable as "trivia topics" | MEDIUM | Already accessible via TMDB proxy |
| TMDB taglines + production companies | Minor background trivia | LOW | Already in details response |
| Wikidata SPARQL | Structured awards data (Golden Globe, Oscar nominees by film) | HIGH but complex | Free, no key needed, complex query |

**Recommendation:** For Phase 3 Premium trivia gate, use a combination of:
1. OMDb `Awards` string (parse and display as-is — "Won 2 Oscars. 43 wins & 54 nominations.")
2. TMDB keywords as "trivia tags" (e.g., "based on novel", "twist ending", "cult classic")
3. Display both under a "Trivia & Awards" Premium-gated section

This avoids additional API integrations while providing genuine value. Wikidata is available for Phase 4 expansion if structured awards data is needed.

---

## Open Questions

1. **Streaming Availability API Turkish services: GAIN, Exxen, TOD coverage**
   - What we know: TR is a supported country code; Netflix confirmed in docs examples
   - What's unclear: Whether GAIN, Exxen, TOD are indexed (documentation doesn't enumerate all TR services)
   - Recommendation: On first deploy, call `GET /countries/tr` to enumerate all available services and update `platforms.js` accordingly. Log gaps to console in development.

2. **OMDb free tier rate limit**
   - What we know: OMDb free tier allows 1,000 requests/day per API key
   - What's unclear: Whether Vercel Edge CDN caching (`s-maxage=86400`) works for the OMDb proxy to reduce live calls
   - Recommendation: Set `s-maxage=86400` on the `/api/omdb` response — ratings don't change daily, CDN cache reduces actual API calls dramatically.

3. **TMDB Person API: deathday field handling**
   - What we know: The person endpoint returns a `deathday` field
   - What's unclear: Whether displaying deathday is desired (may feel morbid in UI)
   - Recommendation: Claude's discretion — render birth date always, render death date only when present and relevant (classic actors section). Default: omit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.17 |
| Config file | `vitest.config.js` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRM-01 | Streaming providers returned and grouped by type | unit | `npm test -- tests/streaming.test.js` | ❌ Wave 0 |
| STRM-02 | Country detection returns country code, falls back to TR | unit | `npm test -- tests/streaming.test.js` | ❌ Wave 0 |
| STRM-04 | Freshness indicator shows correct relative time | unit | `npm test -- tests/streaming.test.js` | ❌ Wave 0 |
| DETL-02 | Ratings badges render IMDB/RT/Metacritic with null safety | unit | `npm test -- tests/detail.test.js` | ✅ exists |
| DETL-05 | buildFilmography filter chips return correct items | unit | `npm test -- tests/person.test.js` | ❌ Wave 0 |
| DETL-05 | Person page navigation adds/restores return state | unit | `npm test -- tests/person.test.js` | ❌ Wave 0 |
| DETL-06 | Cinema release badge shows correct state (coming/in cinemas/past) | unit | `npm test -- tests/detail.test.js` | ✅ exists |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/streaming.test.js` — covers STRM-01, STRM-02, STRM-04 (grouping logic, country detection, freshness formatting)
- [ ] `tests/person.test.js` — covers DETL-05 (buildFilmography filters, navigation state)
- Add `renderRatingsBadges` and `parseCinemaRelease` exports to `detail.js` so they can be unit-tested independently

---

## Sources

### Primary (HIGH confidence)
- Streaming Availability API official docs: https://docs.movieofthenight.com/resource/shows — endpoint format, streamingOptions structure, country support
- Streaming Availability API countries: https://docs.movieofthenight.com/guide/countries-and-services — Turkey (TR) confirmed supported
- TMDB Person endpoints: https://developer.themoviedb.org/reference/person-combined-credits — combined_credits response structure
- OMDb API: https://www.omdbapi.com/ — Ratings array format, Awards field, rate limits

### Secondary (MEDIUM confidence)
- ipapi.co: https://ipapi.co/ — free HTTPS geolocation, 1,000 req/day, country_code field
- ip-api.com: https://ip-api.com/ — free geolocation, 45 req/min, HTTP-only on free tier
- Firestore TTL: https://firebase.google.com/docs/firestore/ttl — TTL policy via `expiresAt` field
- BluTV + HBO Max merger: https://www.broadcastprome.com/news/turkeys-streaming-market-expands-to-73-household-reach-in-q1-2025-fabric/ — confirmed April 2025

### Tertiary (LOW confidence)
- OMDb TV show RT limitation: GitHub issue evidence (omdbapi/OMDb-API#102) — RT data absent for TV, flag at LOW confidence as this may have been resolved
- Streaming Availability API 100 req/day free tier: Confirmed via GitHub repositories (movieofthenight/ts-streaming-availability, go-streaming-availability)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified via official docs or authoritative GitHub
- Architecture patterns: HIGH — follows established codebase patterns exactly
- Turkish platform coverage: MEDIUM — TR country code confirmed, specific service list (GAIN, Exxen, TOD) not enumerated in docs; verify at runtime
- Pitfalls: HIGH — based on direct API documentation and known codebase patterns
- Awards/trivia data: MEDIUM — OMDb Awards field confirmed, Wikidata approach described but not prototyped

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days) — stable APIs; BluTV/Max merger state may evolve faster
