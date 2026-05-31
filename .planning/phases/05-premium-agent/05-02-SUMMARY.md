# 05-02 — Paywall sheet + env-split CTA — SUMMARY

**Status:** COMPLETE (code + tests). Awaits the phase-end push.

## Shipped
- `.planning/decisions/PREMIUM-PRICING.md` — trial corrected **7→3 days** (table §1 + §8) with a dated correction note; matches the locked onboarding UI.
- `src/ui/paywall-sheet.js` — self-contained in-app bottom sheet: 4 proactive features + 3 tiers + 3-day trial. `openPaywall({trigger})` / `closePaywall()`. Idempotent; never opens for premium users. **Self-registers** the `lumi:paywall` listener on import (no main.js edit — main.js Read was unstable this session) and exposes `window.openPaywall` for 05-03 feature gates.
- `src/styles/paywall.css` — dark cinematic bottom sheet (pw-* prefixed; zero collision with onboarding).
- **env-split CTA** (PREMIUM-PRICING.md §4): dev → "Mock Premium (dev)" flips the entitlement via `setPremiumMock(true)` (lets the 4 features be tested in-browser) + fires `lumi:premium-unlocked`; prod → store CTA (App Store / Play, UA-routed; URLs are placeholders until Phase 6).
- `src/features/discover.js` — imports the sheet (wires the trigger); adds a low-quota nudge toast ("N ücretsiz AI hakkın kaldı") for free users at ≤2 remaining.

## Design note
Did NOT refactor the onboarding premium slide into a shared component (the plan's DRY goal) — onboarding.js/css are locked + heavily tested, and the owner has been burned by onboarding regressions. The in-app sheet is an independent twin with matching content. Acceptable, deliberate divergence.

## Quota indicator
Implemented as a low-quota nudge toast rather than a persistent header counter (avoids touching the unstable index.html/main.js this session + no peek endpoint needed). A persistent "Bugün X/5" chip can be added later if wanted.

## Tests
7 new (`tests/paywall-sheet.test.js`): renders 4/3/trial, quota-lead gating, dev mock-unlock flips entitlement + closes, premium users skip, idempotent, opens on event, close. Full suite **447 passing**; `vite build` clean; paywall confirmed in the production bundle.

## Next
05-03 — Agent hub + Decide-for-Me (seen-derivation + mood chips + reveal), gated by `openPaywall({trigger:'feature'})`.
