# Phase 1: Design Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete visual overhaul of all Lumi pages to cinematic Letterboxd-quality design. Both dark and light themes polished. Auth/watchlist UX refined. i18n (EN/TR) verified. All API calls routed through server-side Edge Functions. Web and mobile (PWA) experiences designed separately — app feels like an app, website feels like a website.

</domain>

<decisions>
## Implementation Decisions

### Visual Identity
- Serif sinematik typography — serif for headings, sans-serif for body text
- Poster-dominant cards — large posters with info overlay on hover (Letterboxd style)
- Material Symbols icons (keep existing system)
- Keep existing Lumi logo, just polish it
- Responsive poster sizing — small on mobile, large on desktop
- Sinematik gradient/blur effects — pull colors from poster backdrops, blur effects, shadow layers
- Color palette: Claude's discretion — must feel cinematic and premium
- Stitch/Figma exports as design reference — existing good designs preserved, broken parts rebuilt

### Page Layouts
- Navigation: Sidebar on desktop, bottom nav on mobile
- Discover page: Hero banner (daily AI recommendation) + horizontal scroll rows on mobile, grid gallery on desktop
- Detail page: Modal overlay (keep existing pattern)
- Search: Existing structure maintained — film search and AI search are separate sections (reference current codebase)
- Profile: Claude's discretion — clean and functional
- Onboarding: Sinematik splash screen with backdrop poster blur + login/signup form overlay
- Login wall: Users must login/signup before accessing the app
- CSS structure: Claude's discretion — current 86KB monolith needs organization
- Sidebar content: Claude's discretion

### Platform-Specific Design (CRITICAL)
- Web (desktop) and mobile (PWA) must feel like separate experiences
- Mobile: Bottom nav, horizontal poster scroll, touch gestures, app-like feel
- Desktop: Sidebar nav, grid gallery layouts, hover interactions, website-like feel
- Both must be premium quality — don't design app like a website or website like an app

### Theme System
- Light theme: Pure white background — Apple-style minimal
- Dark theme: Cinematic dark (Claude picks specific palette)
- Default follows OS system preference, user can override manually
- Theme transition: Smooth fade (300-500ms color transition)

### Interaction Feel
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design References
- `stitch/` — Figma design exports; use as reference for existing good designs
- `index_lumi.css` — Current 86KB stylesheet; understand existing patterns before refactoring
- `src/ui/theme.js` — Existing theme toggle system (dark/light via data-theme attribute + CSS variables)

### Existing Components
- `src/ui/movie-card.js` — Current card component; redesign with poster-dominant + hover overlay
- `src/ui/toast.js` — Current toast system; redesign as top sliding toast
- `src/ui/loading.js` — Current loading states; replace with branded spinner
- `src/lib/navigation.js` — Current SPA navigation; add sidebar + bottom nav split

### Feature Modules (understand layout before redesigning)
- `src/features/discover.js` — Discover page logic; needs hero banner + scroll rows (mobile) / grid (desktop)
- `src/features/search.js` — Search page; film search and AI search are separate sections (keep this structure)
- `src/features/detail.js` — Detail modal; keep modal pattern, polish design
- `src/features/profile.js` — Profile/auth; add onboarding wall + splash screen

### API Security
- `api/gemini.js`, `api/tmdb.js`, `api/youtube.js` — Existing server-side proxies; ensure all API calls route through these
- `src/config.js` — Environment configuration; audit for client-exposed keys

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Known tech debt: inline event handlers, XSS risks, missing cleanup
- `.planning/codebase/CONVENTIONS.md` — Code style: 4-space indent, camelCase, ESLint enforced

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/ui/theme.js`: Theme toggle with localStorage persistence and data-theme attribute — extend with OS preference detection
- `src/ui/movie-card.js`: Card rendering with escapeHtml — redesign visual layer, keep data flow
- `src/lib/state.js`: Global state with localStorage — keeps working
- `src/lib/navigation.js`: SPA page routing via class-based visibility — extend for sidebar/bottom nav
- `i18n.js`: Full EN/TR translation strings (33KB) — verify completeness

### Established Patterns
- CSS custom properties via `data-theme` attribute — extend with new color tokens
- Feature modules export init functions called from `src/main.js`
- DOM-centric initialization with event-driven communication
- window.state for legacy compatibility between modules

### Integration Points
- `src/main.js` — App entry point; add sidebar/bottom nav initialization
- `index.html` — Root HTML; restructure for sidebar + content area layout
- All feature modules render into specific DOM containers — these need updating for new layout

</code_context>

<specifics>
## Specific Ideas

- "Letterboxd tarzı" — poster-heavy, dark, cinematic feel is the north star
- "Web sitesi mobil app ayrımını çok iyi yapmamız lazım" — desktop = website feel, mobile = app feel, both premium
- "Mevcut tasarımları bozuk olan ve kötü olan yerler hariç genel olarak referans alabiliriz" — preserve what works, rebuild what's broken
- Onboarding splash: Film posterleri/backdrop blur arka planında login formu — ilk izlenim sinematik olmalı
- Günün önerisi: Hero banner'da AI destekli günlük film/dizi önerisi

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-design-foundation*
*Context gathered: 2026-03-19*
