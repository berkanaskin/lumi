---
phase: 3
slug: content-enrichment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | STRM-01, STRM-02 | integration | `npx vitest run tests/streaming.test.js` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | DETL-02 | unit | `npx vitest run tests/ratings.test.js` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | STRM-04 | unit | `npx vitest run tests/streaming.test.js` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | DETL-03 | unit | `npx vitest run tests/detail.test.js` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | DETL-05 | integration | `npx vitest run tests/person.test.js` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | DETL-04 | unit | `npx vitest run tests/trivia.test.js` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 2 | DETL-06 | unit | `npx vitest run tests/detail.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/streaming.test.js` — stubs for STRM-01, STRM-02, STRM-04
- [ ] `tests/ratings.test.js` — stubs for DETL-02
- [ ] `tests/person.test.js` — stubs for DETL-05
- [ ] `tests/trivia.test.js` — stubs for DETL-04

*Existing test infrastructure (vitest + jsdom) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming logos render correctly | STRM-01 | Visual verification | Open detail page, check platform logos display with correct grouping |
| Country selector in header | STRM-02 | UI interaction | Toggle country, verify streaming data updates |
| Rating badges visual fidelity | DETL-02 | Visual verification | Check IMDB/RT/MC logos render at correct size with scores |
| Video tabs browsable | DETL-03 | UI interaction | Click each tab (Trailers, BTS, Interviews), verify videos load |
| Person page filmography grid | DETL-05 | Visual verification | Navigate to actor page, verify poster grid with filters |
| Cinema release badge | DETL-06 | Visual verification | Find upcoming theatrical release, verify badge displays |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
