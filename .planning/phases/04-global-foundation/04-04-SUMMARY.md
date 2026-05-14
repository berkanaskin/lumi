---
phase: 04-global-foundation
plan: 04
subsystem: onboarding
tags: [onboarding, first-launch, wizard, i18n, region, providers, cross-device, firestore]
status: COMPLETE (code) — manual QA (Task 3 checkpoint) pending user verification
completed_date: 2026-05-12
requires:
  - 04-01 (i18n EN-first; t() lookup pattern via window.i18n)
  - 04-02 (locale layer — getLocale/setLocale pre-fills steps 1 & 2)
  - 04-03 (optional-auth; auth is optional, onboarding does NOT re-block guests)
provides:
  - "shouldShowOnboarding({user, db}): first-launch detection with cross-device hydration"
  - "startOnboarding({user, db}): full-screen 3-step wizard mount"
  - "completeStep(n, data, {user, db}): per-step persistence (localStorage + optional Firestore)"
  - "skipOnboarding({user, db}): one-tap exit with defaults"
  - "fetchProviders(country): TMDB watch/providers/tv with sort+cap"
  - "COUNTRY_SHORTLIST (31 codes): hardcoded v1 list"
affects:
  - src/main.js (boot-time bootOnboardingCheck — fire-and-forget, awaits onAuthStateChanged)
  - index.html (loads src/styles/onboarding.css)
  - public/i18n.js (TR + EN: 11 onboarding.* keys)
tech_stack:
  added:
    - "Unicode regional-indicator flag emoji helper (String.fromCodePoint over 0x1F1A5 + ASCII offset)"
    - "Vanilla DOM-built full-screen wizard with CSS transform-based slide transitions (no framework)"
  patterns:
    - "Two-flag pattern: lumi_onboarding_seen (rendered once) + lumi_onboarding_completed (step 3 submitted OR skipped)"
    - "Versioned preferences schema: localStorage.lumi_onboarding + Firestore users/{uid}.preferences.version=1"
    - "Fire-and-forget Firestore writes via .catch?.(...) — never block UI on remote sync"
    - "Fail-open shouldShowOnboarding(): Firestore errors → return true so user can configure rather than be silently blocked"
    - "One-shot onAuthStateChanged Promise at boot (avoids currentUser-is-null race)"
key_files:
  created:
    - src/features/onboarding.js
    - src/styles/onboarding.css
    - tests/onboarding.test.js
    - tests/onboarding-cross-device.test.js
    - tests/fixtures/tmdb-watch-providers-tr.json
  modified:
    - src/main.js
    - public/i18n.js
    - index.html
decisions:
  - "api/tmdb.js proxy uses ?endpoint= (not ?path= as the plan hinted) — the plan's path= would have 404'd. fetchProviders constructs /api/tmdb?endpoint=/watch/providers/tv&watch_region={CC} to match the actual proxy contract. No allowlist change in api/tmdb.js needed: proxy passes any TMDB endpoint through."
  - "shouldShowOnboarding fails open (returns true) on Firestore read error — UX preferred over silently blocking config flow."
  - "Cross-device hydration also calls setLocale(prefs) so language switches immediately, not just on next reload."
  - "All step-2/step-3 flag-flip writes use try/catch — onboarding never throws into the boot path."
  - "Boot wiring is fire-and-forget (does not block DOMContentLoaded) — the wizard mounts as an overlay on top of the rendered app."
metrics:
  duration: "~22 min implementation + verification"
  tasks: "2/3 (Task 1 + Task 2 implemented; Task 3 = manual QA checkpoint, awaiting user)"
  files_touched: 8
---

# Phase 04 Plan 04: Onboarding Wizard Summary

One-liner: 3-step full-screen first-launch wizard (lang → country → owned platforms) with TMDB provider fetch, two-flag persistence, and Firestore-backed cross-device hydration — never blocks guests.

## Scope

Greets first-launch users with a wizard that captures the minimum profile needed for region-aware UX and Phase-5 AI recommendations: language, country, and owned streaming platforms. Pre-fills steps 1 and 2 from the locale layer shipped in 04-02 (`getLocale()`). Step 3 lazy-fetches `/watch/providers/tv?watch_region={CC}` and lets the user toggle the top 20 providers by `display_priority`. Every step is skippable; skipping flips both flags so the wizard never reappears. Authenticated users sync to Firestore `users/{uid}.preferences` (versioned schema). Authenticated users with existing prefs on a new device get the wizard auto-dismissed and their locale hydrated.

Honors the optional-auth posture from 04-03: **anonymous users can complete the entire flow without signing in**. The wizard never invokes `requireAuth()`.

## State machine + persistence schema

```
shouldShowOnboarding({ user, db })
   ├── lumi_onboarding_completed='true' → false
   ├── lumi_onboarding_seen='true'      → false  (abandoned-but-seen: do not pester)
   ├── user + db + Firestore prefs.version>=1 → false (hydrate LS + setLocale, set both flags)
   └── otherwise                        → true
```

**localStorage shape** (`lumi_onboarding`):
```json
{
  "lang": "tr",
  "country": "TR",
  "ownedPlatforms": [8, 337],
  "completedAt": 1715600000000,
  "skipped": ["step1","step2","step3"]   // only present if skipOnboarding() called
}
```

**Firestore shape** (`users/{uid}.preferences`, written with `merge:true`):
```json
{
  "lang": "tr", "country": "TR", "ownedPlatforms": [8, 337],
  "completedAt": 1715600000000, "version": 1
}
```

**Flags:**
- `lumi_onboarding_seen` — set on `startOnboarding()` (wizard rendered)
- `lumi_onboarding_completed` — set on step-3 submit OR `skipOnboarding()`

Both unset → wizard appears. Either set → wizard suppressed.

## Country shortlist (31 codes)

`TR, US, GB, DE, FR, ES, IT, NL, BE, SE, NO, DK, FI, PL, RU, JP, KR, CN, TW, HK, AU, NZ, CA, MX, BR, AR, CL, AE, SA, IN, ZA` — hardcoded `COUNTRY_SHORTLIST` in `src/features/onboarding.js`. TMDB `/configuration/countries` (full ~250 entries) deferred to a future phase.

## Provider fetch pattern + failure handling

```js
fetchProviders('TR')
   → GET /api/tmdb?endpoint=/watch/providers/tv&watch_region=TR
   → results.sort(asc display_priority).slice(0, 20)
   → on !ok OR throw → []
```

Step 3 renders a loading state, then either the provider grid or the "Sonra eklersin" copy + skip CTA from `onboarding.providers.loadError`. Wizard never blocks on the network — fetch failure does not prevent flag persistence.

## Cross-device hydration mechanism

When the user signs in on a new device:
1. Firebase auth restores → `onAuthStateChanged` fires (one-shot Promise wraps this).
2. `bootOnboardingCheck` calls `shouldShowOnboarding({user, db})`.
3. If `users/{uid}.preferences.version >= 1` exists:
   - Write the same shape to `localStorage.lumi_onboarding`.
   - Set both flags to `'true'`.
   - Call `setLocale({lang, country})` so the i18n layer + locale state catch up immediately.
   - Return `false` → wizard never mounts.
4. Otherwise → wizard mounts normally.

If the Firestore read errors, the function fails **open** (returns `true`) — the user can still configure rather than be silently blocked on a transient network error.

## Boot wiring (src/main.js)

The plan flagged a race risk against `firebase.auth().currentUser` at boot. Implementation uses the mandated one-shot `onAuthStateChanged` Promise pattern:

```js
async function bootOnboardingCheck() {
    let user = null, db = null;
    const auth = window.firebase?.auth?.();
    if (auth) {
        user = await new Promise(resolve => {
            const unsub = auth.onAuthStateChanged(u => { unsub(); resolve(u); });
        });
    }
    if (window.firebase?.firestore) db = window.firebase.firestore();
    if (await shouldShowOnboarding({ user, db })) startOnboarding({ user, db });
}
```

Invoked fire-and-forget from `DOMContentLoaded` so it never blocks main boot. Wraps everything in `try/catch` so a broken Firebase init can't break the rest of `main.js`.

## Resolved A6 (TMDB providers per region)

The plan's A6 (provider count per region) is **accepted with graceful degradation**: the UI renders whatever count TMDB returns, sorted by `display_priority`, capped at the top 20. For TR (the test fixture) ~21 entries are typical (Netflix, Disney+, Prime Video, Max, Apple TV+, BluTV, Gain, Exxen, TOD, Tabii, SkyShowtime, Paramount+, HBO Max, Apple TV, Google Play, Fandango at Home, Rakuten Viki, puhutv, Crunchyroll, etc.). For niche regions returning <5, the "Sonra eklersin" skip CTA is offered prominently. No region was observed to return zero in spot-checks.

## i18n keys added (TR + EN)

`onboarding.skip`, `onboarding.step1.{title,confirm,chooseOther}`, `onboarding.step2.{title,confirm,chooseOther}`, `onboarding.step3.{title,done,skip}`, `onboarding.providers.loadError` — 11 keys total per language. ES/FR/DE/JA/KO stubs deferred (locale layer falls back to EN per 04-01 EN-first).

## Tests

`npx vitest run tests/onboarding.test.js tests/onboarding-cross-device.test.js` → **19/19 green** (16 in onboarding.test.js + 3 in onboarding-cross-device.test.js).

Full suite: 228 pass / 22 todo / 2 skipped / 8 fail. The 8 failures are pre-existing Phase-03.2 cleanup debt in `tests/api.test.js`, `tests/detail.test.js`, `tests/platforms.test.js` and were untouched per executor instructions.

Commits:
- `aebd59a` — test(04-04): RED tests + TMDB fixture
- `a573323` — feat(04-04): state machine + provider fetch + DOM wizard
- `65f003e` — feat(04-04): wizard CSS, i18n TR/EN keys, boot-time onboarding trigger

## Deviations

**[Rule 3 — Blocking issue] API contract mismatch.** Plan specifies `/api/tmdb?path=/watch/providers/tv` but the actual proxy at `api/tmdb.js` reads `?endpoint=` (see lines 51-56). Using `?path=` would yield a 400 ("Missing endpoint parameter"). `fetchProviders` calls `?endpoint=/watch/providers/tv&watch_region={CC}` to match the real proxy contract. The proxy is open-path (no allowlist — it passes any TMDB endpoint), so no api/tmdb.js change was needed (the plan's task 1.3 was a no-op in practice — recorded here so a future reader knows api/tmdb.js was intentionally left unmodified despite the plan listing it under files_modified).

**[Rule 2 — Auto-add missing critical functionality]** Added `try/catch` around every localStorage write in onboarding.js so a SecurityError in private-browsing mode never throws into the boot path. The plan's pseudocode used bare `localStorage.setItem`.

**[Rule 2 — Auto-add missing critical functionality]** Added fail-open behavior to `shouldShowOnboarding` when Firestore read rejects — without it, a transient Firebase outage would block guests with completed-flag=false forever (race with `requireAuth`). Plan said `try {} catch {}` but didn't define what to return; chose `true` so the user can configure rather than be invisibly blocked.

**[Scope]** Task 3 (manual mobile QA — 5 scenarios A-E) is a `checkpoint:human-verify` gate. Code is shipped and unit-tested; manual scenarios require a live browser and (for scenario E) a seeded Firestore doc. **Awaiting user verification.** Pause/resume signal: type "approved" or describe failures.

## Phase 04 Close-Out

All 5 plans complete (code-wise):

| Plan | Subsystem | Status |
|------|-----------|--------|
| 04-01 | i18n EN-first | COMPLETE |
| 04-02 | Locale layer + geo | COMPLETE |
| 04-03 | Optional auth + Firestore migration | COMPLETE |
| 04-04 | Onboarding wizard | COMPLETE (code) — manual QA pending |
| 04-05 | TR broadcast channels | COMPLETE |

**Posture:** Ready for `/gsd-verify-work 04` once Task 3 manual QA is approved. After that, Phase 5 (Premium Agent) is the next planning target.

## Self-Check: PASSED

- `src/features/onboarding.js`: FOUND
- `src/styles/onboarding.css`: FOUND
- `tests/onboarding.test.js`: FOUND
- `tests/onboarding-cross-device.test.js`: FOUND
- `tests/fixtures/tmdb-watch-providers-tr.json`: FOUND
- `src/main.js` contains `shouldShowOnboarding` + `bootOnboardingCheck`: VERIFIED
- `index.html` loads `onboarding.css`: VERIFIED
- `public/i18n.js` contains `'onboarding.step1.title'` in TR + EN blocks: VERIFIED
- Commits `aebd59a`, `a573323`, `65f003e`: FOUND
- 19/19 onboarding tests green; 228/258 full suite (8 fails = pre-existing 03.2 debt): VERIFIED

---

## R1: Cinematic Redesign (2026-05-13)

**Trigger:** Manual QA called the v1 wizard "Paint design". User approved a SceneMatch-inspired direction (Poster Wall + Ken Burns).

**Scope:** Visual + UX redesign only. State machine, persistence, Firestore mirroring, cross-device hydration, public API — **all unchanged**. 19 existing tests stay green.

**What shipped:**

- **5 slides** (was 3): `Welcome → Language → Country → Platforms → Ready`. Storage step numbers (1/2/3) preserved; welcome + ready are pure visual layers.
- **Poster Wall + Ken Burns**: 24-tile grid fetched from `/api/tmdb?endpoint=/trending/all/week` (TMDB w342), 24s scale 1.0 → 1.07 zoom with drift. Falls back to dark gradient tiles on fetch error.
- **Dark-only theme**: forced via `color-scheme: dark` and hard-coded palette, ignores in-app theme.
- **Frosted glass cards**: `backdrop-filter: blur(20px) saturate(180%)`, `rgba(20,20,30,0.55)` bg, 24px radius, soft inner highlight.
- **Top progress pills** (frosted, gradient-filled) replace bottom dots.
- **Back button** (circular glass, top-left, auto-disabled on welcome). **Skip button removed** per brief.
- **Gradient CTA**: `linear-gradient(90deg, #f4a261 → #e76f51 → #ff5d8f)`, 28px radius, shimmer sweep every 2.6s, spring hover scale, pulse-glow on Ready CTA.
- **Direction-aware slide transitions**: `translateX(±240px) scale(0.84) → translateX(∓8px) scale(1.02) → 0 scale(1)` with `cubic-bezier(0.34, 1.56, 0.64, 1)` spring + staggered child rise (80ms × index).
- **Atmospheric glow orbs** (orange #f4a261 + pink #ff5d8f, 360px, blur(80px), 32% opacity, drift over 14-18s) shown only on Welcome + Ready.
- **Country card**: searchable list (filter by code or English name), 31 codes from `COUNTRY_SHORTLIST`, flag emoji + name + animated check.
- **Language card**: TR + EN selectable; DE/FR/ES/JA/KO/ZH marked "coming soon" (disabled, faint).
- **Platforms card**: 3-col tile grid (2-col under 360px wide), gradient border + checkmark badge on select, lazy-loaded TMDB logos.
- **Ready slide**: recap chips (lang · country · N platforms), atmospheric glow, pulsing gradient CTA "Lumi'yi keşfet" / "Discover Lumi".
- **Reduced-motion**: full `prefers-reduced-motion` guard — disables Ken Burns, glow drift, shimmer, slide entry, CTA pulse.

**Performance discipline:**
- Animations use only `transform` + `opacity` (no `width`/`height`/`top`/`left`/`filter` on hot paths).
- `will-change: transform` on the poster wall + glow layers.
- `contain: strict` on the root container.
- Poster images: `loading="lazy"` + `decoding="async"`, opacity fade-in on load.

**Files touched (3, all modified — no new files):**
- `src/styles/onboarding.css` — full rewrite (~535 lines)
- `src/features/onboarding.js` — render path rewritten (state machine + persistence untouched, ~480 lines)
- `public/i18n.js` — added 16 new keys (8 TR + 8 EN) under `onboarding.welcome.*`, `onboarding.lang.*`, `onboarding.country.*`, `onboarding.platforms.*`, `onboarding.ready.*`, `onboarding.next`

**Reused vs new:**
- **Reused:** `fetchProviders` (TMDB watch/providers), TMDB proxy contract (`/api/tmdb?endpoint=...`), `SUPPORTED_LANGS`, `COUNTRY_SHORTLIST`, `getLocale`/`setLocale`, `i18n.t`, `flag()` emoji helper, `completeStep`/`skipOnboarding`/`shouldShowOnboarding`/`startOnboarding` (public API frozen).
- **New:** `fetchPosterWall()` (private, fetches /trending/all/week), `LANG_DISPLAY` + `COUNTRY_NAMES` maps, `LAUNCH_LANGS` allow-list, `el()` DOM builder helper, 5 slide builders (welcome/lang/country/platforms/ready).

**Deviations from brief:**
- Brief said reuse "home-screen carousel asset list already in the codebase" OR `/trending`. Chose **`/trending/all/week`** because the home-screen carousel lives inside `main.js` boot state and isn't exposed as a reusable export — pulling it cleanly would require a refactor outside R1 scope. The `/trending` proxy was already used elsewhere and adds zero new infra.
- Brief said 4×6 grid (24 tiles). Implemented as 4-col grid with auto-rows — at typical 16:9-ish viewports this yields 24 visible tiles (some clipped). Verified at 360/390/430 widths.

**Verification:**
- `npx vitest run tests/onboarding.test.js tests/onboarding-cross-device.test.js` → 19/19 ✅
- Visual eyeball pass at 360px / 390px / 430px (Chrome DevTools mobile preset).

**Commits:** `a99753f` (main implementation), `<this commit>` (R1 docs + state update).

---

## R2: Cinema Grade polish round (2026-05-13)

Two-commit round bringing the wizard up to App Store submission visual bar.

### R2 Commit 1 — `4ff1e24` Functional fixes (haptics + a11y + search + persistence)

- **Haptics:** new `src/lib/haptics.js` with `tap`/`select`/`success` intensities. Uses Capacitor `Haptics` plugin if available, else `navigator.vibrate(...)`. All paths suppressed under `prefers-reduced-motion`. One haptic per interaction — no spam.
- **A11y:** wizard root is `role="dialog"` + `aria-modal="true"` + `aria-labelledby="onb-slide-heading"`. Polite `aria-live` announcer fires "Step N of 6: <name>" on every slide change. Heading auto-focuses; Tab is trapped inside wizard root. Progress pill gains `aria-current="step"` on active. Platform tiles use `aria-pressed`; country options use `role="option"` + `aria-selected`. Visible focus rings.
- **Country search:** debounced 80ms live filter, case + accent insensitive (TR diacritic fold + NFD), empty-state copy `onboarding.country.empty` (TR + EN). When search has focus, the poster wall fades to 30% opacity (`.onb-search-focused`) to reduce distraction.
- **Mid-flow state persistence:** new key `lumi_onboarding_progress` = `{step, picks:{lang,country,platforms,premiumChoice}, savedAt}`. Written on every slide advance + selection change. Hydrated on `startOnboarding()` if `savedAt` is within 7 days and `step > 0`. Cleared on final completion (Ready CTA), on `skipOnboarding()`, and when the dev "Always show" toggle fires.
- **Tests:** added `tests/onboarding-progress.test.js` (9 tests) + `tests/onboarding-country-search.test.js` (7 tests). 28 existing tests stay green → **44/44 onboarding tests green**.

### R2 Commit 2 — `7fd125f` Cinema Grade visuals

- **3-layer parallax poster wall:** back (6×8 w92 / 18px blur / 0.45 op / 30s ken-burns), mid (4×6 w185 / 8px blur / 0.65 op / 24s ± 20px drift), front (3×4 w342 / 0px blur / 0.8 op / 18s + radial vignette). Reuses the SAME 24 trending posters fetched in R1 — no new TMDB calls. Pointer-driven shift on `(hover: hover)` devices.
- **S1 Welcome:** letter-by-letter type-on (30ms stagger), gradient text shimmer (6s loop, slow `background-position` slide). Subtitle + CTA cascade behind it (existing stagger). Whole sequence < 1.6s.
- **S3 Country:** inline ~3KB simplified-continents SVG world map above the country list. Picking a country drops an orange→pink pin at approximate lat/long coordinates with spring overshoot (`translateY(-40px → 0)`, `scale(0 → 1.25 → 1)`) and flashes the country card border for 600ms. Graceful degrade if SVG injection fails.
- **S5 Premium:** vault opening transition (two frosted glass halves slide outward 700ms with spring), feature rows already stagger-fade-in from R1, varied emoji pulse phases (3s loop, `--pulse-delay: 0/0.4/0.8/1.2s`), and pointer-based 3D tilt on each feature row (`perspective(600px) + rotateX/Y`).
- **S6 Ready:** cinema letterbox curtain reveal (two black bars slide outward 800ms), recap chips spring-pop with 100ms stagger, CSS-only confetti burst on final CTA (36 absolutely-positioned divs, brand-gradient colors, random angle + 120-300px throw distance, 1.5s lifecycle), then close.
- **Audio (default OFF):** Web Audio API 35ms 880Hz sine "tick" on every slide advance + chip select. Speaker icon in topbar toggles, preference persisted in `lumi_onboarding_audio`. **Ambient music was dropped** — no CC0 audio asset bundled (per brief).
- **Reduced motion:** parallax, ken-burns, type-on, vault, curtains, confetti, emoji pulse, chip pop are all `animation: none` / `transition: none` under `prefers-reduced-motion: reduce`. Functional transitions still work via opacity fade.

### R2 Verification

- `npx vitest run tests/onboarding*.test.js` → **44/44 green** (28 from R1 + 16 new R2 functional tests).
- Full project suite: 253 passing / 8 stale Phase-03.2 failures (untouched per brief).
- Production build green: `dist/assets/main-*.js` 421.55kB / **131.81kB gzipped**; `main-*.css` 122.74kB / 20.92kB gzipped. Bundle delta vs pre-R2 ≈ +13kB gzipped (well under 40KB budget).
- Performance: all animations on `transform` + `opacity`, `will-change` only on actively animating layers.

### R2 Deviations from brief

- **Ambient music dropped** (explicit out per brief if no CC0 asset). Tick synth retained.
- World map SVG is a hand-drawn ultra-simplified continent shape set (~3KB) — chose this over importing a public-domain detailed map to stay under the 40KB budget while keeping continents recognizable.
- Premium feature 3D tilt only fires on `pointermove` (pointer devices). Touch-only mobile gets the static row (no gyroscope path added — out of scope vs 40KB budget).

**R2 Commits:** `4ff1e24` (functional fixes), `7fd125f` (cinema visuals), `<this docs commit>` (R2 summary + state).



## Round r3 — Platform logos + non-TR region fix (2026-05-14)

- Replaced TMDB-hotlinked logos in TR_CURATED (11) and static fallback (5) with local /img/providers/* paths.
- Removed bogus abc.jpg placeholder; Puhu TV now points at gain/exxen/tabii/tod/puhutv.svg generated placeholders.
- 11 real PNG logos committed for major platforms; 5 SVG gradient placeholders for TR niche (Gain, Exxen, Tabii, TOD, Puhu TV).
- Deleted 5 unusable favicon ICOs (16/32px).
- fetchProviders now uppercases country and filters by display_priorities[cc] before sorting — ensures non-TR users only see providers actually available in their region.
- New test file tests/onboarding-platforms.test.js (5 tests) covers TR locality, US allowlist+region intersection, fallback path.
- Test suite: 258 passed / 8 pre-existing failures (Phase-03.2 stale, untouched).
