---
phase: 04-global-foundation
plan: 05
title: Broadcast / "Airing on" section for actively-airing TV series
status: complete
completed: "2026-05-12"
requirements: [BCAST-01, BCAST-02, BCAST-03]
tags: [i18n, tv-detail, broadcast, networks, tr-overlay]
dependency-graph:
  requires: ["04-01"]
  provides: ["airing-on-card", "tr-broadcast-catalog", "network-logo-overlay"]
  affects: ["src/features/detail.js", "public/i18n.js"]
tech-stack:
  added: ["Intl.RelativeTimeFormat", "Intl.DateTimeFormat"]
  patterns: ["overlay-catalog (byId + byNormalizedName + specialEntries)", "onerror TMDB fallback for missing local PNG"]
key-files:
  created:
    - src/lib/broadcast.js
    - src/data/tr-broadcast-catalog.json
    - tests/broadcast.test.js
    - tests/fixtures/tmdb-tv-returning-series.json
    - tests/fixtures/tmdb-tv-ended.json
    - public/img/networks/showtv.png
    - public/img/networks/atv.png
    - public/img/networks/trt.png
    - public/img/networks/startv.png
    - public/img/networks/kanald.png
  modified:
    - src/features/detail.js
    - src/styles/detail.css
    - public/i18n.js
decisions:
  - "TR network overlay uses byId primary + byNormalizedName fallback so wrong TMDB IDs degrade to TMDB-supplied logos gracefully"
  - "Render gate uses strict equality on status='Returning Series' OR non-null next_episode_to_air (OR-logic, handles Ended-with-reunion-episode)"
  - "Movies excluded up-front in isActivelyAiring() (media_type==='movie' or details.title set)"
  - "Logo <img> has onerror fallback to TMDB URL when local PNG is missing"
  - "Section title localised via i18n key airingOn (TR: 'Yayın Kanalı', EN: 'Airing on'); other languages fall back to EN via existing i18n machinery"
metrics:
  duration: "~25 min finish (post-handoff)"
  tasks_completed: "2 of 2 auto tasks (Task 3 = checkpoint, user-gated)"
---

# Phase 04 Plan 04-05: Broadcast / "Airing on" Section Summary

Restored broadcast-network visibility on TV detail pages (separate from streaming providers) for actively-airing series, with a curated TR network logo overlay (Show TV, ATV, TRT, Star TV, Kanal D) and TMDB-logo passthrough for everything else. Phase 03.2-r14c removed broadcast channels from the streaming catalog; this plan restores them as a distinct UI affordance.

## What shipped

- **`src/lib/broadcast.js`** — three pure exports: `isActivelyAiring(details)`, `getNetworkLogoPath(network)`, `formatNextEpisode(nextEp, lang)`. Plus a helper `getNetworkCatalogEntry` for deep-link URL resolution.
- **`src/data/tr-broadcast-catalog.json`** — overlay catalog with three keys: `byId` (TMDB network ID → entry), `byNormalizedName` (lowercase name → ID-or-special-key), `specialEntries` (TRT umbrella for TRT 1 / TRT 2 / TRT).
- **5 local PNG logos** under `public/img/networks/` — committed as binary assets.
- **`buildBroadcastHTML(details, type)`** in `src/features/detail.js` — renders a `<section class="detail-section detail-airing-info">` ABOVE the streaming card, but only for TV + `isActivelyAiring()` + `networks.length > 0`. Picks the network whose `origin_country` matches the user's `localStorage.lumi_locale.country`, else `networks[0]`.
- **CSS** — warm accent left-border (`#f4a261`), 48×48 logo, name + S/E label + relative date + absolute date row; light-theme override included.
- **i18n** — `airingOn` key added to TR (`'Yayın Kanalı'`) and EN (`'Airing on'`) blocks in `public/i18n.js`. Other languages inherit EN via the existing fallback path.
- **Test coverage** — `tests/broadcast.test.js` runs 17 assertions across 3 export surfaces; all green (`npx vitest run tests/broadcast.test.js` → 17 passed).

## Detection logic (verified)

```
isActivelyAiring(details) =
  details && typeof === 'object'
  && details.media_type !== 'movie'
  && !details.title
  && (details.status === 'Returning Series' || details.next_episode_to_air != null)
```

OR-logic on status/next-episode handles the edge case where TMDB marks a series `Ended` but a reunion/special is announced (non-null `next_episode_to_air`).

## TR catalog structure

| Key | Purpose | Lookup cost |
| --- | --- | --- |
| `byId` | Primary lookup by TMDB network ID (`1280` = Show TV, etc.) | O(1) |
| `byNormalizedName` | Fallback when ID is wrong/unknown — lowercased trimmed name → ID or special key (e.g. `"trt 1" → "trt"`) | O(1) |
| `specialEntries` | Indirection for umbrella networks (TRT 1 / TRT 2 / TRT all resolve to TRT) | O(1) |

Each `byId` entry carries `_todo: "verify ID"` until a user confirms the IDs on a live TR returning series. Wrong ID → byName fallback fires → still resolves locally. Wrong ID AND wrong name → TMDB-logo passthrough (graceful degrade).

## Logo acquisition

- All 5 PNGs were downloaded ahead of the finish handoff (see prior commit f39302c context). Method: official site favicons / press kits, converted to 96×96 PNG.
- `<img onerror>` swaps to `https://image.tmdb.org/t/p/w92${logo_path}` if a local PNG 404s.

## Resolved / unresolved assumptions

| Assumption | Status |
| --- | --- |
| A3 (TR network TMDB IDs) | **Needs verification** — `_todo` markers remain on each `byId` entry. Catalog scaffolded with research-suggested IDs (1280/1330/1283/1268). Verification deferred to post-deploy QA against live TMDB responses. |
| Multi-network handling | Locked: pick by `origin_country` match against `lumi_locale.country`, else `networks[0]`. Multi-network grid display deferred. |
| Timezone | Locked: date-only rendering via `Intl.DateTimeFormat` + `Intl.RelativeTimeFormat`; no synthetic "00:00" time. |
| Logo overlay strategy | Locked: local PNG by overlay → TMDB fallback via `onerror`. |

## Deviations from plan

None — plan executed as written. Pre-existing Phase-03.2 test debt in `api.test.js`/`detail.test.js`/`platforms.test.js` is out of scope per execution scope boundary (Rule: only fix issues directly caused by current-task changes).

## Commits

- `f39302c` — feat(04-05): broadcast lib + TR catalog + tests (17 passing) *(pre-handoff)*
- `44316c8` — feat(04-05): add TR network logos (Show TV, ATV, TRT, Star TV, Kanal D)
- `88a16f1` — feat(04-05): render broadcast section on TV detail with i18n

## Checkpoint pending

Task 3 (Mobile QA — broadcast card on real TR series) is a `checkpoint:human-verify` gate. Not executed here — user-gated and handled by the parent orchestrator.

## Self-Check: PASSED

- `src/lib/broadcast.js` — present
- `src/data/tr-broadcast-catalog.json` — present
- `public/img/networks/{showtv,atv,trt,startv,kanald}.png` — all 5 committed at 44316c8
- `src/features/detail.js` — `buildBroadcastHTML` defined; import wired; render slot above `${streamingHTML}`
- `src/styles/detail.css` — `.detail-airing-info` block present at tail
- `public/i18n.js` — `airingOn` key added to TR (L92) + EN (L268)
- `tests/broadcast.test.js` — 17/17 passing
- Commit hashes `f39302c`, `44316c8`, `88a16f1` all present in `git log`
