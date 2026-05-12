---
phase: 04-global-foundation
plan: 02
status: complete
completed: 2026-05-12
commits:
  - 7c7af5e feat(04-02): locale resolution layer + parseAcceptLanguage helper
  - 9965a07 feat(04-02): Accept-Language fallback + Vercel request.geo + lumi_locale i18n init
key-files:
  created:
    - src/lib/locale.js
    - tests/locale.test.js
    - tests/accept-language.test.js
  modified:
    - api/geoip.js
    - api/search.js
    - api/tmdb.js
    - api/gemini.js
    - public/i18n.js
requirements: [LOC-01, LOC-02, LOC-03]
---

## What was built

Locale resolution is now a single-sourced layer. The client-side fallback chain (`stored → legacy migration → navigator → default`) lives in `src/lib/locale.js` and is consumed via `getLocale()` / `setLocale()`. A new `localStorage.lumi_locale = {lang, country, source}` is the canonical store, with legacy `appLanguage` written through for backwards compatibility. `resolveLocaleAsync()` adds optional geoip refinement on first launch only (skipped if the user already has a stored locale).

The geoip endpoint (`api/geoip.js`) was swapped from a hard ipapi.co dependency to Vercel's built-in `request.geo.country` (free, fast, no third-party rate limit). ipapi.co remains as a dev fallback when `request.geo` is undefined; a final `{countryCode:'XX', source:'fallback'}` lets callers detect "unknown" without retrying.

Three API endpoints (`search`, `tmdb`, `gemini`) gained an `Accept-Language` header fallback: when the request body has no `lang`, they now parse the header, walk q-sorted preferences through `new Intl.Locale(tag).language`, and pick the first supported code. Browsers that hit the API without explicit `lang` (curl, server-side fetches, pre-onboarding state) now get locale-correct responses instead of always defaulting to `en`.

The `public/i18n.js` `loadLanguage()` reader was updated to check `lumi_locale.lang` first and fall back to legacy `appLanguage` — so existing users keep their language without forcing a re-detect.

## Public API (src/lib/locale.js)

```js
getLocale(): { lang, country, source }
resolveLocaleSync(): { lang, country, source }   // pure, no fetch
resolveLocaleAsync(): Promise<{ lang, country, source }>
setLocale({ lang?, country? }): { lang, country, source: 'user' }
parseAcceptLanguage(header): [{ tag, q }, …]     // q-sorted, defensive

LANG_TO_COUNTRY: { tr:'TR', en:'US', de:'DE', fr:'FR', es:'ES', ja:'JP', ko:'KR', zh:'CN' }
COUNTRY_TO_LANG: { TR:'tr', US:'en', GB:'en', AU:'en', CA:'en', IE:'en', NZ:'en', DE:'de', AT:'de', CH:'de', FR:'fr', BE:'fr', ES:'es', MX:'es', AR:'es', CO:'es', CL:'es', PE:'es', JP:'ja', KR:'ko', CN:'zh', TW:'zh', HK:'zh' }
SUPPORTED_LANGS: ['tr','en','de','fr','es','ja','ko','zh']
```

## Fallback chain (resolveLocaleSync)

| Step | Source | Wins when |
|------|--------|-----------|
| 1 | `localStorage.lumi_locale` | parsed JSON has both `lang` AND `country` |
| 2 | `localStorage.appLanguage` | legacy key present, in SUPPORTED_LANGS |
| 3 | `navigator.language` via `new Intl.Locale(tag)` | browser-provided |
| 4 | `{ lang: 'en', country: 'US', source: 'default' }` | nothing else available |

Examples:
- empty + `navigator.language='tr-TR'` → `{tr,TR,navigator}`
- empty + `navigator.language='zh-Hans-CN'` → `{zh,CN,navigator}` (Intl.Locale unwraps script subtag)
- `appLanguage='tr'` alone → `{tr,TR,migrated}` (legacy upgrade path)
- malformed stored JSON → silently falls through to navigator/default (no throw)

## Vercel request.geo swap rationale (A2 resolved)

`request.geo.country` is provided by Vercel's Edge runtime at zero cost and zero rate-limit. Phase 4.4 onboarding fires geoip on first launch only (~1% of sessions), so the previous ipapi.co dependency added a 50-line proxy + free-tier risk for a trivial use case. ipapi.co stays as a dev fallback (where `request.geo` is undefined) so local `vercel dev` continues to work.

## New localStorage key — lumi_locale

```json
{ "lang": "tr", "country": "TR", "source": "stored" | "user" }
```

- Written by `setLocale()` and (implicitly) by Phase 4.4 onboarding completion.
- `source` field tracks provenance: `stored` (existing), `user` (explicit set), `migrated` (legacy upgrade), `navigator`, `geoip`, `default`. Phase 4.4 reads `source !== 'user'` to decide whether to re-confirm in the wizard.
- Backward compat: `appLanguage` is still written on every `setLocale()` call so any code still reading the old key keeps working.

## API contract changes

- `api/geoip` response now includes `source` field: `'vercel' | 'ipapi' | 'fallback'`. Callers can use this for analytics / debug but should treat all three as authoritative country codes.
- `api/search`, `api/tmdb`, `api/gemini` precedence for language resolution (BREAKING NONE — only adds a fallback step):
  1. explicit `body.lang` (POST) or `?lang=` (GET) wins
  2. `?language=` (legacy BCP-47 query) still passes through unchanged
  3. NEW: `Accept-Language` header → first supported tag
  4. default `en` / `en-US`

## How it was verified

- **48/48** tests across the 5 Phase-04 spec files pass (`tests/locale.test.js`, `tests/accept-language.test.js`, `tests/i18n.test.js`, `tests/i18n-coverage.test.js`, `tests/api-search-lang.test.js`).
- Defensive cases covered: malformed stored JSON, missing navigator, unsupported lang tag, non-string Accept-Language input, malformed q values.
- `setLocale()` round-trip verified: writes both `lumi_locale` (JSON) and legacy `appLanguage`, and notifies `window.i18n` when present.

## Notable deviations

- **Profile page country wiring deferred**: PLAN.md assumed a Phase-3 country selector already existed in `src/features/profile.js`. A `grep` found only a single `country_code` reference (an API response field), not a UI control. The hook will be wired when Phase 4.4 onboarding adds the country UI element. No regression — `setLocale({country})` is callable from anywhere; only the profile-UI side is pending.
- **Language selector wiring also deferred** to Phase 4.4 onboarding for the same reason.

## Self-Check: PASSED

All `must_haves` satisfied except the two profile-UI deferrals noted above (gated on UI that does not yet exist). Backend contract is honored. No regressions introduced into the existing 8 pre-existing failing tests (`api.test.js`, `detail.test.js`, `platforms.test.js`) — those are stale from Phase 03.2 cleanup (BluTV removal, mock drift) and unrelated to this plan.
