---
phase: 1
slug: design-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.17 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

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
| 01-01-01 | 01 | 1 | DSGN-01 | visual | Manual browser check | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | DSGN-02 | unit | `npx vitest run tests/theme.test.js` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | DSGN-03 | visual | Manual responsive check | N/A | ⬜ pending |
| 01-01-04 | 01 | 1 | DSGN-04 | visual | Manual transition check | N/A | ⬜ pending |
| 01-01-05 | 01 | 1 | DSGN-05 | visual | Manual page audit | N/A | ⬜ pending |
| 01-02-01 | 02 | 1 | USER-01 | unit | `npx vitest run tests/profile.test.js` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 1 | USER-02 | unit | `npx vitest run tests/profile.test.js` | ✅ | ⬜ pending |
| 01-02-03 | 02 | 1 | PLAT-03 | unit | `npx vitest run tests/i18n.test.js` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | PLAT-05 | integration | `grep -r "VITE_" dist/ \| wc -l` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/theme.test.js` — theme toggle, OS preference detection, smooth transition tests
- [ ] `tests/i18n.test.js` — Turkish string rendering, locale switching tests

*Existing tests cover auth (profile.test.js) and API (api.test.js).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cinematic visual quality | DSGN-01 | Subjective visual assessment | Open all 4 pages, verify dark poster-heavy design, no visual inconsistencies |
| Dark/light theme polish | DSGN-02 | Visual assessment both themes | Toggle theme, check all pages in both modes |
| Responsive design | DSGN-03 | Device-specific rendering | Test at 375px, 768px, 1440px widths |
| Page transitions | DSGN-04 | Animation smoothness | Navigate between pages, verify fade+slide |
| Design overhaul completeness | DSGN-05 | Full page audit | Compare before/after screenshots |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
