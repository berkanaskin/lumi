# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- JavaScript (ES6+/ES2024) - Browser and Node.js environments
- HTML5 - Page structure and markup
- CSS3 - Styling with custom properties and flexbox/grid layouts

**Secondary:**
- JSON - Configuration and data formats

## Runtime

**Environment:**
- Node.js (development and build)
- Browser (runtime) - ES Modules

**Package Manager:**
- npm (Node Package Manager)
- Lockfile: `package-lock.json` (present and committed)

## Frameworks

**Core:**
- Vite 7.3.1 - Build tool and dev server
- Firebase 12.7.0 - Authentication and Firestore database

**Testing:**
- Vitest 4.0.17 - Unit test runner
- JSDOM 27.4.0 - DOM simulation for testing
- @vitest/ui 4.0.17 - Test UI dashboard

**Build/Dev:**
- ESLint 9.39.2 - Code linting
- @eslint/js 9.39.2 - ESLint JavaScript ruleset
- globals 17.0.0 - Global variable definitions for ESLint

## Key Dependencies

**Critical:**
- Firebase 12.7.0 - Authentication (Google, Email/Password), Firestore database, Cloud Storage
  - Loaded via CDN: firebase-app-compat, firebase-auth-compat, firebase-firestore-compat (versions 10.7.1)
  - Client-side configuration from environment variables

**Infrastructure:**
- None identified as build-time infrastructure beyond Vite

## Configuration

**Environment:**
- Environment variables use Vite `VITE_` prefix for client-side exposure
- Configuration file: `src/config.js` - loads environment variables at build time
- Development vs. production modes handled via `import.meta.env.DEV` and `import.meta.env.PROD`

**Key Environment Variables:**
- Client-side (public): `VITE_TMDB_API_KEY`, `VITE_YOUTUBE_API_KEY`, `VITE_OMDB_API_KEY`
- Firebase configuration: `VITE_FIREBASE_*` (7 env vars for project setup)
- Server-side only: `GEMINI_API_KEY`, `RAPIDAPI_KEY`, `REVENUECAT_API_KEY`

**Build:**
- Vite config: `vite.config.js` (1265 bytes)
- ESLint config: `eslint.config.js` - ES modules, relaxed for legacy code migration
- Vitest config: `vitest.config.js` - JSDOM environment, test pattern: `tests/**/*.{test,spec}.{js,ts}`
- Package.json scripts: dev, build, preview, lint, lint:fix, test, test:watch, test:ui, test:coverage

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- npm or yarn
- Git for version control
- Browser with ES6+ support

**Production:**
- Deployment target: Vercel (indicated by `/api/` serverless function structure and `.vercel/` directory)
- Static hosting with serverless functions for API proxies
- Edge runtime for API functions (`export const config = { runtime: 'edge' }`)

## Build Output

**Output Directory:** `dist/` (contains compiled and minified assets)

**Build Configuration:**
- Source maps: enabled in development
- Minification: esbuild
- Base path: `/` (root path for Vercel)
- Entry point: `index.html`

## Module System

**Module Type:** ES Modules (ESM)
- `"type": "module"` in package.json
- All source files use `import`/`export` syntax
- Legacy compatibility: window global exports for non-module scripts in HTML

---

*Stack analysis: 2026-03-18*
