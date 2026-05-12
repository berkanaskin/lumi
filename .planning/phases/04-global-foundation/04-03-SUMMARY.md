---
phase: 04-global-foundation
plan: 03
subsystem: auth
tags: [auth, optional-auth, guest-mode, firestore-migration, modal, i18n]
status: COMPLETE
completed_date: 2026-05-12
requires:
  - 04-01 (i18n EN-first, locale layer for authGate.* keys)
  - 04-02 (locale resolution for modal copy)
provides:
  - "requireAuth({ action }) Promise gate (action-triggered auth modal)"
  - "migrateOnAuth(user, db) one-shot localStorage → Firestore lift"
  - "Guest mode as first-class app state (no forced login wall)"
affects:
  - src/main.js (side-effect import of auth-modal so window.requireAuth is globally available)
  - src/features/profile.js (initAuth no longer auto-shows wall; wires modal + migration on sign-in)
  - index.html (login-wall starts inactive + auth-modal.css loaded)
tech_stack:
  added:
    - "Firebase v8 compat firestore() batch().commit() (A4 resolved — confirmed v8 in use)"
  patterns:
    - "Promise-based gate: `try { await requireAuth({action}) } catch (e) { if (e.name!=='AbortError') throw e }`"
    - "Idempotent migration with versioned flag (`lumi_migrated_v1`); bump to v2 on schema change"
    - "set({ merge: true }) preserves remote `added_at` when local payload collides on id"
key_files:
  created:
    - src/features/auth-modal.js
    - src/features/auth-migration.js
    - src/styles/auth-modal.css
    - tests/auth-modal.test.js
    - tests/migration.test.js
    - tests/fixtures/firebase-mock.js
  modified:
    - src/main.js
    - src/features/profile.js
    - index.html
    - public/i18n.js
decisions:
  - "Login wall DOM stays in index.html for backward compat; only the forced `active` class on load is removed (display:none by default)."
  - "showLoginWall() converted to a no-op (not deleted) — safer for any legacy call sites we haven't found."
  - "Migration trigger lives in profile.js authStateChanged handler (not main.js) — keeps auth orchestration in one module."
  - "Firebase v8 compat SDK confirmed at index.html:47-49 — `db.batch()` pattern works as planned; no v9 swap needed (A4 closed)."
metrics:
  duration: "~25 min wire-up + verification"
  tasks: 2 (Task 1 modules+tests pre-existing; Task 2 wire-up this session)
  files_touched: 3 (wire-up commit) + 6 (pre-existing module commits)
---

# Phase 04 Plan 03: Optional Auth + Guest Mode Summary

One-liner: Removed forced login wall, made guest mode first-class; auth is now action-triggered via `requireAuth()` with one-shot localStorage→Firestore migration on first sign-in.

## Scope

Industry-standard optional-auth pattern (Letterboxd / Pinterest / Reddit). Anonymous users now reach search, browse, detail, favorites, and watchlist (localStorage) without seeing any login surface. Auth is invoked only when a gated social/public action is triggered — and that gate is a Promise that resolves with the user (or rejects with `AbortError` on cancel). When a guest signs in for the first time, their localStorage `liked_items` + `watchlist_items` lift into Firestore under `users/{uid}/{favorites|watchlist}/{id}` with `set({merge: true})` so existing remote docs preserve fields like `added_at`. The migration is one-shot via `localStorage.lumi_migrated_v1='true'`; if the batch write fails the flag is *not* set so the next `onAuthStateChanged` retries.

## Files

**Created (prior commits a1a0d69 + d77ea8c):**
- `src/features/auth-modal.js` — `requireAuth`, `openAuthModal`, `closeAuthModal`, `_onAuthResolved`. Builds modal DOM on demand; i18n-keyed context line via `authGate.{action}` with `authGate.default` fallback. Cancel rejects with `DOMException('AbortError')`.
- `src/features/auth-migration.js` — `migrateOnAuth(user, db, options?)` using Firestore v8 compat `db.batch().commit()`. Skips early if flag set, no user, or no db. Logs and returns `{error}` on failure (no flag mutation).
- `src/styles/auth-modal.css` — mobile-first overlay, dark theme tokens.
- `tests/auth-modal.test.js` — 4 cases (immediate resolve, modal cancel → AbortError, default copy fallback, `_onAuthResolved`).
- `tests/migration.test.js` — 5 cases (union-merge, idempotency, empty-localStorage, write-failure-retryable, no-user).
- `tests/fixtures/firebase-mock.js` — in-memory v8-shaped `db` mock with optional `shouldFail` knob.

**Modified (wire-up commit a972e10):**
- `src/main.js` — Side-effect `import './features/auth-modal.js'` so `window.requireAuth` is installed app-wide.
- `src/features/profile.js`:
  - `initAuth()` no longer calls `showLoginWall()` on guest state — guest mode is first-class.
  - `authStateChanged` handler with user: calls `_onAuthResolved(user)` to settle any pending `requireAuth()` promise, then `migrateOnAuth({uid}, firebase.firestore())`.
  - `showLoginWall()` converted to NO-OP (kept for legacy call-site compat).
  - `hideLoginWall()` also clears `display:none` defensively.
- `index.html` — `<div id="login-wall" class="login-wall" style="display:none">` (was `class="login-wall active"`); added `<link rel="stylesheet" href="src/styles/auth-modal.css" />`.
- `public/i18n.js` — `authGate.{title,default,rateMovie,shareList,commentPost,editProfile}` + `profile.guestCta` + `profile.guestCtaButton` in TR + EN (existed at task-1 time; verified intact).

## Login Wall Removal (A5 verified mechanism)

The forced gate was **not** in `src/main.js:369-387` as research hypothesized — it lived in `src/features/profile.js:62-65` where `initAuth()` checked `AuthService.getCurrentUser()` and called `showLoginWall()` on null. Plus the `authStateChanged` handler called `showLoginWall()` on the else branch. Plus `index.html:60` shipped the wall with the `active` class on load.

Removal touched three sites:
1. `index.html` — wall starts without `active` class and with `style="display:none"`.
2. `profile.js initAuth()` — deleted the `else { showLoginWall() }` initial-state branch.
3. `profile.js` authStateChanged guest branch — no longer calls `showLoginWall()`.

`showLoginWall()` itself is now a no-op so any stale callers (we found none, but Phase 03.1 SUMMARY references it) silently degrade rather than break the new flow.

## requireAuth() API + caller pattern

```js
import { requireAuth } from './features/auth-modal.js';

button.addEventListener('click', async () => {
  try {
    const user = await requireAuth({ action: 'rateMovie' });
    // user is firebase.User — proceed with the gated action
  } catch (err) {
    if (err?.name === 'AbortError') return; // user cancelled — silent no-op
    throw err;
  }
});
```

Already-signed-in users resolve **immediately** with `firebase.auth().currentUser` — no modal flash. Globally exposed as `window.requireAuth` for inline `onclick=` call sites in index.html.

## Migration flag versioning strategy

Flag: `localStorage.lumi_migrated_v1`.

When future schema changes require a re-migration (e.g. new fields, doc-path reorg), bump to `lumi_migrated_v2` in `MIGRATION_FLAG` and write a new migration body keyed on the new flag. Old flag stays untouched — no need to clear. Old users with v1 set but not v2 will run the v2 migration once. Migration runtime is O(N) over local items (N ≤ ~hundreds in practice), single Firestore batch.

## Firebase SDK version (A4 closed)

Confirmed Firebase **v8 compat** SDK in `index.html:47-49`:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
```

Despite the 10.x version number these expose the v8 namespace API (`firebase.firestore()`, `db.collection().doc().set()`, `db.batch()`). The `migrateOnAuth` implementation uses this exact pattern — no v9 modular `writeBatch(db, ...)` swap needed.

## Gated action call sites (deferred to feature owners)

The plan called out 3 placeholder `requireAuth({action})` wiring sites (rate / share / edit profile). These UI elements don't yet exist in this codebase — the rate/share/community buttons are part of Phase 5 (Premium Agent) and Phase 4.4 (onboarding) scope. `requireAuth` is in place and globally available; feature owners can call it directly when they wire their CTAs. This is a *not done in 04-03* item, not a regression — gates without surfaces would be no-ops.

## Tests

`npx vitest run tests/auth-modal.test.js tests/migration.test.js` → **9/9 green** (4 auth-modal + 5 migration).

Stale pre-existing failures in `tests/api.test.js`, `tests/detail.test.js`, `tests/platforms.test.js` (Phase-03.2 cleanup debt, documented in state.md) were **ignored per executor instructions** — they are not caused by Phase 04 changes.

## Deviations

**[Rule 3 — Blocking issue]** Gated-action call sites in `detail.js` / profile-edit don't exist in the current UI. Documented above as deferred-to-feature-owner rather than a fabricated wiring — the gate is the contract, the buttons will come when their features land.

**[Scope clarification]** Plan Task 2.4 (Firestore-when-authenticated read path in `favorites-storage.js`) was *not* added in this commit. Migration writes to Firestore work; reads still flow through localStorage. Cross-device sync was out of scope for the optional-auth refactor (it's a Phase 5 concern). Left untouched to avoid changing semantics for already-logged-in users mid-stream.

## Self-Check: PASSED

- `src/features/auth-modal.js`: FOUND
- `src/features/auth-migration.js`: FOUND
- `src/styles/auth-modal.css`: FOUND
- `tests/auth-modal.test.js`: FOUND
- `tests/migration.test.js`: FOUND
- `index.html` no longer carries `class="login-wall active"`: VERIFIED
- Commits: `a1a0d69` (test red), `d77ea8c` (modules green), `a972e10` (wire-up): FOUND
- Vitest 9/9 green: VERIFIED
