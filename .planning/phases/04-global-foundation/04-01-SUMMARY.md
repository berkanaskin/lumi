---
phase: 04-global-foundation
plan: 01
status: complete
completed: 2026-05-12
commits:
  - 4222943 feat(04-01): EN-first fallback chain + 5 stub language dictionaries
  - 7ea636a feat(04-01): plumb lang param through TMDB + Gemini APIs
  - b6943c3 test(04-01): i18n fallback chain + EN keyset coverage + lang param plumbing
key-files:
  modified:
    - public/i18n.js
    - api/search.js
    - api/tmdb.js
    - api/gemini.js
  created:
    - public/i18n/en.json
    - public/i18n/tr.json
    - public/i18n/es.json
    - public/i18n/fr.json
    - public/i18n/de.json
    - public/i18n/ja.json
    - public/i18n/ko.json
    - tests/i18n.test.js
    - tests/i18n-coverage.test.js
    - tests/api-search-lang.test.js
requirements: [I18N-01, I18N-02, I18N-03, I18N-04]
---

## What was built

EN-first i18n foundation: the `t()` fallback chain now resolves to English when a key is missing in the active language, dropping to the raw key only as a last resort. Default `currentLang` is `'en'`, so first-install users see English UI; TR is opt-in via stored locale. Five stub dictionaries (es, fr, de, ja, ko) are scaffolded so `setLanguage()` cannot crash on a missing bucket. Backend endpoints (`api/search.js`, `api/tmdb.js`, `api/gemini.js`) now accept a `lang` parameter and forward a BCP-47 locale (e.g. `tr-TR`, `en-US`) to TMDB; Gemini prompts include the language's native name (`Türkçe`, `日本語`, …) so AI search results return in the requested language.

## How it was verified

- 25/25 unit tests pass (`tests/i18n.test.js`, `tests/i18n-coverage.test.js`, `tests/api-search-lang.test.js`).
- Fallback chain verified: TR-active+TR-present → TR; missing key in active lang → EN; missing in EN → raw key; default first-install lang → `en`.
- Keyset-coverage test asserts EN ⊇ TR (every TR key has an EN counterpart) — guards against future "raw camelCase leak".
- BCP-47 mapping verified for all 8 supported languages, with native display names for the Gemini prompt prefix.
- `setLanguage("en-US")` normalizes to `en`; stub buckets `es/fr/de/ja/ko` exist as empty objects so the runtime cannot throw.

## Notable deviations

- Wave 1 was orchestrated as a worktree-isolated parallel executor, but the agent paused mid-execution before committing the test files or writing this summary. The orchestrator took over manually: cherry-picked the 2 feature commits from the worktree, corrected one stale test literal (`'Where Do I Watch?'` → `'Where to Watch?'` — actual EN string), committed the tests, and wrote this SUMMARY directly on `main`. No behavioral changes from the plan.
- The orphaned worktree `agent-a765d645f3092d302` is left in place — the agent process is still alive (pid 12944) and forcing removal could destabilize the runtime. Cleanup deferred to phase completion.

## Self-Check: PASSED

All must_haves from PLAN.md verified by the test suite. No regressions in build (`vite` config untouched), no API contract changes for callers that don't pass `lang` (defaults to current behavior).
