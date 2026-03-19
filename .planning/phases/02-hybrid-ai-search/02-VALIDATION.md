---
phase: 2
slug: hybrid-ai-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.17 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DISC-02 | unit | `npx vitest run tests/embedding.test.js` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DISC-02 | integration | `npx vitest run tests/search-api.test.js` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | DISC-01 | unit | `npx vitest run tests/search.test.js` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 2 | DISC-03 | unit | `npx vitest run tests/search.test.js` | ✅ | ⬜ pending |
| 02-02-03 | 02 | 2 | DISC-05 | unit | `npx vitest run tests/personalization.test.js` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | DISC-06 | unit | `npx vitest run tests/diversity.test.js` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 2 | PLAT-04 | unit | `npx vitest run tests/cost-dashboard.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/embedding.test.js` — Embedding generation, vector format, dimension validation
- [ ] `tests/search-api.test.js` — Hybrid search API endpoint, fallback logic
- [ ] `tests/personalization.test.js` — Watchlist-based preference derivation
- [ ] `tests/diversity.test.js` — Diversity injection ratio verification
- [ ] `tests/cost-dashboard.test.js` — Cost tracking, metric aggregation

*Existing tests cover search (search.test.js) and API (api.test.js).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NL query returns relevant results | DISC-01 | Subjective relevance assessment | Type "cozy 90s rom-coms" — verify results match mood |
| Results appear within 2 seconds | DISC-01 | Timing varies by network | Measure response time in DevTools Network tab |
| Autocomplete feels responsive | DISC-03 | UX perception | Type "incep" — verify suggestions appear within 300ms |
| Personalized results differ from anonymous | DISC-05 | Requires two sessions | Compare results for same query with/without watchlist |
| Diversity section feels natural | DISC-06 | Subjective UX | Verify "Belki de bunu beğenirsin" section has different genres |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
