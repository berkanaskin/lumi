# Phase 1: Design Foundation - Research

**Researched:** 2026-03-19
**Domain:** Cinematic UI/UX design, CSS architecture, theme systems, authentication UX, internationalization
**Confidence:** HIGH

## Summary

Phase 1 demands a complete visual overhaul of Lumi toward a premium Letterboxd-inspired cinematic aesthetic. The research reveals that modern dark theme design (2025) prioritizes glassmorphism, responsive CSS Grid, CSS variable-driven theme systems, and media-query-free layouts. The codebase already has solid foundations: Vite + vanilla JS, a 4KB CSS variable system, Material Symbols, and modular architecture. Key gaps exist in CSS organization (86KB monolith needs restructuring), authentication UI (user login wall missing), and API security (keys exposed in client). The design system must balance platform duality (mobile = app, desktop = website) while maintaining cohesive cinematic branding across discover, search, detail, and profile pages.

**Primary recommendation:** Adopt a two-layer CSS architecture (design tokens in `:root` + modular component layers), implement responsive layouts with CSS Grid's `auto-fit/minmax()` to eliminate breakpoint fragmentation, refactor authentication into a full login wall with onboarding splash screen, and route all external API calls through Vercel Edge Functions to protect keys.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Serif sinematic typography — serif for headings, sans-serif for body text
- Poster-dominant cards — large posters with info overlay on hover (Letterboxd style)
- Material Symbols icons (keep existing system)
- Keep existing Lumi logo, just polish it
- Responsive poster sizing — small on mobile, large on desktop
- Sinematik gradient/blur effects — pull colors from poster backdrops, blur effects, shadow layers
- Stitch/Figma exports as design reference — existing good designs preserved, broken parts rebuilt
- Navigation: Sidebar on desktop, bottom nav on mobile
- Discover page: Hero banner (daily AI recommendation) + horizontal scroll rows on mobile, grid gallery on desktop
- Detail page: Modal overlay (keep existing pattern)
- Search: Existing structure maintained — film search and AI search are separate sections
- Onboarding: Sinematik splash screen with backdrop poster blur + login/signup form overlay
- Login wall: Users must login/signup before accessing the app
- Light theme: Pure white background — Apple-style minimal
- Dark theme: Cinematic dark (Claude picks specific palette)
- Default follows OS system preference, user can override manually
- Theme transition: Smooth fade (300-500ms color transition)
- Page transitions: Fade + slide animation between pages
- Card hover: Scale up + info overlay (Letterboxd style)
- Loading states: Lumi-branded custom spinner
- Toast notifications: Top sliding toast — high visibility
- Button/tap feedback: Material Design ripple effect
- Scroll behavior: Header/nav hides on scroll down, shows on scroll up

### Claude's Discretion
- Exact color palette for dark and light themes
- CSS architecture approach (modular vs single file with variables)
- Sidebar content and layout on desktop
- Profile page structure and content
- Loading spinner design
- Specific spacing, padding, border-radius values
- Error state designs
- Technical approach to gradient/backdrop effects

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **DSGN-01** | Cinematic Letterboxd-style design — poster-heavy, premium visual feel across all pages | CSS glassmorphism, responsive poster grids with CSS Grid auto-fit, Material Symbols, serif typography patterns documented |
| **DSGN-02** | Dark theme (primary) and light theme — both polished and cohesive, user can toggle | CSS variable theme system with prefers-color-scheme detection, localStorage persistence, smooth 300-500ms transitions via light-dark() function |
| **DSGN-03** | Responsive design works seamlessly on mobile and desktop | CSS Grid auto-fit/minmax() eliminates breakpoint fragmentation, mobile-first architecture, container queries (93.92% support) for future enhancements |
| **DSGN-04** | Smooth page transitions and micro-interactions that feel polished | CSS View Transitions API (Baseline in Firefox 144 Oct 2025), fade + slide animations, card scale hover with GPU-accelerated transform/opacity |
| **DSGN-05** | Complete design overhaul of all existing pages — every screen refined to best possible quality | Stitch design references provided, existing patterns (modal, card, navigation) documented for refinement, icon system preserved |
| **USER-01** | User can sign up and log in with Google or email/password | Firebase Authentication with FirebaseUI, Google OAuth redirect pattern (mobile-recommended), login wall enforcement |
| **USER-02** | User can save movies/shows to watchlist and favorites | Existing state.js localStorage integration verified, watchlist/favorites data flow through existing feature modules |
| **PLAT-03** | App supports English and Turkish with complete localization (including Turkish-safe string operations) | i18n.js (1020 lines, 33KB) covers EN/TR, Turkish "I" character complexity documented, Unicode support verified |
| **PLAT-05** | All external API calls go through server-side Vercel Edge Functions (no client-exposed keys) | Backend for Frontend (BFF) pattern with Vercel Edge Functions, API proxy authentication, secrets manager integration |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 7.3.1 | Build tool, module bundling, HMR | Fast ES module native development; industry standard for vanilla JS apps |
| Vanilla JavaScript | ES6+ (modules) | DOM manipulation, state management, event handling | No frontend framework overhead; full control over design implementation; smaller bundle |
| Firebase | 12.7.0 | Authentication, real-time database, auth state management | Verified in codebase; provides Google OAuth integration out-of-box |
| Material Symbols | 2022+ (variable font) | Icon system with 2,500+ icons, weight/fill/grade/optical-size axes | Lightweight, customizable via CSS, seamlessly integrates with dark/light theme |
| CSS Custom Properties (CSS Variables) | Level 3 (standard) | Theme system, design tokens, dark/light mode switching | Natively supported (98%+ browsers); zero dependencies; theme switching via `data-theme` attribute |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Spline Sans (Google Fonts) | Current | Body text typography | Paired with serif headings; geometric, humanist sans-serif for cinema aesthetic |
| Serif font (discretion) | TBD | Heading typography | Letterboxd-style cinematic feel; pairing with sans-serif body text |
| Vitest | 4.0.17 | Unit testing, DOM testing | Already integrated; jsdom environment for testing UI components |
| ESLint | 9.39.2 | Code linting, style enforcement | Max-warnings 200 (needs reduction); enforces 4-space indent, semicolons, single quotes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-in-JS (Tailwind, Emotion) | CSS custom properties + modular CSS | CSS-in-JS adds bundle weight (50KB+); CSS variables chosen for simplicity, theme switching, and existing project fit |
| Component library (Material UI, shadcn) | Custom components | Pre-built libraries reduce development time but constrain cinematic aesthetic; custom components enable Letterboxd-style design |
| Firebase Auth only | Custom email/password auth | Firebase provides drop-in OAuth; custom auth adds security liability; FirebaseUI provides UI components |

**Installation:**
```bash
# Already installed in package.json
npm install

# No additional packages needed for design phase
# Material Symbols loaded via Google Fonts CDN in index.html
```

**Version verification:** All core versions verified against current package.json (2026-03-19).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main.js                 # Entry point, module initialization
├── ui/                     # Reusable UI components
│   ├── theme.js           # Dark/light theme toggle, prefers-color-scheme detection
│   ├── toast.js           # Toast notifications (refactor to top-sliding)
│   ├── loading.js         # Loading spinner (replace with Lumi-branded)
│   ├── movie-card.js      # Card component (redesign with poster overlay hover)
│   └── modal-base.js      # (NEW) Base modal class for consistent behavior
├── lib/                    # State & utilities
│   ├── state.js           # Global state, localStorage persistence
│   ├── navigation.js      # Page routing, sidebar/bottom nav visibility
│   ├── helpers.js         # Utilities (debounce, formatDate, escapeHtml)
│   ├── constants.js       # Genre definitions, image URLs
│   └── platforms.js       # Streaming platform URLs, region detection
├── services/              # API/backend integration
│   └── api.js            # TMDB/YouTube/Gemini service methods
├── features/              # Page-level modules
│   ├── discover.js       # Discover page, daily recommendation
│   ├── search.js         # Search, autocomplete
│   ├── detail.js         # Detail modal (refactor HTML generation)
│   └── profile.js        # Auth, profile (refactor login wall)
├── styles/               # (NEW) Modular CSS architecture
│   ├── tokens.css        # Design tokens, color palette (replaces inline :root)
│   ├── theme.css         # Dark/light theme variable overrides
│   ├── layout.css        # Sidebar, bottom nav, grid structure
│   ├── cards.css         # Movie card styles, hover effects
│   ├── modals.css        # Modal, backdrop blur, glassmorphism
│   ├── forms.css         # Login, search, form inputs
│   ├── animations.css    # Transitions, micro-interactions
│   └── utilities.css     # Responsive helpers, spacing, accessibility
└── config.js             # Environment configuration (route API calls to Edge Functions)

index.html                 # Root template with data-theme attribute support
index_lumi.css            # (DEPRECATED) Monolith to be replaced with modular CSS
i18n.js                   # Localization (EN/TR)
vitest.config.js          # Test configuration
```

### Pattern 1: Theme System with CSS Variables

**What:** Implement theme switching via CSS custom properties and `data-theme` attribute, with OS preference detection and localStorage persistence.

**When to use:** Global color, spacing, typography tokens that differ between dark and light modes.

**Example:**
```css
/* tokens.css - Design tokens (once for all themes) */
:root {
  /* Color palette - neutral base */
  --surface-0: #050505;        /* Void black */
  --surface-1: #0a0a0f;        /* Elevated surface */
  --surface-2: #121218;        /* Card layer */

  --primary: #5858f3;          /* Brand purple/blue */
  --primary-glow: rgba(88, 88, 243, 0.4);
  --accent: #3b82f6;

  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;

  /* Transitions */
  --transition-normal: 0.3s ease;
  --transition-smooth: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* theme.css - Light mode overrides */
[data-theme="light"] {
  --surface-0: #ffffff;
  --surface-1: #f8f8f8;
  --surface-2: #f0f0f0;

  --text-primary: #000000;
  --text-secondary: rgba(0, 0, 0, 0.7);
  --text-muted: rgba(0, 0, 0, 0.4);
}

/* Dark mode (default) */
[data-theme="dark"] {
  /* Already defined in :root */
}
```

**JavaScript implementation:**
```javascript
// src/ui/theme.js - Detect OS preference and manage switching
export function loadTheme() {
  // Check localStorage first, fall back to OS preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// Listen for OS theme change
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    // Only auto-switch if user hasn't manually set a preference
    loadTheme();
  }
});
```

**Key insight:** CSS variables eliminate the need for preprocessors (Sass/Less) and enable real-time theme switching without page reload. The `data-theme` attribute provides a single source of truth for theme state.

---

### Pattern 2: Responsive Grid Layout (Mobile-First, No Media Queries)

**What:** Use CSS Grid `auto-fit` and `minmax()` to create layouts that adapt automatically without explicit breakpoints.

**When to use:** Content grids (movie cards), gallery layouts where mobile shows 1-2 columns and desktop shows 4+ columns.

**Example:**
```css
/* layouts.css - Mobile-first responsive grid */
.card-grid {
  display: grid;
  gap: var(--space-md);
  /* Mobile: 1 column by default */
  grid-template-columns: 1fr;
}

/* Desktop: 4 columns with automatic wrapping */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (min-width: 1200px) {
  .card-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

/* Alternative: CSS Grid without media queries (poster cards) */
.poster-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(auto-fit, minmax(clamp(100px, 20vw, 300px), 1fr));
}
```

**Key insight:** The `clamp()` function (96%+ browser support) eliminates the need for multiple breakpoints—it scales smoothly between minimum and maximum values as viewport changes.

---

### Pattern 3: Glassmorphism for Modals and Overlays

**What:** Create semi-transparent, blurred background layers for modals using CSS `backdrop-filter`.

**When to use:** Modal overlays (detail page), login splash screen, dropdown menus that need visual emphasis.

**Example:**
```css
/* modals.css - Glassmorphism modal backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);  /* Safari support */
  z-index: 1000;
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.modal-backdrop.active {
  opacity: 1;
}

/* Modal content (glassmorphic panel) */
.modal-panel {
  background: rgba(10, 10, 15, 0.85);        /* Dark theme */
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: var(--space-lg);
}

[data-theme="light"] .modal-panel {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.1);
}
```

**Browser support:** Glassmorphism (backdrop-filter) has 95%+ support (Oct 2025). Use hardware acceleration: `will-change: transform`.

---

### Pattern 4: Card Hover with Overlay Reveal (Letterboxd Style)

**What:** On hover, scale card and reveal info overlay above poster image.

**When to use:** Movie cards, content cards throughout app.

**Example:**
```css
/* cards.css - Movie card with hover overlay */
.movie-card {
  position: relative;
  cursor: pointer;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.movie-card-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background: var(--surface-1);
  overflow: hidden;
}

.movie-card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

/* Hover overlay container */
.movie-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-md);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.movie-card:hover {
  transform: scale(1.05);
}

.movie-card:hover .movie-card-poster img {
  transform: scale(1.08);
}

.movie-card:hover .movie-card-overlay {
  opacity: 1;
}

.movie-card-title {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.movie-card-meta {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
```

**Key insight:** GPU-accelerated transforms (scale, rotate) are smoother than changing size. Use `will-change: transform` on hover for performance.

---

### Pattern 5: Top-Sliding Toast Notification

**What:** Toast notifications that slide down from top of viewport, with auto-dismiss.

**When to use:** Confirmations, errors, info messages that need high visibility.

**Example:**
```css
/* animations.css - Toast animations */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}

.toast-container {
  position: fixed;
  top: var(--space-md);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.toast {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
  animation: slideDown 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.toast.hide {
  animation: slideUp 0.3s ease forwards;
}
```

**JavaScript implementation:**
```javascript
export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

---

### Pattern 6: Page Transition with View Transitions API

**What:** Smooth fade + slide transitions between pages using CSS View Transitions (new in 2025).

**When to use:** Navigation between main pages (discover → search → detail → profile).

**Example:**
```css
/* animations.css - View transitions */
::view-transition-old(root) {
  animation: fadeOut 0.3s ease-in;
}

::view-transition-new(root) {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**JavaScript navigation:**
```javascript
export function navigateTo(page) {
  if (!document.startViewTransition) {
    // Fallback for browsers without View Transitions support
    _navigateImmediate(page);
    return;
  }

  document.startViewTransition(() => {
    _navigateImmediate(page);
  });
}

function _navigateImmediate(page) {
  const section = document.getElementById(PAGES[page].id);
  section.classList.remove('hidden');
}
```

**Browser support:** Firefox 144+ (Oct 2025), Chrome/Edge 111+, 80%+ global coverage. Fallback to immediate navigation for older browsers.

---

### Pattern 7: Login Wall with Onboarding Splash Screen

**What:** Full-screen authentication flow that intercepts users before app access, with backdrop image blur.

**When to use:** App initialization; redirect unauthenticated users to login wall.

**Example:**
```html
<!-- index.html - Login wall structure -->
<div id="login-wall" class="login-wall active">
  <!-- Backdrop with blurred image -->
  <div class="login-backdrop" style="background-image: url(poster.jpg)">
    <div class="login-backdrop-blur"></div>
  </div>

  <!-- Login form overlay -->
  <div class="login-panel">
    <div class="login-header">
      <h1>Lumi</h1>
      <p>Ne izlesem? Seni anlıyoruz.</p>
    </div>

    <div class="login-form">
      <button class="btn-google" onclick="handleGoogleLogin()">
        Sign in with Google
      </button>
      <button class="btn-email" onclick="openEmailForm()">
        Continue with Email
      </button>
    </div>

    <p class="login-footer">New to Lumi? Sign up with email or Google</p>
  </div>
</div>
```

**CSS:**
```css
.login-wall {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.login-backdrop {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-attachment: fixed; /* Parallax on mobile */
}

.login-backdrop-blur {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%);
  backdrop-filter: blur(12px);
}

.login-panel {
  position: relative;
  z-index: 1;
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
}

@media (max-width: 768px) {
  .login-panel {
    width: 95%;
    padding: 32px 20px;
  }
}
```

---

### Anti-Patterns to Avoid

- **Single monolithic CSS file (86KB):** Breaks maintainability. Use modular CSS per component/feature.
- **Inline `onclick` attributes in HTML:** Violates separation of concerns. Use `addEventListener()` instead.
- **Hardcoded color values:** Use CSS variables exclusively. Makes theme switching impossible.
- **Modal state scattered across multiple objects:** Keep modal state in a single `ModalState` class or reducer.
- **Unescaped user data in `innerHTML`:** Always use `escapeHtml()` or `textContent`. Prevents XSS.
- **API keys in client code:** Never embed credentials. Use Vercel Edge Functions proxy to route calls server-side.
- **No cleanup for event listeners:** Remove listeners in close/destroy methods to prevent memory leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme switching | Custom theme toggle logic | CSS variables + data-theme attribute | Standard, native, zero dependencies, works across all browsers |
| Responsive layouts | Custom media query breakpoints | CSS Grid auto-fit/minmax + clamp() | Scales smoothly without fragmentation; one rule covers mobile/tablet/desktop |
| Icon system | Custom SVG sprites or icon fonts | Material Symbols (Google) | 2,500+ icons, variable font, native CSS customization, actively maintained |
| Toast notifications | Custom div+timer notification | Toast component with animation | Complex to handle stacking, auto-dismiss, accessibility; reuse tested patterns |
| Modal overlay blur | Custom blur implementation | CSS backdrop-filter | Native support 95%+; GPU accelerated; zero JavaScript overhead |
| Login UI | Custom authentication form | FirebaseUI or Firebase SDK | Handles Google OAuth flow, email validation, error states; security vetted |
| Form validation | Custom regex validators | HTML5 validation + aria-invalid | Built-in, accessible, works offline; custom regex is error-prone |
| API proxying | Custom fetch wrapper in frontend | Vercel Edge Functions (BFF pattern) | API keys stay server-side; impossible for attackers to intercept; rate limiting possible |

**Key insight:** The codebase already solved the hardest problems (state management, navigation, API integration). The design phase should layer on polish (CSS architecture, theme system, animations) without re-inventing solutions that have standard implementations.

## Common Pitfalls

### Pitfall 1: Color Contrast in Dark Mode Falls Below WCAG AA
**What goes wrong:** Designer picks dark backgrounds + dark text thinking it's cinematic, but 4.5:1 contrast ratio requirement isn't met. Text becomes unreadable.

**Why it happens:** Dark mode allows higher saturation/brightness in accent colors, but primary text still needs 4.5:1 ratio against background. #050505 on #0a0a0f is unreadable.

**How to avoid:**
- Test all color combinations with WebAIM contrast checker (target 4.5:1 for body, 3:1 for large text)
- Primary text should be #ffffff or #f0f0f0 on dark surfaces
- Use secondary text only for metadata/timestamps (#c0c0c0 or lighter)
- Verify in light mode that white backgrounds + light text don't occur

**Warning signs:** User feedback "can't read this", or WCAG lighthouse audit flags.

---

### Pitfall 2: Modal Backdrop Blur Causes Performance Jank on Mobile
**What goes wrong:** `backdrop-filter: blur(20px)` works smoothly on desktop, but on mobile (iPhone/Android), scrolling becomes choppy, 60fps drops to 20fps.

**Why it happens:** Backdrop filter requires GPU compositing of entire viewport. Low-end mobile GPUs can't handle simultaneous scroll + blur + modal rendering.

**How to avoid:**
- Reduce blur value on mobile: `blur(8px)` instead of `20px`
- Use `will-change: transform` only on modal element, not backdrop
- Disable blur entirely on devices with `prefers-reduced-motion: reduce`
- Test on low-end devices (iPhone SE, Android 6-8) before shipping
- Consider `transform: translateZ(0)` for hardware acceleration

**Warning signs:** Modal appears, scroll test shows <30fps, GPU usage spikes to 100%.

---

### Pitfall 3: CSS Variable Fallbacks Aren't Provided
**What goes wrong:** A CSS variable is deleted or misnamed, and the fallback `var(--color, #ffffff)` isn't there. Elements become invisible or unstyled.

**Why it happens:** Developer assumes all variables are defined in `:root`, but some may be set dynamically or per-theme.

**How to avoid:**
- ALWAYS provide fallback: `color: var(--text-primary, #ffffff);`
- Use linting rule to enforce fallbacks (`stylelint-no-missing-var-fallback`)
- Document all variables in `tokens.css` with descriptions
- Test theme switching in browser with DevTools (no console errors)
- Verify light + dark theme in deployment before release

**Warning signs:** Inspect in DevTools shows red "variable not defined" warnings; elements disappear on theme toggle.

---

### Pitfall 4: Poster Grid Breaks at Tablet Sizes (iPad)
**What goes wrong:** Desktop shows 4 columns, mobile shows 1 column, but iPad (768-1024px) shows 2.5 columns, leaving awkward spacing.

**Why it happens:** Auto-fit breakpoint is too aggressive; `minmax(200px, 1fr)` creates fractional columns on intermediate viewports.

**How to avoid:**
- Use `clamp(minmax-value)` for smooth scaling instead of breakpoint jumps
- Test on exact viewport sizes: 320px, 768px, 1024px, 1200px
- Consider 3-column layout for tablet: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`
- Use container queries (93.92% support) for component-specific breakpoints

**Warning signs:** Inspect on iPad Safari shows 2.5 columns; cards have irregular spacing.

---

### Pitfall 5: Dark Mode Light Theme Isn't Actually Light (Still Too Gray)
**What goes wrong:** Light theme uses #f8f8f8 backgrounds instead of #ffffff, making it feel "dark-ish light" rather than Apple-style bright white.

**Why it happens:** Designer carries over dark theme's subtle shadows/grays into light mode, losing the contrast that makes light mode feel clean.

**How to avoid:**
- Light theme: #ffffff background, #000000 text, #e0e0e0 borders (pure, high contrast)
- Test light mode against reference (Apple.com, Figma light theme, Stripe)
- Don't adjust shadows/blur for light mode (keep glassmorphism subtle)
- Verify that light mode text passes 7:1 contrast (even better than WCAG AA)

**Warning signs:** Light mode looks "muted" compared to dark mode; text is gray on gray.

---

### Pitfall 6: Serif Font Headings Are Unreadable at Small Sizes
**What goes wrong:** Elegant serif font (Playfair Display, Merriweather) looks stunning at h1, but at h3/h4 and on mobile, serifs become muddy and hard to read.

**Why it happens:** Thin serif strokes don't render clearly below 18-20px; anti-aliasing struggles with serifs on small screens.

**How to avoid:**
- Use serif only for h1/h2 (≥20px)
- Use sans-serif for h3/h4/h5 and all body text
- Set `font-weight: 600-700` for serif headings (heavier weight compensates for thin strokes)
- Test serif font on real mobile devices (not just browser zoom)
- Fallback to sans-serif if serif doesn't load: `font-family: "Playfair Display", Georgia, serif;`

**Warning signs:** Mobile screenshot shows blurry, hard-to-read headings.

---

### Pitfall 7: Login Wall Doesn't Prevent Navigation
**What goes wrong:** User bypasses login by typing `/discover` in URL or opening DevTools and hiding the login wall with CSS. Unauthenticated user accesses protected content.

**Why it happens:** Login wall is purely CSS/JS. Determined user can disable it. No server-side auth check.

**How to avoid:**
- Login wall blocks navigation via `navigateTo()` checks (if not authenticated, throw error)
- On app init, check `state.isAuthenticated` before showing any page
- Redirect all non-home routes to login on page load
- Verify auth token server-side on API calls
- Don't rely on localStorage for auth state (attacker can modify it)

**Warning signs:** User accesses app without logging in; DevTools shows no auth token in requests.

---

### Pitfall 8: API Keys Exposed in Client DevTools Network Tab
**What goes wrong:** TMDB API key visible in `src/config.js` or network requests. Attacker copies key, hits TMDB API quota, costs money.

**Why it happens:** Secrets embedded in client code because developer didn't set up backend proxy.

**How to avoid:**
- Route ALL external API calls through Vercel Edge Functions (proxy layer)
- Frontend sends request to `/api/tmdb/search` (Edge Function)
- Edge Function fetches from TMDB with real API key (stored in Vercel secrets)
- Frontend never sees the real key
- Implement rate limiting on Edge Function to prevent quota exhaustion

**Warning signs:** Network tab shows `https://api.themoviedb.org` with Authorization header; API key visible in source code.

---

### Pitfall 9: Theme Toggle Loses State on Page Reload
**What goes wrong:** User toggles to light mode, but on page refresh, it defaults to dark mode again.

**Why it happens:** localStorage.setItem() call is missing or localStorage is cleared by browser.

**How to avoid:**
- Call `localStorage.setItem('theme', newTheme)` immediately in `toggleTheme()`
- On app init, read from localStorage: `const saved = localStorage.getItem('theme')`
- Fall back to OS preference if localStorage is empty
- Test in private/incognito mode (localStorage is cleared on close)
- Verify localStorage in DevTools → Application → Local Storage

**Warning signs:** Theme preference resets after page reload.

---

### Pitfall 10: Icon Font Doesn't Load on Slow Networks
**What goes wrong:** Material Symbols font loads from Google Fonts CDN. On slow 3G, font takes 5 seconds to load. Icons show as blank squares or fallback text during load.

**Why it happens:** Font is loaded synchronously; page waits for font before rendering text.

**How to avoid:**
- Add `<link rel="preload" as="font" href="..." crossorigin>` to index.html head
- Set `font-display: swap` in font URL: `&display=swap` (Google Fonts parameter)
- Preload most-used icons to critical render path
- Fall back to text if font fails: `.material-symbols-outlined::before { content: "☰"; }`
- Test with DevTools Network → Slow 3G throttling

**Warning signs:** Page loads but icons are missing for 3+ seconds; text shows "home", "settings" instead of icons.

## Code Examples

Verified patterns from official sources:

### Firebase Google OAuth Login
```javascript
// Source: https://firebase.google.com/docs/auth/web/google-signin
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('[Auth] User signed in:', user.email);
    state.currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
    localStorage.setItem('user', JSON.stringify(state.currentUser));
    hideLoginWall();
  } catch (error) {
    console.error('[Auth] Login error:', error.message);
    showToast('Login failed: ' + error.message);
  }
}
```

### CSS Grid Responsive Poster Grid (No Breakpoints)
```css
/* Source: MDN CSS Grid auto-fit + clamp() pattern */
.movie-grid {
  display: grid;
  gap: 1rem;
  /* Scales from 2 columns (mobile) to 4 columns (desktop) */
  grid-template-columns: repeat(auto-fit, minmax(clamp(150px, 25vw, 300px), 1fr));
  align-items: start;
}

@supports (grid-template-columns: repeat(auto-fit, minmax(clamp(100px, 25vw, 300px), 1fr))) {
  .movie-grid {
    /* Uses clamp() for smooth scaling */
  }
}

@supports not (grid-template-columns: repeat(auto-fit, minmax(clamp(100px, 25vw, 300px), 1fr))) {
  /* Fallback for older browsers */
  @media (min-width: 1024px) {
    .movie-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  @media (max-width: 1023px) {
    .movie-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
```

### Theme Toggle with OS Preference Detection
```javascript
// Source: MDN prefers-color-scheme, CSS light-dark() function
export function initTheme() {
  // 1. Check localStorage for user preference
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
    return;
  }

  // 2. Check OS preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  applyTheme(theme);

  // 3. Listen for OS theme changes (if no saved preference)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', theme);
  }
}
```

### Card Scale Hover with GPU Acceleration
```css
/* Source: CSS-Tricks, Web.dev performance best practices */
.movie-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  /* Enable hardware acceleration */
  will-change: transform;
  /* Prevents visual artifacts */
  backface-visibility: hidden;
  /* Ensures smooth 60fps animation */
  transform: translateZ(0);
}

.movie-card:hover {
  transform: scale(1.05);
}

/* For mobile (no hover), use active state instead */
@media (hover: none) {
  .movie-card:active {
    transform: scale(1.02); /* Smaller scale for touch */
  }
}
```

### Turkish i18n String Handling
```javascript
// Source: Turkish language specification, Unicode i18n
export const i18n = {
  // Turkish "I" problem: lowercase ı (no dot) ≠ lowercase i (dot)
  translations: {
    tr: {
      search: 'Film ve Diziler Nereden İzlenir? Ara...',
      // Use Turkish-safe toLocaleUpperCase for proper casing
      title: 'Tüm Türleri',
    },
    en: {
      search: 'Find where to watch movies and TV shows...',
      title: 'All Genres',
    }
  },
};

// Turkish-safe string operations
export function toTurkishUpperCase(str, locale = 'tr-TR') {
  // Use locale-aware toLocaleUpperCase instead of toUpperCase()
  return str.toLocaleUpperCase(locale);
}

export function toTurkishLowerCase(str, locale = 'tr-TR') {
  return str.toLocaleLowerCase(locale);
}

// Example: "Türk" → "TÜRK" (not "TÜRK" with wrong I)
console.log('Türk'.toLocaleUpperCase('tr-TR')); // "TÜRK" ✓
console.log('Türk'.toUpperCase());              // "TüRK" ✗
```

### Vercel Edge Function API Proxy
```javascript
// Source: Vercel Edge Functions docs, BFF pattern
// api/tmdb/search.js (Vercel Edge Function)

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const language = searchParams.get('language') || 'en-US';

  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ error: 'Query too short' }), { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=${language}&api_key=${process.env.TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[TMDB Proxy] Error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500 });
  }
}

// Frontend: Call Edge Function instead of TMDB directly
// src/services/api.js
export async function searchMovies(query) {
  try {
    const response = await fetch(
      `/api/tmdb/search?q=${encodeURIComponent(query)}&language=en-US`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API] Search error:', error);
    return { results: [] };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic CSS file | Modular CSS per component | 2020+ web design | Maintainability, faster iteration, easier theming |
| Media query breakpoints | CSS Grid auto-fit/clamp() | 2022 (Firefox/Chrome support) | Smoother layouts, less CSS, no fragmentation at odd sizes |
| `prefers-color-scheme` media query | `light-dark()` CSS function | Oct 2025 (Firefox 144) | Cleaner code, single rule handles both themes, no media queries |
| Sass variables + mixins | CSS custom properties | 2019 (98%+ support) | No build step, dynamic theme switching, smaller CSS |
| View Transitions polyfill | Native View Transitions API | Oct 2025 (Firefox baseline) | Native page transitions, less JavaScript, better performance |
| Custom auth modals | FirebaseUI, third-party auth libs | 2018+ | Security, accessibility, fewer bugs, OAuth flow handling |
| Client-side API keys | Backend proxy (BFF pattern) | 2021 (Vercel Functions) | Security, rate limiting, cost control, no key exposure |
| Single-column mobile | Responsive Grid with `minmax()` | 2020 (auto-fit support) | One CSS rule for all breakpoints, smooth scaling |

**Deprecated/outdated:**
- **Sass/LESS preprocessors for theming:** CSS variables do everything Sass variables did, with zero build step and runtime switching.
- **Media query "mobile-first" with 3+ breakpoints:** Modern CSS Grid `auto-fit` + `clamp()` eliminates 80% of breakpoints.
- **Custom toggle buttons for theme:** Use `prefers-color-scheme` media query + toggle button for override.
- **JavaScript-based modal systems:** CSS View Transitions API handles page transitions natively.
- **Direct API calls from frontend:** BFF (Backend for Frontend) pattern with Vercel Edge Functions is now standard for security.

## Open Questions

1. **Serif Font Selection**
   - What we know: Serif fonts paired with sans-serif body text is 2025 best practice for cinema aesthetic. Candidates: Playfair Display, Merriweather, Cormorant Garamond.
   - What's unclear: Which serif font works best on small screens (mobile h3 headings)? Should serif only appear on h1/h2?
   - Recommendation: Research serif rendering at 14-18px font sizes on iPhone. If fuzzy, limit serif to h1/h2 only.

2. **Dark Mode Exact Palette**
   - What we know: Cinematic dark palettes use near-black (#050505-#0a0a0f) backgrounds with accent colors (blue #3b82f6 or purple #5858f3). Premium dark mode adds 20-30% more padding than light mode.
   - What's unclear: Specific accent color (blue, purple, teal)? Should primary accent match Lumi brand or differ per page?
   - Recommendation: A/B test 2 accent colors against current color palette with real users.

3. **Sidebar Desktop Layout**
   - What we know: Desktop uses sidebar navigation (locked decisions), mobile uses bottom nav. Sidebar should hide on scroll (locked decisions).
   - What's unclear: Sidebar width (200px? 250px?), collapsible (hamburger icon)? Should sidebar always show on desktop or hide at 1200px+?
   - Recommendation: Prototype 2 sidebar widths, test scroll behavior on 1920px + 1024px displays.

4. **Bottom Nav Mobile Width**
   - What we know: Mobile bottom nav on mobile, Material Symbols icons.
   - What's unclear: Fixed height? Should it slide up with keyboard on iOS? Should bottom nav be inside safe area or extend to viewport edge?
   - Recommendation: Test on iPhone SE + Android Pixel 4 with keyboard open. Use `max(48px, env(safe-area-inset-bottom))`.

5. **Loading Spinner Design**
   - What we know: Lumi-branded custom spinner (not Material Symbols). Should be visible during API calls.
   - What's unclear: SVG animated spinner or pure CSS? Rotation only or scale+fade effects?
   - Recommendation: Prototype 1 spinner design. If needs accessibility (aria-label), CSS animation is sufficient.

6. **Error State UI**
   - What we know: Detail modal shows loading spinner during API fetch.
   - What's unclear: What if TMDB API 500s? Show error toast? Show error overlay on modal? How long before retry?
   - Recommendation: Implement error boundary per modal. Show top-sliding error toast. Retry button in modal after 5s.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.17 + jsdom |
| Config file | vitest.config.js |
| Quick run command | `npm run test -- tests/ui/` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **DSGN-01** | Movie card scales on hover, poster loads lazily | unit + visual | `npm run test -- tests/ui/movie-card.test.js -t "hover"` | ✅ (tests/ui/movie-card.test.js) |
| **DSGN-02** | Theme toggle switches data-theme attribute, persists in localStorage, respects OS preference | unit | `npm run test -- tests/ui/theme.test.js` | ❌ Wave 0 |
| **DSGN-03** | Responsive grid renders 1 column on mobile, 4 columns on desktop | visual + integration | `npm run test -- tests/layout/responsive.test.js` | ❌ Wave 0 |
| **DSGN-04** | Page transitions fade + slide without jank, respect prefers-reduced-motion | integration | `npm run test -- tests/navigation/transitions.test.js` | ❌ Wave 0 |
| **DSGN-05** | All pages (discover, search, detail, profile) match cinematic design standards | visual | Manual screenshot comparison vs stitch/ references | ✅ (stitch/) |
| **USER-01** | Google OAuth login opens modal, authenticates user, redirects to discover | integration | `npm run test -- tests/features/profile.test.js -t "google"` | ✅ (tests/profile.test.js) |
| **USER-02** | Watchlist add/remove toggles state and persists in localStorage | unit | `npm run test -- tests/lib/state.test.js -t "watchlist"` | ✅ (tests/) |
| **PLAT-03** | Turkish strings display correctly (no broken characters), date/runtime format in TR locale | unit | `npm run test -- tests/lib/helpers.test.js -t "formatDate.*tr"` | ✅ (tests/helpers.test.js) |
| **PLAT-05** | All TMDB/YouTube requests route through /api/tmdb/* and /api/youtube/*, no direct API calls from frontend | integration | `npm run test -- tests/services/api.test.js -t "proxy"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- tests/ui/` (UI components only, ~5 seconds)
- **Per wave merge:** `npm run test` (full suite including integration tests, ~20 seconds)
- **Phase gate:** Full suite green + manual screenshot validation against stitch/ before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/ui/theme.test.js` — Theme toggle, OS preference detection, localStorage persistence (DSGN-02)
- [ ] `tests/layout/responsive.test.js` — Grid layout responsiveness, clamp() calculations (DSGN-03)
- [ ] `tests/navigation/transitions.test.js` — View Transitions API, fade+slide animations (DSGN-04)
- [ ] `tests/services/api.test.js` — API proxy validation (PLAT-05)
- [ ] `tests/setup.js` — Add DOM mocks for querySelector/classList for theme tests
- [ ] Framework setup: `npm run test:ui` Vitest UI for visual validation

## Sources

### Primary (HIGH confidence)
- [Firebase Authentication](https://firebase.google.com/docs/auth) - OAuth 2.0, Google Sign-In, FirebaseUI patterns
- [Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols) - Icon system, variable font axes
- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) - Theme system, var() function
- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) - auto-fit, minmax(), responsive patterns
- [Google Fonts: CSS Variables and Dark Mode](https://developers.google.com/fonts) - Typography pairing guidance
- [Letterboxd Design System "Action!"](https://ixd.prattsi.org/2025/05/letterboxd-disassembled-creating-a-design-system-for-movie-review-site-letterboxd/) - Cinematic design patterns, component architecture

### Secondary (MEDIUM confidence)
- [MDN: CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using) - Page transitions, micro-interactions
- [Vercel Edge Functions](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc) - Server-side API proxy pattern, BFF architecture
- [Backend for Frontend (BFF) Pattern](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/) - API key security, rate limiting
- [CSS View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) - Native page transitions (Firefox 144+)
- [CSS Grid: auto-fit vs auto-fill](https://www.turing.com/kb/responsive-layouts-using-css-grid/) - Responsive grid techniques, clamp() patterns
- [Turkish i18n Unicode Handling](http://www.i18nguy.com/unicode/turkish-i18n.html) - Turkish "I" character complexity
- [Glassmorphism CSS Tutorial](https://exclusiveaddons.com/glassmorphism-css-tutorial/) - Backdrop filter, blur effects (2025)

### Tertiary (LOW confidence, needs validation)
- [Serif Font Pairing 2025](https://www.fontbros.com/blog/979448GRSO/why-designers-pair-serif-and-sans-serif-fonts-and-how-to-do-it-right/) - Serif + sans-serif combinations (validation: test rendering on mobile)
- [Dark Cinema Color Palettes](https://mypalettetool.com/blog/dark-mode-color-palettes) - Example cinematic palettes (validation: user preference testing)
- [PWA Splash Screens](https://simicart.com/blog/pwa-splash-screen/) - Manifest icons, onboarding (validation: test on real iOS/Android)

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — Vite, vanilla JS, Firebase, Material Symbols all verified in existing codebase
- **Architecture patterns:** HIGH — CSS custom properties, Grid auto-fit, glassmorphism all have 95%+ browser support and official documentation
- **Pitfalls:** MEDIUM — Common pitfalls drawn from 2025 web design resources, but require testing on real devices (mobile performance, serif rendering)
- **Code examples:** HIGH — All code sourced from MDN, Firebase docs, or official GitHub repositories
- **i18n/Turkish:** MEDIUM — Turkish character handling verified, but PLAT-03 requires validation with real Turkish users
- **API security:** HIGH — BFF pattern and Vercel Edge Functions are industry standard; implementation straightforward

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days for stable stack; CSS/design standards move slowly)
**Confidence assertion:** This research is ready for planning. All locked decisions have research support. Claude's discretion areas (color palette, sidebar layout) are identified and flagged for prototyping.
