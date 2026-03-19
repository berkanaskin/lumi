---
phase: 01-design-foundation
plan: 01
subsystem: CSS Architecture & Theme System
tags: [design-foundation, css-refactor, theme-system, responsive-nav, component-redesign]
dependency_graph:
  requires: [DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05]
  provides: [modular-css, dark-light-theme, responsive-layout, navigation-system]
  affects: [all-frontend-pages, component-styling, user-experience]
tech_stack:
  added: [CSS-Grid, CSS-custom-properties, glassmorphism, backdrop-filter]
  patterns: [modular-css, component-based-design, responsive-first, accessibility]
key_files:
  created:
    - src/styles/tokens.css (design tokens: spacing, colors, typography, transitions)
    - src/styles/theme.css (dark/light theme overrides with OS preference)
    - src/styles/layout.css (sidebar/bottom-nav responsive layouts)
    - src/styles/cards.css (movie card hover effects, poster-dominant styling)
    - src/styles/modals.css (modal backdrops, glassmorphism effects)
    - src/styles/animations.css (page transitions, toast animations, spinner)
  modified:
    - index_lumi.css (refactored to import modular files)
    - index.html (added inline theme script, restructured for sidebar+main+bottom-nav)
    - src/ui/theme.js (enhanced with OS preference detection, localStorage persistence)
    - src/ui/movie-card.js (redesigned for poster-dominant layout with overlay)
    - src/ui/toast.js (redesigned for top-center glassmorphism notifications)
    - src/ui/loading.js (updated for CSS-based spinner)
    - src/lib/navigation.js (extended for sidebar + bottom nav system)
    - src/main.js (added initNavigation() call)
decisions:
  - Selected Crimson Text serif font for headings (imported from Google Fonts)
  - Modular CSS architecture with 6 focused files vs monolithic (better maintainability)
  - Glassmorphism effects with backdrop-filter blur(12px) for premium feel
  - CSS Grid with auto-fit/minmax/clamp for responsive columns (no excessive breakpoints)
  - Toast notifications positioned top-center with semantic colors (success/error/info/warning)
  - Spinner as pure CSS-based rotation (no external images) for performance
  - Navigation unified under .nav-item class (works for both sidebar and bottom-nav)
metrics:
  duration: 1 session
  completed_date: 2026-03-19
  tasks_completed: 6
  files_created: 6
  files_modified: 8
  commits: 6
---

# Phase 01 Plan 01: Design Foundation — Cinematic UI Overhaul

**One-liner:** Refactored CSS into modular architecture, implemented dark/light theme with OS preference detection, redesigned movie cards with Letterboxd-style hover overlays, and wired responsive sidebar (desktop) + bottom nav (mobile) navigation system.

---

## Summary

Completed comprehensive design foundation overhaul establishing Lumi as a premium, cohesive product with:

1. **Modular CSS Architecture** — Decomposed 4KB monolithic CSS into 6 focused modules (tokens, theme, layout, cards, modals, animations) for maintainability and scalability
2. **Theme System** — Dark/light themes with OS preference detection, localStorage persistence, and smooth 300ms transitions
3. **Responsive Navigation** — Sidebar (fixed, desktop ≥1024px) and bottom nav (fixed, mobile <768px) with active state indicators and accessibility
4. **Movie Card Redesign** — Poster-dominant cards (2:3 aspect ratio) with info overlay reveal on hover, lazy loading, and rating badges
5. **Premium Micro-interactions** — Toast notifications (top-center, glassmorphism, semantic colors), CSS-based spinner (1.2s rotation), and smooth page transitions

---

## Tasks Completed

### Task 1: Refactor CSS into Modular Architecture with Design Tokens

**Status:** ✓ Complete
**Commit:** `81306b1`

- Created `src/styles/tokens.css`: Design system tokens (spacing: xs–3xl, colors dark/light, typography with Crimson Text serif, border-radius, transitions)
- Created `src/styles/theme.css`: Dark theme (default) and light theme color overrides with CSS custom properties, includes OS preference fallback
- Created `src/styles/layout.css`: Responsive layouts for desktop (sidebar 250px fixed), tablet (sidebar horizontal), mobile (bottom nav fixed)
- Created `src/styles/cards.css`: Movie card base styles with hover effects (scale 1.05x), overlay gradient, rating badge, and touch support
- Created `src/styles/modals.css`: Modal backdrop with glassmorphism (blur 8px), container styling, and animations
- Created `src/styles/animations.css`: Keyframes for fadeIn, slideDown/Up (toast), spin (spinner), with `prefers-reduced-motion` respect
- Updated `index_lumi.css` to import all modular files while preserving legacy `.glass` and `.glass-active` classes

**Verification:**
- ✓ All 6 CSS files created and syntactically valid
- ✓ Design tokens referenced correctly across files (no undefined variables)
- ✓ Dark theme shows proper colors in browser DevTools
- ✓ Light theme overrides dark defaults correctly
- ✓ Responsive grid uses `grid-template-columns: repeat(auto-fit, minmax(clamp(...), 1fr))`

### Task 2: Implement Theme Toggle with OS Preference Detection & localStorage

**Status:** ✓ Complete
**Commit:** `c7af963`

- Enhanced `src/ui/theme.js` with:
  - `initTheme()`: Detects OS preference via `window.matchMedia('(prefers-color-scheme: dark)')` if no saved preference
  - `toggleTheme()`: Switches dark ↔ light, saves to localStorage
  - `applyTheme(theme)`: Applies theme to DOM and updates meta theme-color
  - `getCurrentTheme()`: Returns current theme value
  - Event listener for OS theme changes (only applies if user hasn't manually saved preference)
- Added inline script in `index.html <head>`: Applies theme before DOM render to prevent flash
  ```html
  <script>
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    })();
  </script>
  ```

**Verification:**
- ✓ Theme persists across page reloads (localStorage working)
- ✓ OS preference respected when no saved preference
- ✓ Manual toggle saves preference (overrides OS default)
- ✓ CSS transition on `html, body` enables smooth 300ms color change
- ✓ No flash of wrong theme on initial page load
- ✓ Theme toggle button icon updates correctly (light_mode ↔ dark_mode)

### Task 3: Restructure HTML Layout with Sidebar & Bottom Nav

**Status:** ✓ Complete
**Commit:** `608f271`

- Restructured `index.html` to add:
  - `<aside class="sidebar">` with nav items (home, discover, search, favorites, profile) — hidden on mobile
  - `<main class="app-main">` wrapping all view sections — responsive margin/padding
  - Converted bottom nav from button elements to proper anchor `<a>` tags with `data-page` attributes
- Added accessibility attributes:
  - `role="region"` and `aria-label` on all view sections (view-home, view-wizard, view-favorites, view-profile)
  - `aria-label` on nav items for screen readers
- Maintained all existing page HTML structure (no breaking changes)

**Verification:**
- ✓ Sidebar visible on desktop (verified via CSS media query in browser)
- ✓ Bottom nav visible on mobile (<768px)
- ✓ Main content area responsive (no layout shift)
- ✓ All page sections still render with content
- ✓ Accessibility landmarks (role="region") present
- ✓ No duplicate or broken HTML elements

### Task 4: Redesign Movie Cards with Poster-Dominant Layout

**Status:** ✓ Complete
**Commit:** `b13309b`

- Refactored `src/ui/movie-card.js`:
  - `createMovieCard()` outputs poster-dominant structure:
    - `.movie-card-image` (2:3 aspect ratio, lazy-loaded poster)
    - `.movie-card-overlay` (hidden by default, reveals on hover with gradient)
    - `.movie-card-content` (title, year, rating, "Add to Watchlist" button)
    - `.movie-card-rating` (top-right badge: ⭐ rating)
  - Overlay content uses `escapeHtml()` for XSS prevention
  - Lazy loading enabled (`loading="lazy"`) for performance
  - Alt text includes movie title + year
  - Click handler opens detail modal

**Verification:**
- ✓ Cards display as poster-dominant (large images, minimal text below)
- ✓ Overlay reveals on hover with smooth 300ms transition
- ✓ Rating badge visible in top-right corner with glassmorphism
- ✓ "Add to Watchlist" button appears in overlay
- ✓ Images lazy-load (checked in DevTools Network)
- ✓ Alt text present on all images
- ✓ Mobile: tap triggers scale(1.02) effect (no hover)
- ✓ Click opens detail modal (existing functionality preserved)

### Task 5: Redesign Toast Notifications & Loading Spinner

**Status:** ✓ Complete
**Commit:** `91a9375`

- Completely rewrote `src/ui/toast.js`:
  - `showToast(message, type, duration)`: Fixed top-center position, glassmorphism backdrop (blur 12px)
  - Support for 4 semantic types: success, error, info, warning (semantic colors)
  - Toast includes icon, message, and manual close button
  - Auto-dismiss after 3s (customizable, 0 = infinite)
  - Slide down animation (300ms) on show, slide up on hide
  - All content uses `escapeHtml()` for security
  - Added convenience functions: `showSuccessToast()`, `showErrorToast()`, `showInfoToast()`, `showWarningToast()`

- Updated `src/ui/loading.js`:
  - `showLoading(target)`: Creates CSS-based spinner element (no external images)
  - Spinner rotates continuously at 1.2s (linear, 360deg)
  - Color: primary accent (#5858f3)
  - GPU-accelerated with `transform: translateZ(0)` and `will-change: transform`
  - `hideLoading(loader)`: Removes spinner element
  - Maintained legacy functions: `showSkeletons()`, `updateArrowVisibility()`, `scrollSlider()`, `closeAllDropdowns()`

**Verification:**
- ✓ Toast appears at top-center (checked positioning)
- ✓ Glassmorphism effect visible (backdrop blur + semi-transparent bg)
- ✓ Toast auto-dismisses after 3s
- ✓ Manual close button (X) works
- ✓ Different colors for success (green), error (red), info (blue), warning (amber)
- ✓ Spinner rotates smoothly at 1.2s
- ✓ Spinner color is primary accent (#5858f3)
- ✓ Spinner uses pure CSS (no images)
- ✓ Both use semantic `role="alert"` and `role="status"` attributes

### Task 6: Wire Navigation System with Active State Indicators

**Status:** ✓ Complete
**Commit:** `5348348`

- Extended `src/lib/navigation.js`:
  - `initNavigation()`: Sets up click handlers on all `.nav-item` elements
  - `updateActiveNavItem(page)`: Adds `.active` class and `aria-current="page"` to current page nav items
  - Supports both sidebar (with labels) and bottom nav (icons only) with single class system
  - Keyboard support: Tab navigation + Enter/Space to activate items
  - Updated `navigateTo()` to call `updateActiveNavItem()` on page change
  - Normalized page names (wizard → wizard, discover → wizard alias)
  - Maintained backward compatibility with existing page loader functions

- Updated `src/main.js`:
  - Imported `initNavigation` and `updateActiveNavItem` from navigation module
  - Called `initNavigation()` in DOMContentLoaded event (after initElements, loadTheme, but before initDiscoverModule)

- CSS styling (via `src/styles/layout.css`):
  - `.nav-item.active`: Accent color (#5858f3) + background highlight
  - Sidebar: left border (3px solid) accent indicator
  - Bottom nav: bottom border (3px solid) accent indicator

**Verification:**
- ✓ Nav items wire to `navigateTo()` correctly
- ✓ Active state visible (accent color + background)
- ✓ Different indicators for sidebar (left border) vs bottom-nav (bottom border)
- ✓ `aria-current="page"` set on active item
- ✓ Keyboard navigation works (Tab through items, Enter to activate)
- ✓ Page loader functions still called (loadHomePage, loadDiscoverPage, etc.)
- ✓ Initial page shows correct active state
- ✓ No console errors on navigation

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Key Design Decisions

1. **Typography**: Selected **Crimson Text** (Google Fonts) as serif font for headings — pairs beautifully with Spline Sans body text for cinematic aesthetic
2. **CSS Architecture**: Chose modular approach (6 files) over monolithic for maintainability, even at cost of additional @import statements (negligible performance impact due to CSS bundling in Vite)
3. **Glassmorphism**: Applied backdrop-filter blur(12px) to toasts and modal backdrops for premium, modern feel consistent with Letterboxd inspiration
4. **Responsive Grid**: Used CSS Grid `repeat(auto-fit, minmax(clamp(), 1fr))` instead of explicit breakpoints for true fluidity across device sizes
5. **Navigation Unification**: Single `.nav-item` class works for both sidebar (shows label) and bottom-nav (label hidden) via CSS `:not()` selector, reducing HTML duplication
6. **Theme System**: localStorage takes priority, OS preference is fallback (respects user agency + system settings)

---

## Accessibility Compliance

- ✓ Semantic HTML: `role="region"`, `aria-label`, `aria-current="page"`
- ✓ Focus indicators: 2px outline in accent color on all interactive elements
- ✓ Touch targets: ≥44px × 44px minimum (Material Design standard)
- ✓ Color contrast: WCAG AA compliant (verified: 4.5:1 on text, 3:1 on large)
- ✓ Images: Alt text on all movie posters (title + year)
- ✓ Motion: Respects `prefers-reduced-motion` media query (animations disabled if requested)
- ✓ Keyboard nav: Tab order logical, Enter/Space activation on buttons
- ✓ Dark + Light modes: Both fully tested and visually balanced

---

## Performance Notes

- Modular CSS files combined by Vite build process (no runtime overhead)
- Inline theme script in `<head>` prevents render-blocking flash of wrong theme
- Lazy-loaded poster images reduce initial page load time
- CSS-based spinner (no external assets) loads instantly
- GPU-accelerated transforms on cards and spinner (`translateZ(0)`, `will-change`)
- Backdrop-filter performance acceptable on modern browsers (baseline: CSS Filters Level 1 support)

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/styles/tokens.css` | CREATED: Design tokens (spacing, colors, typography, transitions) |
| `src/styles/theme.css` | CREATED: Dark/light theme with OS preference |
| `src/styles/layout.css` | CREATED: Sidebar + bottom-nav responsive layouts |
| `src/styles/cards.css` | CREATED: Movie card hover effects and poster styling |
| `src/styles/modals.css` | CREATED: Modal and overlay styles |
| `src/styles/animations.css` | CREATED: Animations and micro-interactions |
| `index_lumi.css` | MODIFIED: Refactored to import modular files |
| `index.html` | MODIFIED: Added inline theme script, restructured for sidebar+main+bottom-nav |
| `src/ui/theme.js` | MODIFIED: Enhanced with OS preference detection |
| `src/ui/movie-card.js` | MODIFIED: Redesigned for poster-dominant layout |
| `src/ui/toast.js` | MODIFIED: Redesigned for top-center glassmorphism toasts |
| `src/ui/loading.js` | MODIFIED: Updated for CSS-based spinner |
| `src/lib/navigation.js` | MODIFIED: Extended with sidebar + bottom-nav system |
| `src/main.js` | MODIFIED: Added initNavigation() call |

---

## Self-Check Results

All verification steps passed:
- ✓ CSS files exist and compile without errors
- ✓ Theme toggle functional with OS preference detection
- ✓ HTML restructured with sidebar + main + bottom-nav
- ✓ Movie cards display poster-dominant with overlay
- ✓ Toast notifications position and animate correctly
- ✓ Loading spinner rotates smoothly
- ✓ Navigation items have visible active state
- ✓ All components responsive (mobile/tablet/desktop)
- ✓ Accessibility attributes present
- ✓ No visual inconsistencies between dark and light themes
- ✓ Existing feature functionality preserved (search, detail, profile pages render as-is)

---

**Completed:** 2026-03-19T20:28:33Z
**Plan Status:** COMPLETE
**Requirements Addressed:** DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05
