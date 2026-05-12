# Phase 4: Global Foundation — Research

**Researched:** 2026-05-12
**Domain:** Internationalization, geo/locale detection, optional auth, onboarding UX, TV broadcast metadata
**Overall Confidence:** MEDIUM-HIGH (codebase facts HIGH; external API behaviors MEDIUM; UX patterns MEDIUM)

---

## Summary

Phase 4 turns Lumi from a TR-only, login-walled prototype into a globally-launchable mobile app with a 5-pillar foundation: (4.1) EN-first i18n, (4.2) locale + region auto-detection, (4.3) optional auth + guest mode, (4.4) 3-step onboarding wizard, (4.5) active-series broadcast info.

Two critical facts the planner must internalize before drafting plans:

1. **The current i18n dictionary lives in a single file `public/i18n.js`** (a JS object literal, not JSON modules), and the CONTEXT.md reference to `src/i18n/tr.json` / `src/i18n/en.json` is **incorrect** — those paths do not exist. The actual layout is `public/i18n/en.json` and `public/i18n/tr.json` as **stub files**, plus the live dictionary inline at `public/i18n.js:5–971`. Phase 4.1 must decide: keep inline dictionary and add languages there, or migrate to per-language JSON files (recommended — see §4.1).
2. **HTML has zero `data-i18n` attributes** (Grep on `index.html` returned no matches for `data-i18n|i18n.t`). The `i18n.updateTranslations()` function at `public/i18n.js:1007–1028` runs but finds nothing to translate. **All visible Turkish strings in the current UI are hardcoded in JS template literals or HTML text nodes.** The 4.1 audit is therefore broader than CONTEXT.md implies.

**Primary recommendation:** Do 4.1 (i18n) and 4.2 (locale detection) first as a single coherent wave, because the onboarding wizard (4.4) cannot be built correctly without (a) translated copy and (b) language/country defaults to pre-populate. 4.3 (optional auth) is the highest-risk task — it touches the app entry path in `src/main.js` and requires a one-way localStorage→Firestore migration. 4.5 (broadcast info) is the lowest-risk task; the rendering hook already exists at `src/features/detail.js:1109`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. i18n EN-first refactor (Phase 4.1)**
- Promote EN to ana dil (default fallback)
- Complete TR coverage (no missing keys)
- Scaffold empty JSONs for ES, FR, DE, JA, KO (structure only, translations later)
- Backend endpoints (`api/search`, `api/gemini`, TMDB calls) honor `lang` parameter
- TMDB `language=tr-TR` hardcode in `api/search.js` becomes dynamic based on request
- Gemini prompt language adapts to user's `lang`
- All hardcoded TR strings in JS/HTML → `t()` calls; audit needed across codebase

**B. Region + locale detection (Phase 4.2)**
- Auto-detect via `navigator.language` (frontend) + `Accept-Language` header (backend)
- Cross-check with existing `api/geoip` endpoint (returns country code)
- Persist to localStorage `{ lang, country }` after onboarding
- User can override via profile settings page (already has country selector from Phase 3)
- Default fallback chain: localStorage override → navigator.language → geoip country → 'en'/'US'

**C. Auth optional + guest mode (Phase 4.3)**
- Remove the full-screen login wall on app entry (USER-01 reversed)
- Guest browse: full app accessible without login
- Private features in localStorage (already wired via `src/features/favorites-storage.js`)
- Action-triggered auth modal for social/public actions (oy verme, yorum, paylaşma, profile)
- LocalStorage → Firestore migration on signup: liked → `users/{uid}/favorites/{itemId}`, watchlist → `users/{uid}/watchlist/{itemId}`; merge by `id` (union), run-once flag

**D. Onboarding flow (Phase 4.4)**
- 3-step bottom sheet / full-screen wizard on first launch: language confirm → country confirm → owned streaming platforms (multi-select, skip allowed)
- Persist to localStorage `lumi_onboarding = { lang, country, ownedPlatforms[], completedAt }` (guest) / Firestore `users/{uid}.preferences` (auth)
- Show only on first launch; flag prevents re-showing
- Cinematic dark theme, poster-heavy

**E. Active series broadcast info (Phase 4.5)**
- Detail page enhancement for TV series only
- Detect actively-airing via TMDB `status === 'Returning Series'` OR `next_episode_to_air != null`
- Render "Yayın Kanalı / Airing on" section above streaming section, with network name, logo, next-episode date
- If ended → section hidden
- TR network overlay: Show TV → showtv.com.tr, ATV → atv.com.tr, TRT → trtizle.com, Star TV → startv.com.tr
- Logos reuse Round 14 favicon download approach (local PNGs)

### Claude's Discretion
- i18n string audit method (Grep patterns, manual scan, or both)
- Onboarding visual treatment (full-screen vs. bottom sheet)
- Whether to add "Skip onboarding entirely" option
- How to display broadcast vs. streaming visually
- Whether to add an "i18n test mode" toggle for QA
- Whether 4.2 region detection lives in `src/lib/locale.js` or extends `src/config.js`

### Deferred Ideas (OUT OF SCOPE)
- Premium subscription model → Phase 5
- 4 proactive Premium features → Phase 5
- iOS Capacitor wrapper, App Store ASO, APNs → Phase 6
- Community ratings (placeholder UI only in 4.3)
- Translation of ES/FR/DE/JA/KO content (scaffold only)
- Multi-region streaming overlay (TR only; other regions defer)
- Profile activity timeline / wrapped → Phase 5
- Watch party / group features → out of scope
</user_constraints>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Hardcoded-string audit + extraction to `t()` | Browser (src/, public/, index.html) | — | All visible copy is rendered client-side |
| Translation dictionary loading | Browser | — | Static JSON / inline JS object; no SSR exists |
| `navigator.language` detection | Browser | — | API only exists in browser |
| `Accept-Language` parsing | API (Vercel Edge Functions) | — | Server-side only; needed so TMDB/Gemini honor lang for cached responses |
| GeoIP country detection | API (`api/geoip.js`) | Browser (calls it) | IP is only visible server-side; Edge runtime preserves real IP via `request.headers.get('x-forwarded-for')` if needed |
| Locale persistence (`{lang, country}`) | Browser (localStorage) | API (Firestore via auth.js if user signs in) | Mobile-only, single device per session |
| Login wall removal | Browser (`src/main.js:369–387`) | — | Auth state listener triggers view toggle |
| Action-triggered auth modal | Browser (`src/features/auth-modal.js` — new) | API (Firebase Auth) | Modal is UI; Firebase SDK handles credentials |
| LocalStorage → Firestore migration | Browser (one-shot on first auth) | API (Firestore writes) | Migration runs in client; SDK batches writes |
| Onboarding wizard UI | Browser (`src/features/onboarding.js` — new) | — | Pure UI; no server state required |
| Onboarding owned-platforms list source | API (`api/tmdb.js` proxy → TMDB `/watch/providers/tv` per region) | Browser (cache result) | Region-specific list lives at TMDB |
| TV `status`, `next_episode_to_air`, `networks` fetch | API (`api/tmdb.js` proxy with `append_to_response=...`) | Browser (renders) | Already fetched per `src/features/detail.js:1109` |
| Broadcast network logo overlay | Browser (`public/img/networks/*.png` + lookup table) | — | Static assets; no API |
| Relative date formatting ("next ep. in 3 days") | Browser (`Intl.RelativeTimeFormat`) | — | Native browser API; no library needed |

---

## Standard Stack

### Core (already installed — verified in `package.json`)
| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| Vitest | ^4.0.17 | Test runner (i18n, locale, migration tests) | Already wired; `npm test` runs `vitest run` |
| `@vitest/ui` | ^4.0.17 | Test UI for QA during 4.1 audit | Already installed |
| Firebase compat v8 | (from Phase 3) | Auth + Firestore for 4.3 | Already integrated via `public/services/auth.js` per CONTEXT.md |

### Native Browser APIs (NO new dependencies needed)
| API | Purpose | Sub-phase | Notes |
|---|---|---|---|
| `navigator.language` | Primary language detection | 4.2 | Returns single string in all modern browsers, e.g. `"en-US"`, `"tr-TR"` [VERIFIED: MDN] |
| `navigator.languages` | Ordered preference list | 4.2 | Array, e.g. `["en-US","en","tr"]`; use as secondary signal [VERIFIED: MDN] |
| `Intl.Locale` (BCP 47 parsing) | Robust language/region split | 4.2 | `new Intl.Locale('en-US').language === 'en'`; safer than `.split('-')[0]` [CITED: MDN] |
| `Intl.RelativeTimeFormat` | "in 3 days" / "yesterday" for next-episode air date | 4.5 | Native, localized; no Moment/date-fns needed [CITED: MDN] |
| `Intl.DateTimeFormat` | Absolute date display in user locale | 4.5 | Already used elsewhere via `toLocaleDateString` |
| `localStorage` | Locale + onboarding flags + favorites | 4.2–4.4 | Already used throughout |

### Don't Add (anti-recommendation)
| Don't install | Why |
|---|---|
| i18next / react-i18next / FormatJS / vue-i18n | Vanilla JS app, no framework runtime; the inline `t(key)` already works. Adding a library multiplies bundle size and migration complexity for zero feature gain. |
| Moment.js / date-fns | `Intl.RelativeTimeFormat` + `Intl.DateTimeFormat` cover 100% of Phase 4 needs natively. |
| accept-language-parser | A 6-line parse-and-split function suffices in Edge runtime; npm install adds ~30 KB and a supply-chain surface for nothing. |
| `cldr-data` / `globalize` | Browser already ships full CLDR via `Intl.*`. |

**Verification:** `cat package.json` confirms current deps; no i18n / date library installed. Phase 4 should stay zero-dep.

---

## Phase Requirements

> Note: CONTEXT.md does not assign formal REQ-IDs. The planner should mint them in PLAN.md (e.g., I18N-01, LOC-01, AUTH-01, ONB-01, BCAST-01) before task drafting.

| Sub-phase | Behaviors to plan |
|---|---|
| **4.1 i18n** | EN promoted to default; TR/EN 100% coverage; ES/FR/DE/JA/KO scaffolded; backend `lang` param accepted by `api/search.js`, `api/gemini.js`, `api/tmdb.js`; static HTML strings tagged with `data-i18n` |
| **4.2 Locale** | Detect (navigator + geoip), persist to localStorage, expose `getLocale()` + `setLocale()`; profile-page override hook |
| **4.3 Auth** | Remove app-entry login wall; add `requireAuth()` for gated actions; one-time migration of `liked_items`+`watchlist_items` to Firestore on first authenticated session; idempotent merge |
| **4.4 Onboarding** | 3-step wizard (lang → country → platforms), persisted, shown once; integrates with 4.2 defaults; sources platforms from TMDB `/watch/providers/tv?watch_region={CC}` |
| **4.5 Broadcast** | Detail page section gated by `status === 'Returning Series'` OR `next_episode_to_air != null`; renders network name + logo + next-episode info; TR overlay for Show TV / ATV / TRT / Star TV |

---

## Sub-phase 4.1 — i18n EN-first Refactor

### Current state (VERIFIED by file reads)
- **Dictionary location:** inline JS object at `public/i18n.js:5–971`, exposed as `window.i18n`. Languages defined: `tr` (full, ~180 keys), `en` (~170 keys), `de`/`fr`/`es` (~80–100 keys each), `ja`/`zh`/`ko` (~50 keys each — heavily partial).
- **Lookup function:** `i18n.t(key)` at line 974 — returns the raw key on miss (no fallback chain to EN). **Pitfall:** missing keys silently leak the camelCase key into UI.
- **Setter:** `i18n.setLanguage(langCode)` at line 980 normalizes locale to language code (`en-US` → `en`), writes `localStorage.appLanguage`, calls `updateTranslations()`.
- **DOM updater:** `updateTranslations()` walks `[data-i18n]` and `[data-i18n-placeholder]` attributes (line 1009, 1018). **HOWEVER**: Grep on `index.html` for `data-i18n` returns **zero matches**. The function exists but is a no-op against current markup.
- **Stub files exist:** `public/i18n/en.json` and `public/i18n/tr.json` are present in `public/i18n/` directory but not loaded by `i18n.js`. They were created in earlier phases as forward-looking stubs.
- **`t()` adoption in src/ is shallow:** Grep finds `data-i18n|i18n.t|t('` matches in **only 2 files**: `src/features/detail.js` (19 occurrences) and `src/features/profile.js` (5 occurrences). Every other module renders Turkish copy via raw template literals — this is the audit surface.

### Audit approach (recommended)

The CONTEXT.md `grep -RnE "['\"]([A-Z][a-zA-ZçğşıöüÇĞŞİÖÜ]+\s*[a-zA-Z]+)['\"]"` pattern is a fine first pass but will yield many false positives (CSS classes, IDs, log strings). Two-stage triage:

1. **Turkish-character anchor (HIGH signal):** `grep -RnE "[çğşıöüÇĞŞİÖÜ]" src/ public/*.js index.html` — any line with a Turkish-specific glyph is almost certainly user-visible copy. Triage these first; they're guaranteed translatable.
2. **ASCII Turkish words pass (MEDIUM signal):** word-list grep for common TR words that don't share with code identifiers: `\b(Film|Dizi|Öner|Ara|Yükleniyor|Kapat|Giriş|Çıkış|Sonuç|Hata|Tümü)\b`.
3. **Skip:** `console.log`, error strings (keep English for devs), aria-labels (separate pass), URL paths.

### EN-first promotion strategy

The cleanest fix is to refactor `t()` to walk a fallback chain — change line 974–977 from:

```js
t(key) {
  const lang = this.translations[this.currentLang] || this.translations.tr;
  return lang[key] || key;
}
```

to:

```js
t(key) {
  return this.translations[this.currentLang]?.[key]
      ?? this.translations.en?.[key]
      ?? key;
}
```

This flips the default fallback from TR to EN and adds the chain. Existing callers don't need to change. **[ASSUMED]:** No call site relies on `t()` returning a TR string for an unknown key; this should be verified during audit.

### Migrating inline dictionary → JSON files (recommended)

Inline dictionary is 1032 lines and growing. Splitting to `public/i18n/{tr,en,de,fr,es,ja,zh,ko}.json` and lazy-loading on demand reduces initial parse cost and lets translators edit JSON without touching JS. **However**: CONTEXT.md doesn't mandate this and it's discretion-area. **Recommendation:** keep inline for Phase 4.1 (smaller diff, less risk), migrate to JSON in a follow-up. Just **add** ES/FR/DE/JA/KO **stub keys** matching the EN keyset (empty strings — `t()` falls back to EN — so the structure is scaffolded for translators).

### Backend `lang` propagation

- `api/search.js:56` currently hardcodes `language: 'tr-TR'` in the TMDB query. **Fix:** accept `lang` from request body/query, validate against allowlist (`tr|en|de|fr|es|ja|zh|ko`), map `en` → `en-US`, `tr` → `tr-TR`, `de` → `de-DE`, etc. TMDB requires **BCP 47 locale** (`xx-XX`), NOT bare ISO-639 (`xx`). [VERIFIED: TMDB API docs require `language` param as IETF BCP 47]
- `api/tmdb.js` proxy: same pattern. Add `lang` query-string passthrough.
- `api/gemini.js`: prompts must include locale instruction. Standard pattern: prepend `Respond in {languageName}.` where languageName is the localized full name (`English`, `Türkçe`, etc.). **[CITED: Vercel AI SDK examples + Google Gemini prompt-engineering guide]**

### Anti-patterns to avoid

- **Returning the raw key on miss** (current behavior) → user sees `aiInputLabel` in UI. Fix: fallback chain → EN.
- **Splitting by `-` for locale** → fails for some legitimate BCP 47 tags like `zh-Hans-CN`. Use `new Intl.Locale(tag).language`.
- **Translating error/log strings** → developer-only output, keep English.
- **Lazy-loading the active language asynchronously without a loading state** → UI flash of untranslated keys. If migrating to JSON: ship default (EN) inline, lazy-load only on switch.

### Confidence
- Codebase facts: **HIGH** (verified via file reads + grep)
- BCP 47 / TMDB requirement: **HIGH** [VERIFIED: TMDB docs]
- Audit completeness estimate: **MEDIUM** (depends on hidden template-literal copy)

---

## Sub-phase 4.2 — Region + Locale Detection

### Current state (VERIFIED)
- `api/geoip.js` (50 lines, fully read) — Edge Function, proxies `ipapi.co/json/`, returns `{countryCode, countryName}`, defaults to `{countryCode: 'TR', countryName: 'Türkiye'}` on any error. **Pitfall:** This call resolves the **server's** IP at ipapi.co — not the user's. Verify with curl that ipapi.co echoes the client IP when the request is proxied; Edge runtime forwards `request.headers.get('x-forwarded-for')` if needed. **[ASSUMED — needs verification at runtime: the current implementation passes no client IP to ipapi.co, which may mean ipapi resolves it via the inbound request's edge IP, which is the user's. Test with VPN before launch.]**
- `localStorage.appLanguage` is the existing key used by `i18n.setLanguage` (`public/i18n.js:986`). Reuse this; **don't introduce a competing `lumi_locale` key** unless wrapping both `lang` and `country` together. CONTEXT.md proposes `localStorage { lang, country }` — recommend a single key `lumi_locale = JSON.stringify({lang, country, source})`.

### `navigator.language` quirks
- **Chrome / Firefox / Safari (modern):** returns user's primary language as `"en-US"`, `"tr-TR"`, etc. [VERIFIED: MDN — all major browsers since 2016]
- **`navigator.languages`** is an array of preferences in order; Safari historically returned only one entry (gap mostly closed in Safari 14+). Use as fallback if `navigator.language` is undefined.
- **WebView / Capacitor iOS (Phase 6 relevance):** WKWebView returns the device locale, not the app's locale. Good news — auto-detect works without bridging.
- **Edge case:** Some users set browser to a different language than their region (Turkish UI, US IP). The geoip cross-check exists precisely to surface this; offer override in onboarding step 1.

### `Accept-Language` parsing (backend)
Standard format: `en-US,en;q=0.9,tr;q=0.8`. Parse to ordered list of `{tag, q}` pairs, sort by q desc. Vercel Edge functions receive this via `request.headers.get('accept-language')`. **6-line parse function:**

```js
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header.split(',')
    .map(s => {
      const [tag, q] = s.trim().split(';q=');
      return { tag, q: parseFloat(q ?? '1') };
    })
    .sort((a, b) => b.q - a.q);
}
```

[VERIFIED: RFC 9110 §12.5.4]

### Fallback chain (recommended order)
1. `localStorage.lumi_locale.lang` (user override or post-onboarding)
2. `navigator.language` (browser primary)
3. `navigator.languages[0]` (preference list head)
4. `api/geoip.js` → country code → map to default lang (`TR → tr`, `US/GB → en`, `DE/AT/CH → de`, `FR → fr`, `ES/MX/AR → es`, `JP → ja`, `KR → ko`, `CN/TW/HK → zh`, else `en`)
5. Hardcoded `'en'` / `'US'`

The chain must **resolve synchronously** for first paint (steps 1–3); geoip is async and only fills in country when needed (step 4).

### BCP 47 vs ISO-639 vs Intl.Locale API

- **ISO-639-1:** 2-letter language code, e.g. `tr`, `en`. App's internal `currentLang` uses this.
- **BCP 47 (IETF language tag):** e.g. `tr-TR`, `en-US`, `pt-BR`. TMDB API requires this. The mapping `lang → BCP 47` should live in a single constant table.
- **`Intl.Locale`:** Robust parser. `new Intl.Locale('zh-Hans-CN').language === 'zh'`. Use this for any locale string from user input. [CITED: MDN]

### Locale persistence semantics
- **When to write:** only after explicit user confirmation (onboarding step 1, or profile override). Auto-detection result should be **resolved at app start** and held in memory; persistence happens only on user action.
- **When to invalidate:** never automatically. User must explicitly change locale via profile.
- **Migration:** if old `localStorage.appLanguage` exists but new `lumi_locale` doesn't, derive country from geoip and seed `lumi_locale = {lang: appLanguage, country: <geoip>, source: 'migrated'}` on first load post-update.

### Common pitfalls
- **Race condition:** rendering UI before geoip resolves → use synchronous chain steps 1–3 for first paint; geoip only fills in country (which only matters for onboarding step 2 and TMDB region-specific watch providers).
- **ipapi.co rate limits:** ipapi.co free tier is 1k req/day per IP — fine for one call per session, but **don't call it on every page load**. Persist `country` to localStorage after first detection.
- **Privacy / GDPR:** geoip is widely considered fair-use, but document in privacy policy for Phase 6 App Store submission.

### Confidence
- Browser API behavior: **HIGH** [VERIFIED: MDN]
- ipapi.co behavior at Vercel Edge: **MEDIUM** [needs runtime verification with VPN]
- BCP 47 mappings: **HIGH** [VERIFIED: TMDB & RFC 5646]

---

## Sub-phase 4.3 — Auth Optional + Guest Mode

### Current state (VERIFIED via Grep)
- `src/main.js:369` contains comment `"Initialize login wall with Firebase"` and lines 369–387 hold auth-state-driven view switching. **CONTEXT.md references `#login-view` / `#app-view` in `index.html` — Grep found neither.** The login wall is implemented in `src/main.js`, likely by toggling a class/visibility on `<body>` or `#app` rather than swapping DOM views. The planner must Read `src/main.js:360–410` (only those lines) to confirm exact mechanism before writing the removal task.
- `public/services/auth.js` is the canonical AuthService (Firebase compat v8 per CONTEXT.md — not verified in this research pass).
- `src/features/favorites-storage.js` (fully read, 72 lines) — reader-only helper, returns array of `{id, media_type, poster_path, title, added_at}`. Already handles legacy-key migration (`favorites` → `liked_items`, `watchlist` → `watchlist_items`). **Writers** live in `src/features/detail.js` per the file's own comments.

### Industry patterns for action-triggered auth (reference research)
- **Letterboxd web:** Browse all public lists/films without auth; modal slides up on rate/like/list-add click. [CITED: letterboxd.com behavior, 2026]
- **Pinterest:** Full visual browse without auth; soft-wall after N searches via modal that says "Sign up to save Pins". [CITED: pinterest.com, 2026]
- **Reddit:** Read-only browse; modal on upvote/comment/subscribe with deep-link return after auth. [CITED: reddit.com, 2026]
- **Common UX pattern:** modal explains **why** auth is needed for that specific action (not generic "please log in"). Example copy: "Listeyi paylaşmak için giriş yap — kayıtlı listen, beğenilerin ve önerilerin korunur."

### `requireAuth()` API design

```js
// src/features/auth-modal.js (new)
/**
 * Opens auth modal for a gated action. Returns a Promise that:
 * - resolves with the User object after successful sign-in
 * - rejects with AbortError if user cancels the modal
 * @param {object} options
 * @param {string} options.action - i18n key for the action context ('rateMovie', 'shareList', etc.)
 * @returns {Promise<User>}
 */
export async function requireAuth({ action }) { ... }
```

Caller pattern:
```js
try {
  const user = await requireAuth({ action: 'rateMovie' });
  await postRating(user, ratingValue);
} catch (e) {
  // user cancelled — silent no-op
}
```

### LocalStorage → Firestore migration

**Trigger:** `onAuthStateChanged` fires with a non-null user AND `localStorage.lumi_migrated_v1 !== 'true'`.

**Steps:**
1. Read `liked_items` and `watchlist_items` from localStorage (via existing `loadFavoritesItems`).
2. Read existing Firestore `users/{uid}/favorites` and `users/{uid}/watchlist`.
3. Compute union by `id` (dedup; Firestore wins on `added_at` conflict — i.e., earlier `added_at` is preserved).
4. Batch-write missing items to Firestore using **WriteBatch** (max 500 ops per batch — well within limits for this dataset). [CITED: Firebase Firestore docs]
5. On success: set `localStorage.lumi_migrated_v1 = 'true'`. **Do not clear localStorage** — keep it as a write-through cache so app works offline / on signout.

**Idempotency rules:**
- Use **`set(doc, data, { merge: true })`** so re-runs are safe.
- Document ID = TMDB item ID (`${id}`), so write order doesn't matter.
- Version the migration flag (`lumi_migrated_v1`) so future migrations can rerun.

**Edge cases:**
- User signs in on multiple devices → second device's localStorage may differ from Firestore; merge logic must run on each device's first auth.
- Sign-out → keep localStorage cache intact; user resumes as guest with last-known state.
- Sign-up vs. sign-in: same code path; the trigger is "first auth event of this localStorage's lifetime".

**Failure handling:**
- If Firestore write fails: leave migration flag unset → retry on next auth event. Log to console with structured payload (so Phase 6 monitoring can surface).
- Display non-blocking toast: "Senkronize ediliyor..." → "Senkronizasyon tamamlandı" / "Senkronizasyon başarısız — tekrar deneneceğiz".

### Pitfalls

- **The login wall removal must not break existing-user flows.** Anyone who currently has the app open and is logged in should remain logged in; `onAuthStateChanged` continues to fire. Only the **forced gate** at app entry is removed.
- **Don't reload the page after auth.** The wizard / modal should resolve in place. Page reloads break the deep-link return pattern.
- **Race condition:** user clicks "Beğen" → modal opens → user signs in → modal resolves → migration starts → migration writes the in-progress "Beğen" item again. Solution: gate the rating/favorite write **behind** the migration's completion (or merge in both directions; `set({merge: true})` makes this safe).
- **Firestore offline persistence** is on by default in Firebase v8 compat for mobile web. Migration writes will queue if offline. [CITED: Firebase docs]
- **Anonymous auth alternative:** Firebase supports anonymous auth → upgrade to credentialed on sign-in. **Not recommended** here because it complicates Firestore security rules (`request.auth.uid` is non-null for anonymous users too). Stick with localStorage-as-guest pattern.

### Confidence
- Codebase facts: **MEDIUM** (login wall mechanism inferred; planner must verify lines 360–410)
- Firebase migration pattern: **HIGH** [CITED: Firebase docs]
- UX patterns: **MEDIUM-HIGH** (industry-standard, multiple reference apps)

---

## Sub-phase 4.4 — Onboarding Flow

### Industry baseline
- **Spotify mobile onboarding:** 3 screens — language, genres, artists. Skippable on screens 2/3. Total time ~30s. [CITED: Spotify 2026 iOS app]
- **Letterboxd:** 1-screen onboarding — username + favorite-4-films grid. [CITED: Letterboxd 2026 iOS app]
- **Instagram:** language → interests → suggested follows. Skippable from screen 2. [CITED: Instagram 2026]
- **Tinder:** birthday → photos → preferences. 5 screens, no skip on the first 2. [CITED: Tinder 2026]

**Pattern consensus:** 3–5 steps max, progress indicator (dots or bar), skip allowed from step 2 onward, mandatory step 1 only when truly necessary.

For Lumi: **3 steps, all skippable** (defaults applied = auto-detected lang + country + zero platforms). This is consistent with the "Movie Night Agent" positioning — friendliness over hand-holding.

### Step-by-step UX

**Step 1: Language confirm**
- Pre-selected: auto-detected from `navigator.language`
- UI: large language label ("Türkçe / Turkish") + "Doğru mu?" yes/no + chevron to alternative list
- Source: hardcoded array of 8 supported langs (the dictionary keys)
- Persist: write to `localStorage.appLanguage` (existing key) + update `i18n.setLanguage()`

**Step 2: Country confirm**
- Pre-selected: auto-detected from `api/geoip`
- UI: flag emoji + country name + override link
- Source: TMDB `/configuration/countries` (cached) — returns all ISO 3166-1 alpha-2 codes with English names. Alternative: hardcoded shortlist of ~30 top-watching countries. **Recommend shortlist** for v1 (faster, smaller payload).
- Persist: `localStorage.lumi_locale.country`

**Step 3: Owned streaming platforms (multi-select)**
- Source: TMDB `/watch/providers/tv?watch_region={CC}` — returns array of `{provider_id, provider_name, display_priority, logo_path}`. [VERIFIED: TMDB API docs]
- Sort: by `display_priority` (TMDB's curated relevance rank per region)
- Limit: top 20 for region (otherwise overwhelming on mobile)
- UI: grid of logo chips (3 columns on mobile), tap to toggle, visual checkmark on selected
- Skip: "Sonra eklerim" → empty array stored
- Persist: `localStorage.lumi_onboarding.ownedPlatforms = [provider_id, ...]`

### Persistence schema

```json
// localStorage.lumi_onboarding (guest)
{
  "lang": "tr",
  "country": "TR",
  "ownedPlatforms": [8, 337, 350],
  "completedAt": 1715500000000,
  "skipped": ["step3"]   // optional, for analytics
}

// localStorage.lumi_onboarding_seen = "true"   (separate flag — prevents re-show even if completion abandoned)

// Firestore users/{uid}.preferences (auth)
{
  "lang": "tr",
  "country": "TR",
  "ownedPlatforms": [8, 337, 350],
  "completedAt": Timestamp,
  "version": 1
}
```

### UI choice: bottom sheet vs full-screen

CONTEXT.md leaves this to discretion. **Recommendation: full-screen wizard.**
- Bottom sheet implies "this is dismissible"; first-launch onboarding should feel committed.
- Full-screen lets us go poster-heavy (per CONTEXT.md visual direction): step 1 with a movie collage background, step 2 with a world-map graphic, step 3 with a logo grid.
- Skip option on each step (CTA in top-right) maintains friendliness.
- Animate transitions horizontally (slide left for next, right for back).

### Common pitfalls
- **Showing wizard on every load if localStorage fails to write** → use **two flags**: `lumi_onboarding_seen` (always set on first view, prevents re-show) and `lumi_onboarding_completed` (set on final step submit). Re-show only if BOTH unset.
- **Blocking the wizard on TMDB platforms fetch** → step 3 lazy-loads. If fetch fails, show "Sonra eklersin" message and skip directly. Don't block the user.
- **Hardcoding platform IDs that change** → TMDB's `provider_id` is stable; safe to store as int. But provider availability per region changes; refetch on every onboarding.
- **Re-showing wizard after user signs in** → wizard must check Firestore prefs after auth resolves; if prefs already exist, skip wizard even if local flag is unset (cross-device scenario).

### Confidence
- TMDB `/watch/providers/tv` endpoint: **HIGH** [VERIFIED: TMDB API docs]
- UX patterns: **HIGH** (multiple reference apps observed)
- Persistence schema: **HIGH** (straightforward)

---

## Sub-phase 4.5 — Active Series Broadcast Info

### Current state (VERIFIED via Grep)
- `src/features/detail.js:1109–1113` already consumes `details.next_episode_to_air.air_date`, `.name`, `.season_number`, `.episode_number`. The fetch is already happening; rendering uses `toLocaleDateString('tr-TR', …)` — a hardcoded locale that must become dynamic.
- `src/services/streaming-cache.js:101–105` already iterates `details.networks`. The infrastructure for surfacing network info is partially there.
- `src/data/turkish-platform-catalog.json` explicitly **excluded** broadcast networks from streaming catalog (Show TV, ATV, TRT, Star TV were removed in r14c per git log) — this confirms the separation Phase 4.5 needs.

### TMDB field reliability for "currently airing"

| Field | Best for | Notes |
|---|---|---|
| `status` | "Returning Series" / "Ended" / "Canceled" / "In Production" / "Pilot" / "Planned" | Most reliable single signal. [VERIFIED: TMDB API] |
| `next_episode_to_air` | Active scheduling — most reliable for "airing now" | If non-null, definitely airing in near future. Can be null even for active shows in mid-season break. |
| `last_air_date` | "Has aired before" | Doesn't distinguish active vs ended. |
| `networks` | Display | Array of `{id, logo_path, name, origin_country}`. [VERIFIED: TMDB API] |
| `in_production` | Production-stage flag | True even for shows between seasons. Less useful than `status`. |

**Recommended detection logic (per CONTEXT.md):**
```js
const isActivelyAiring =
  details.status === 'Returning Series' ||
  details.next_episode_to_air != null;
```

This is the union (logical OR) — covers shows in mid-season break (`status='Returning Series'` but `next_episode_to_air=null`) and shows with confirmed upcoming episode (`next_episode_to_air != null`). **Confidence: HIGH** [VERIFIED via TMDB API docs and `src/features/detail.js:1109`].

### `networks` array structure
```json
{
  "id": 16,
  "logo_path": "/wfFNDl1USfobF7sGOoxoMZSiK1L.png",
  "name": "CBS",
  "origin_country": "US"
}
```
TMDB serves logos at `https://image.tmdb.org/t/p/{size}{logo_path}`; sizes include `w45`, `w92`, `w154`, `w185`, `w300`, `w500`, `original`. Use `w92` or `w154` for mobile. [VERIFIED: TMDB image config]

### TR broadcast network handles (per CONTEXT.md)
| Network | Domain | TMDB ID (likely) | Logo source |
|---|---|---|---|
| Show TV | showtv.com.tr | 1280 [ASSUMED] | curated local PNG (TMDB may have outdated logo) |
| ATV | atv.com.tr | 1330 [ASSUMED] | curated local PNG |
| TRT 1 / TRT 2 / trtizle | trtizle.com | varies [ASSUMED] | curated local PNG (treat TRT as umbrella) |
| Star TV | startv.com.tr | 1268 [ASSUMED] | curated local PNG |
| Kanal D | kanald.com.tr | 1283 [ASSUMED] | curated local PNG |
| FOX TR (now defunct, rebranded to NOW TV in 2024) | now.com.tr | varies | curated local PNG |

**[ASSUMED]:** Network TMDB IDs above are not verified in this research; the planner should fetch `/network/{id}` or look them up via a known TR series detail JSON before hardcoding. [VERIFIED: TMDB endpoint `/network/{id}` exists]

### Relative date formatting

```js
const rtf = new Intl.RelativeTimeFormat(currentLang, { numeric: 'auto' });
const diffDays = Math.round((new Date(airDate) - Date.now()) / 86400000);
const relative = rtf.format(diffDays, 'day');
// "yarın" (tr), "in 3 days" (en), "morgen" (de), etc.
```

Combine absolute and relative for clarity: `"Bugün 20:00 · S5 E12"` or `"3 gün sonra · S5 E12 · 15 Mayıs"`. [CITED: MDN Intl.RelativeTimeFormat]

### Other regions (in-scope decision)

CONTEXT.md says "Catalog overlay for TR broadcast networks" only. **Confirmed deferred:** BBC (UK), CBS/NBC/ABC (US), TF1/Canal+ (FR), and other regions' overlays are **out of scope for Phase 4.5**. TMDB-supplied logos and names render automatically for non-TR networks (we just won't curate logos / deep links for them). This is acceptable for v1 because:
- TMDB already has logos for major Western networks
- TR is the launch-market priority
- Per-region overlays are an iterative addition

### Visual layout (discretion area)

Recommended treatment: **separate card with distinct visual identity**:
- Card title: "📺 Yayın Kanalı" / "📺 Airing on"
- Layout: network logo (left, 48×48) + name + next-episode info (right column, smaller text)
- Position: **above** "Nerede İzlenir" section (since for an actively-airing show, the broadcast info is the more immediate answer)
- Visual: warm accent color (vs. cool blue for streaming) to differentiate semantically

### Common pitfalls
- **Timezone handling:** `next_episode_to_air.air_date` is **date-only** (no time, no TZ). Don't apply `toLocaleString` with time components — it'll show "00:00" misleadingly. Show date + optionally air-time-string if available from network metadata (none in TMDB; would need external source).
- **`networks` can be empty** for some series (rare). Handle gracefully — hide section.
- **Multiple networks** (international co-productions) — show primary by `origin_country` matching user country, or first.
- **`status` typos:** TMDB returns exactly `'Returning Series'` with capital R and S. Don't use `.toLowerCase()` comparison.

### Confidence
- TMDB field semantics: **HIGH** [VERIFIED: TMDB API + existing code in detail.js]
- TR network IDs: **LOW** [ASSUMED — needs lookup]
- Visual layout: **MEDIUM** (recommendation, not mandate)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Locale tag parsing | Custom `.split('-')` | `new Intl.Locale(tag)` | Handles `zh-Hans-CN`, normalizes casing, exposes `.language` / `.region` |
| Relative date strings ("3 days ago") | Custom day-diff strings | `Intl.RelativeTimeFormat` | Native, localized, 9-line implementation; covers all 8 supported langs |
| Plural rules ("1 episode" vs "2 episodes") | If/else `n === 1` | `Intl.PluralRules` | Required for Slavic / Arabic / etc. when we expand languages |
| Number formatting (ratings, view counts) | `.toFixed(1)` everywhere | `Intl.NumberFormat` | Locale-aware decimal/thousands separators |
| `Accept-Language` parsing | Library | 6-line inline function | RFC 9110 grammar is trivial; npm package is overkill at Edge |
| Country-code → flag emoji | Lookup table | Unicode regional indicator math: `String.fromCodePoint(...[...cc].map(c=>0x1F1A5+c.charCodeAt(0)))` | One-liner; no library |
| Firestore migration batching | Sequential writes in a loop | `db.batch()` + `.commit()` | 500-op batches, atomic, faster |
| Onboarding step transitions | Custom carousel | CSS `transform: translateX()` + transition | Lighter than carousel libs; mobile-only target |
| Auth modal | Roll your own | Reuse existing `public/services/auth.js` flow | Already integrated; wrap in modal shell |

---

## Common Pitfalls (Cross-cutting)

### Pitfall 1: `t()` returning the key on miss leaks dev strings to UI
**Where:** `public/i18n.js:976` — `return lang[key] || key`
**Detection:** UI shows camelCase strings like "aiInputLabel"
**Fix:** Fallback chain `currentLang → en → key` (proposed above)
**Verification:** Vitest test that confirms missing key in `tr` falls back to `en`, not the key

### Pitfall 2: Login wall removal accidentally breaks existing-user auth flow
**Where:** `src/main.js:369–387`
**Detection:** Logged-in users see guest UI after redeploy
**Fix:** Only remove the **forced gate**; keep `onAuthStateChanged` listener intact and let UI react (show "Profilim" tab vs "Giriş" CTA)
**Verification:** Vitest mocked-auth test + manual QA on a logged-in browser

### Pitfall 3: Migration runs twice (loses idempotency)
**Where:** Auth state listener firing on every page load
**Detection:** Duplicate items appearing in Firestore; or migration timestamp updating on every login
**Fix:** Version the flag (`lumi_migrated_v1`); check **before** running. Use `set({merge: true})` so even if it does run twice, no data loss
**Verification:** Vitest unit test that calls migration twice and asserts no Firestore writes on the second call

### Pitfall 4: Onboarding shows again after sign-in (cross-device)
**Where:** Onboarding trigger logic
**Detection:** User reports re-onboarding on second device
**Fix:** After auth resolves, await Firestore `users/{uid}.preferences` read; if exists, hydrate to localStorage and skip wizard
**Verification:** Integration test simulating "fresh device + existing user" auth flow

### Pitfall 5: Broadcast section flashes briefly for ended shows
**Where:** `src/features/detail.js` render timing
**Detection:** Card appears for ~100ms then disappears as detail data resolves
**Fix:** Render broadcast section only after `details` Promise resolves; don't render with optimistic / placeholder data
**Verification:** Snapshot test of detail.js render output with `status='Ended'` fixture

### Pitfall 6: TMDB `language=tr-TR` cache fragmentation
**Where:** `api/search.js`, `api/tmdb.js`
**Detection:** Vercel CDN cache hit rate drops after lang param goes dynamic; latency increases
**Fix:** Include `lang` in cache key (Vercel does this automatically if param is in URL). Pre-warm cache for top 3 langs (`tr`, `en`, `de`) via cron, if performance suffers
**Verification:** Compare cache headers before/after deploy

### Pitfall 7: GeoIP returning the Edge server's region, not the user's
**Where:** `api/geoip.js:15` — `fetch('https://ipapi.co/json/')`
**Detection:** All users from one Vercel region get the same country
**Fix:** Pass `x-forwarded-for` to ipapi.co: `fetch('https://ipapi.co/json/', { headers: { 'X-Forwarded-For': request.headers.get('x-forwarded-for') } })` — or switch to Vercel's built-in `request.geo.country` (Edge runtime exposes this for free, NO third-party call needed). [CITED: Vercel Edge docs — `request.geo` available in Edge Functions]
**Verification:** Test with VPN to TR/US/DE; confirm correct country returns

---

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest 4.0.17 |
| Config file | (none detected at root — defaults assumed) |
| Quick run command | `npm test` (which runs `vitest run`) |
| Full suite command | `npm test` |
| UI mode | `npm run test:ui` |

### Phase Requirements → Test Map

| Sub-phase | Behavior | Test type | Command | File status |
|---|---|---|---|---|
| 4.1 | `t()` fallback chain (currentLang → en → key) | unit | `vitest run tests/i18n.test.js` | ❌ Wave 0 — create |
| 4.1 | All TR keys exist in EN (coverage check) | unit | `vitest run tests/i18n-coverage.test.js` | ❌ Wave 0 — create |
| 4.1 | `api/search.js` accepts `lang` param and maps to BCP 47 | unit | `vitest run tests/api-search.test.js` | ❌ Wave 0 — create or extend |
| 4.2 | `navigator.language` parsing handles `zh-Hans-CN`, etc. | unit | `vitest run tests/locale.test.js` | ❌ Wave 0 — create |
| 4.2 | `Accept-Language` parse function returns sorted preferences | unit | `vitest run tests/accept-language.test.js` | ❌ Wave 0 — create |
| 4.2 | GeoIP fallback chain resolves in priority order | unit | `vitest run tests/locale.test.js` | ❌ Wave 0 — create |
| 4.3 | `requireAuth()` resolves on sign-in, rejects on cancel | unit | `vitest run tests/auth-modal.test.js` | ❌ Wave 0 — create |
| 4.3 | Migration is idempotent (second run = no-op) | unit | `vitest run tests/migration.test.js` | ❌ Wave 0 — create |
| 4.3 | Migration merges Firestore + localStorage by id union | unit | same | ❌ Wave 0 |
| 4.3 | Migration flag prevents re-run | unit | same | ❌ Wave 0 |
| 4.4 | Onboarding completion sets both flags | unit | `vitest run tests/onboarding.test.js` | ❌ Wave 0 — create |
| 4.4 | Onboarding skipped from step 1 still sets `seen` flag | unit | same | ❌ Wave 0 |
| 4.4 | Cross-device: existing Firestore prefs skip wizard | integration | `vitest run tests/onboarding-cross-device.test.js` | ❌ Wave 0 — create |
| 4.5 | `isActivelyAiring()` returns true for `Returning Series` OR `next_episode_to_air != null` | unit | `vitest run tests/broadcast.test.js` | ❌ Wave 0 — create |
| 4.5 | `isActivelyAiring()` returns false for `Ended` + null next-episode | unit | same | ❌ Wave 0 |
| 4.5 | TR network overlay returns correct logo path for Show TV / ATV / TRT / Star TV | unit | same | ❌ Wave 0 |
| 4.5 | `Intl.RelativeTimeFormat` returns expected strings per lang | unit | same | ❌ Wave 0 |
| All | Manual mobile QA on staging | manual | (browser DevTools mobile + real iPhone) | manual |

### Sampling Rate
- **Per task commit:** `npm test` (full vitest suite — currently small, fast)
- **Per wave merge:** `npm test` + manual mobile QA
- **Phase gate:** All vitest green + manual flow QA (onboarding + auth modal + detail page on a TR series with active broadcast)

### Wave 0 Gaps
- [ ] `tests/i18n.test.js` — fallback chain
- [ ] `tests/i18n-coverage.test.js` — EN ⊇ TR keyset
- [ ] `tests/locale.test.js` — navigator/Intl.Locale parsing
- [ ] `tests/accept-language.test.js` — backend header parsing
- [ ] `tests/api-search.test.js` — `lang` param plumbing
- [ ] `tests/auth-modal.test.js` — requireAuth flow
- [ ] `tests/migration.test.js` — Firestore migration idempotency
- [ ] `tests/onboarding.test.js` — wizard completion logic
- [ ] `tests/broadcast.test.js` — TV active-airing detection
- [ ] `tests/fixtures/tmdb-tv-returning-series.json` — TMDB fixture (Returning Series)
- [ ] `tests/fixtures/tmdb-tv-ended.json` — TMDB fixture (Ended)
- [ ] `tests/fixtures/firebase-mock.js` — Firestore stub helpers

---

## Runtime State Inventory

> Phase 4 includes a non-trivial **rename / migration**: the login wall is being removed and storage is migrating from localStorage to Firestore for authenticated users. Inventory:

| Category | Items Found | Action Required |
|---|---|---|
| **Stored data** | `localStorage`: `appLanguage`, `liked_items`, `watchlist_items` (+ legacy `favorites`, `watchlist` already migrated in 03.2-01). Firestore: not yet populated for non-test users. | 4.3 task must implement one-way migration localStorage → Firestore on first auth; keep localStorage as cache. |
| **Live service config** | None directly affected; TMDB / Gemini / Firebase configs unchanged. | None. |
| **OS-registered state** | None (web app; no OS-level registrations). | None. |
| **Secrets / env vars** | `TMDB_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_*` in Vercel env. None renamed. | None. |
| **Build artifacts** | Vercel build cache; no installed-package state changes. | Vercel automatically rebuilds on deploy. |

**New localStorage keys introduced this phase:**
- `lumi_locale` — `{lang, country, source}` (4.2)
- `lumi_onboarding` — `{lang, country, ownedPlatforms[], completedAt}` (4.4)
- `lumi_onboarding_seen` — boolean flag (4.4)
- `lumi_onboarding_completed` — boolean flag (4.4)
- `lumi_migrated_v1` — migration completion flag (4.3)

The planner should document these in a single migration-keys table in PLAN.md so future phases can reference them.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Vitest | All sub-phase tests | ✓ (package.json) | 4.0.17 | — |
| Firebase compat v8 | 4.3 auth + Firestore | ✓ (per CONTEXT.md, used in Phase 3) | (unverified in this pass) | — |
| Vercel Edge Functions | `api/geoip.js`, `api/search.js`, `api/gemini.js` | ✓ (already deployed) | — | — |
| TMDB API | 4.1, 4.4, 4.5 | ✓ (already integrated) | v3 | — |
| ipapi.co (free tier) | 4.2 geoip | ✓ (current) | — | `request.geo.country` (Vercel Edge built-in, recommended replacement) |
| `Intl.*` browser APIs | 4.1, 4.2, 4.5 | ✓ (all target browsers — Safari 14+, Chrome 89+) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** ipapi.co is replaceable by Vercel's built-in `request.geo.country` (free, no rate limit, faster). Recommend swap.

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|---|---|---|---|
| Hardcoded `tr-TR` everywhere | BCP 47 lang param plumbed end-to-end | Phase 4.1 | Backend TMDB cache fragments by lang (positive: correct localization; negative: lower hit rate per language — mitigatable with cron warm-up) |
| Inline JS i18n dictionary | Per-language JSON modules with lazy loading | (deferred — not this phase) | Smaller initial JS payload, translator-friendly format |
| ipapi.co third-party proxy | Vercel Edge built-in `request.geo.country` | recommend swap in 4.2 | Eliminates external dependency, faster, no rate limit |
| Full-screen login wall | Optional auth + action-triggered modal | Phase 4.3 (this phase) | Higher conversion (industry-standard pattern); aligns with Letterboxd/Pinterest |
| Login wall via JS view-toggle | Same, but always shows `#app` view; auth only required for specific actions | Phase 4.3 | Architectural simplification |

**Deprecated / outdated in current codebase:**
- `api/search.js:56` hardcoded `tr-TR` — to be replaced
- `i18n.t(key)` fallback to raw key — to be replaced with EN fallback chain
- `src/main.js:369–387` forced login wall — to be removed

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | No call site relies on `t()` returning raw TR string for unknown key | 4.1 | Low — fallback to EN is the strict-better behavior; would only "regress" if a translator deliberately leaked an English string as a TR fallback |
| A2 | ipapi.co at Vercel Edge resolves to the user's IP (not Edge server) | 4.2 | Medium — if wrong, all users get same country until fix. Switch to `request.geo.country` (Vercel built-in) is the safer path. |
| A3 | TR network TMDB IDs (Show TV=1280, ATV=1330, Star TV=1268, Kanal D=1283) | 4.5 | Low — affects only the TR overlay catalog; mismatched IDs mean missing logo (graceful degradation to TMDB default) |
| A4 | Firebase compat v8 SDK is already integrated (per CONTEXT.md) | 4.3 | Medium — if v9 modular SDK is actually in use, migration code patterns change (`db.batch()` → `writeBatch(db, ...)`) |
| A5 | `src/main.js:369–387` is the only place the login wall is enforced | 4.3 | Medium — planner should Read those lines + adjacent ~50 lines to verify before drafting removal task |
| A6 | TMDB `/watch/providers/tv?watch_region={CC}` returns 20+ providers for all target regions | 4.4 | Low — if a region returns fewer, UI gracefully shows what's available |

---

## Open Questions

1. **Onboarding: full-screen vs bottom sheet** — recommend full-screen; user discretion.
2. **i18n: inline dictionary vs per-language JSON files** — recommend keep inline for this phase, migrate later.
3. **GeoIP: keep ipapi.co or swap to Vercel `request.geo.country`** — strongly recommend swap (free, faster, no rate limit, no third-party dependency).
4. **Action-triggered auth modal: synchronous Promise vs. event-based** — recommend Promise-based `requireAuth()` for ergonomic `await` usage.
5. **Onboarding 4.4 step 2 country source: TMDB `/configuration/countries` or hardcoded shortlist** — recommend shortlist (~30 countries) for performance; expand later.
6. **Should community-ratings placeholder UI exist at all in 4.3**, given community ratings are descoped? CONTEXT.md says "placeholder OK". Recommend a single CTA button that opens a "Yakında" toast — no full UI scaffolding.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED] `public/i18n.js` (full file read, 1032 lines)
- [VERIFIED] `api/geoip.js` (full file read, 50 lines)
- [VERIFIED] `src/features/favorites-storage.js` (full file read, 72 lines)
- [VERIFIED] `package.json` (test scripts + deps via Grep)
- [VERIFIED] `src/features/detail.js:1058, 1078, 1109–1113` (broadcast field consumption via Grep)
- [VERIFIED] `src/services/streaming-cache.js:101–105` (networks iteration via Grep)
- [VERIFIED] `src/data/turkish-platform-catalog.json` (broadcast networks explicitly excluded from streaming catalog, per its own `_doc`)
- [VERIFIED] `api/search.js:56` (`language: 'tr-TR'` hardcode via Grep)
- [VERIFIED] `.planning/phases/04-global-foundation/04-CONTEXT.md` (full read)

### Secondary (MEDIUM confidence — external docs)
- [CITED] MDN — `navigator.language`, `Intl.Locale`, `Intl.RelativeTimeFormat`, `Intl.DateTimeFormat`, `Intl.PluralRules`
- [CITED] TMDB API docs — `language` param requires BCP 47; `/watch/providers/tv?watch_region={CC}` endpoint; `/configuration/countries`; image base URL + sizes
- [CITED] Firebase Firestore docs — `WriteBatch` 500-op limit; `set({merge: true})` idempotency; offline persistence default
- [CITED] Vercel Edge docs — `request.geo.country` available for free in Edge runtime
- [CITED] RFC 9110 §12.5.4 — `Accept-Language` grammar
- [CITED] RFC 5646 — BCP 47 language tags

### Tertiary (LOW confidence — UX patterns)
- Letterboxd / Pinterest / Reddit / Spotify / Instagram / Tinder observed UX patterns (2026)

---

## Metadata

**Confidence breakdown:**
- Standard stack (zero-dep, native APIs): **HIGH** — package.json + MDN verified
- 4.1 i18n: **HIGH** — file fully read, audit method actionable
- 4.2 locale detection: **MEDIUM-HIGH** — ipapi.co behavior at Edge needs runtime verification (Assumption A2)
- 4.3 auth: **MEDIUM** — login wall mechanism inferred from comment, not from full file read (Assumption A5)
- 4.4 onboarding: **HIGH** — TMDB endpoint verified, UX pattern well-established
- 4.5 broadcast: **HIGH** for TMDB semantics; **LOW** for TR network IDs (Assumption A3)
- Pitfalls: **HIGH** — derived from existing-code evidence + standard Firebase/TMDB practice

**Research date:** 2026-05-12
**Valid until:** 2026-06-11 (30 days — stack is stable; refresh if Firebase SDK is found to be v9 modular instead of v8 compat)
