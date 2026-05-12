# Phase 4: Global Foundation - Context

**Gathered:** 2026-05-10
**Status:** Ready for research + planning
**Source:** User conversation 2026-05-09 / 2026-05-10 + ROADMAP.md

**IMPORTANT: Lumi is mobile-only. Phase 4 prepares for global launch via iOS App Store (Phase 6).**

<domain>
## Phase Boundary

Make Lumi globally launchable. App must:
1. Run in any region with the user's language (auto-detected, override-able)
2. Allow browse without login (guest mode); require auth only for social/public actions
3. Greet new users with a 3-step onboarding that captures the bare minimum AI needs to be useful (language, country, owned streaming platforms)
4. Enrich detail pages for actively-airing TV with "Yayın Kanalı / Airing on" info (broadcast network + next-episode), separate from streaming providers

Out of scope (deferred):
- Premium subscription model → Phase 5
- iOS Capacitor wrapper + App Store listing → Phase 6
- PWA offline support (replaced by native iOS in Phase 6)
- Push notifications infrastructure → Phase 5/6 (Premium Smart Notifications)
- Community ratings → cut from roadmap (not aligned with Movie Night Agent positioning)
</domain>

<decisions>
## Locked Decisions

### A. i18n EN-first refactor (Phase 4.1)
- Promote EN to ana dil (default fallback)
- Complete TR coverage (no missing keys)
- Scaffold empty JSONs for ES, FR, DE, JA, KO (structure only, translations later)
- Backend endpoints (`api/search`, `api/gemini`, TMDB calls) honor `lang` parameter
- TMDB `language=tr-TR` hardcode in `api/search.js` becomes dynamic based on request
- Gemini prompt language adapts to user's `lang`
- All hardcoded TR strings in JS/HTML → `t()` calls; audit needed across codebase

### B. Region + locale detection (Phase 4.2)
- Auto-detect via `navigator.language` (frontend) + `Accept-Language` header (backend)
- Cross-check with existing `api/geoip` endpoint (returns country code)
- Persist to localStorage `{ lang, country }` after onboarding
- User can override via profile settings page (already has country selector from Phase 3)
- Default fallback chain: localStorage override → navigator.language → geoip country → 'en'/'US'

### C. Auth optional + guest mode (Phase 4.3)
- **Remove the full-screen login wall on app entry** (USER-01 reversed)
- Guest browse: full app accessible without login
- Private features in localStorage (already wired in Phase 03.2-01 via `src/features/favorites-storage.js`):
  - Beğeniler (`liked_items`)
  - İzleyeceklerim (`watchlist_items`)
  - Search history, son baktığın filmler
  - AI search (rate-limited 5/day for free tier — Phase 5 enforces this)
- Action-triggered auth modal for social/public actions:
  - Oy verme (community ratings — but those are out of scope this phase; placeholder OK)
  - Yorum yazma (placeholder)
  - Liste paylaşma (placeholder)
  - Profile page (kullanıcıya özgü — guest sees "Sign in to customize" CTA)
- LocalStorage → Firestore migration on signup:
  - Liked items: localStorage `liked_items[]` → Firestore `users/{uid}/favorites/{itemId}`
  - Watchlist: localStorage `watchlist_items[]` → Firestore `users/{uid}/watchlist/{itemId}`
  - On migration, dedupe by `id`; if Firestore already has items, merge (union)
- Migration runs once at first authenticated session post-signup; flag to localStorage so it doesn't re-run

### D. Onboarding flow (Phase 4.4)
3-step bottom sheet / full-screen wizard on first launch:
1. **Language confirm** (auto-detected from `navigator.language`, user can override from a list)
2. **Country confirm** (auto-detected from geoip, user can override)
3. **Owned streaming platforms** (multi-select from region's available list; skip allowed)
- All 3 steps persist to:
  - Guest: localStorage `lumi_onboarding = { lang, country, ownedPlatforms[], completedAt }`
  - Auth user: same structure in Firestore `users/{uid}.preferences`
- Show only on first launch; flag prevents re-showing
- "Skip" or "Later" option on each step (defaults applied)
- Visual style: matches Lumi's cinematic dark theme, poster-heavy

### E. Active series broadcast info (Phase 4.5)
- Detail page enhancement for TV series only (not movies)
- Detect actively-airing via TMDB `status === 'Returning Series'` OR `next_episode_to_air != null`
- If active: render "Yayın Kanalı / Airing on" section ABOVE or NEXT TO "Nerede İzlenir"
  - Broadcast network name (from TMDB `networks` array)
  - Logo (from TMDB or curated overlay for TR networks: Show TV, ATV, TRT, Star TV)
  - Next episode air date + time (from TMDB `next_episode_to_air.air_date`)
  - Optional: episode number + season ("S5 E12 — 12 May, 20:00")
- If ended (`status === 'Ended'` or `next_episode_to_air === null`):
  - Section hidden entirely
  - Only streaming providers shown (as today)
- Catalog overlay for TR broadcast networks:
  - Show TV → showtv.com.tr/[show-slug] (or homepage if deep link unknown)
  - ATV → atv.com.tr
  - TRT → trtizle.com
  - Star TV → startv.com.tr
  - Logos can reuse Round 14 favicon download approach (lokal PNG)

### Claude's Discretion
- i18n string audit method (Grep patterns, manual scan, or both)
- Onboarding visual treatment (full-screen vs. bottom sheet)
- Whether to add "Skip onboarding entirely" option vs. force completion
- How to display broadcast vs. streaming visually (badge, separate card, etc.)
- Whether to add an "i18n test mode" toggle for QA
- Whether 4.2 region detection lives in a new `src/lib/locale.js` or extends existing `src/config.js`
</decisions>

<canonical_refs>
## Canonical References

### i18n
- `src/i18n/tr.json` — Turkish translations (complete)
- `src/i18n/en.json` — English translations (partial, needs completion)
- `public/i18n.js` — i18n loader, `t()` function, language switcher
- `i18n.js` — root-level legacy file (verify if still used)
- `src/config.js` — current language config

### Auth
- `public/services/auth.js` — Firebase compat v8 AuthService, login/signup/logout
- `src/features/profile.js` — profile page, sign-in flows
- `index.html` — login wall HTML (`#login-view`, `#app-view`)
- `src/main.js` — auth-state-driven view switching

### Storage (already migrated in 03.2-01)
- `src/features/favorites-storage.js` — canonical reader/writer for `liked_items` + `watchlist_items`
- `tests/favorites-storage.test.js` — coverage

### Region / Geo
- `api/geoip.js` — Edge Function returning country code via ipapi.co
- `src/config.js` — country setting

### Detail page (for 4.5 broadcast info)
- `src/features/detail.js` — `buildStreamingHTML`, detail page renderer
- `src/styles/detail.css` — detail page styling
- `src/services/streaming-cache.js` — uses `details.networks` already
- `src/data/turkish-platform-catalog.json` — curated TR streaming overlay (will add broadcast overlay similarly)
- `src/lib/platforms.js` — `PLATFORM_DISPLAY_NAMES`, `PLATFORM_LOGO_PATHS`, `PLATFORM_ID_URLS`

### Backend
- `api/search.js` — accepts query, returns enriched results (Round 12 stable)
- `api/gemini.js` — Gemini proxy for trivia
- `api/tmdb.js` — TMDB proxy (used by frontend for detail page)
- Backend runtime: **always** `export const config = { runtime: 'edge' }` (Phase 03.2-r9 lesson)

### Design
- Stitch MCP tools may help with onboarding wizard mockups
- Mobile-only — viewport min 375px
</canonical_refs>

<specifics>
## Specific Implementation Ideas

### 4.1 — i18n audit approach
1. `grep -RnE "['\"]([A-Z][a-zA-ZçğşıöüÇĞŞİÖÜ]+\s*[a-zA-Z]+)['\"]" src/ public/ index.html` to find candidate hardcoded strings
2. Manually triage: Turkish sentences → t() calls, ASCII identifiers (CSS classes etc.) → skip
3. Backend: `language: req.body.lang ?? 'en'` propagated to TMDB + Gemini prompts

### 4.2 — Locale detection module
```js
// src/lib/locale.js
export function detectLocale() {
  const stored = localStorage.getItem('lumi_locale');
  if (stored) return JSON.parse(stored);
  const lang = (navigator.language || 'en').split('-')[0];
  // geoip is async — use 'XX' placeholder, update after geoip resolves
  return { lang, country: 'XX', source: 'navigator' };
}
export async function resolveLocale() {
  // ... combined detection
}
```

### 4.3 — Action-triggered auth modal
- New module `src/features/auth-modal.js` — exposes `requireAuth(actionName)` that returns a Promise resolving when user signs in or rejecting if they cancel
- Usage: `await requireAuth('rate'); /* proceed */`
- Modal shows action context: "Beğeni eklemek için giriş yap"

### 4.4 — Onboarding wizard
- New module `src/features/onboarding.js`
- Bottom sheet with 3 paginated screens
- Persist incrementally (each step writes immediately to localStorage); `completedAt` marker on final submit
- localStorage flag `lumi_onboarding_completed = true` prevents re-show

### 4.5 — Broadcast info renderer
- In `src/features/detail.js`, after fetching TV details:
  - If `details.next_episode_to_air !== null` OR `details.status === 'Returning Series'`:
    - Render `<section class="detail-airing-info">` above the streaming section
    - Show network name + logo + next-episode info
  - Else: skip
- New JSON: `src/data/tr-broadcast-catalog.json` (optional, only if curated overlay needed beyond TMDB)
- Add network logos: `public/img/networks/showtv.png` etc. (reuse Round 14 favicon approach)
</specifics>

<deferred>
## Deferred Ideas

- Premium subscription model → Phase 5
- 4 proactive Premium features (Decide-for-Me, Pair Mode, Smart Notify, Evening Assistant) → Phase 5
- iOS Capacitor wrapper → Phase 6
- App Store ASO + screenshots → Phase 6
- APNs push infrastructure → Phase 6
- Community ratings (oy verme + yorum + paylaşma) — concept descoped; placeholder UI in 4.3 only
- Translation of ES/FR/DE/JA/KO content (scaffold only this phase, real translations later)
- Multi-region streaming overlay (catalog only TR; other regions defer)
- Profile activity timeline / yearly wrapped → Premium polish (Phase 5)
- Watch party / group features → out of scope
</deferred>

---

*Phase: 04-global-foundation*
*Context gathered: 2026-05-10 from session conversation + ROADMAP.md*
