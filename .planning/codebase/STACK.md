# Technology Stack

**Analysis Date:** 2026-05-07

## Languages

**Primary:**
- JavaScript (ES2024, ESM) - All client + serverless function code
- HTML5 - Single-page entry (`index.html`), mobile-first viewport
- CSS3 - Mobile-only styling (custom properties, flexbox, grid, safe-area insets)

**Secondary:**
- JSON - Config (`package.json`, `firebase.json`, `firestore.indexes.json`, `vercel.json`)
- Firestore Security Rules DSL - `firestore.rules`

## Runtime

**Environment:**
- Node.js (build/dev + Vercel `nodejs` runtime functions)
- Browser (mobile-only target) - ES Modules
- Vercel Edge runtime - thin proxy functions (TMDB, YouTube, OMDb, Gemini, geoip, streaming-availability)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (committed)

## Frameworks

**Core:**
- Vite 7.3.1 - Dev server + build (`vite.config.js`)
- Firebase 12.7.0 - Auth + Firestore (modular SDK)
- firebase-admin 13.7.0 - Server-side admin SDK (used in Node.js API routes)
- Vercel AI SDK (`ai` 6.0.116) - LLM orchestration in `api/search.js`, `api/embeddings.js`
- `@ai-sdk/google` 3.0.53 - Gemini provider for AI SDK
- `@ai-sdk/openai` 3.0.41 - OpenAI provider for embeddings

**Testing:**
- Vitest 4.0.17 - Unit test runner (`vitest.config.js`)
- @vitest/ui 4.0.17 - Test UI dashboard
- jsdom 27.4.0 - DOM simulation

**Build/Dev:**
- ESLint 9.39.2 (flat config: `eslint.config.js`)
- @eslint/js 9.39.2 - JS ruleset
- globals 17.0.0

## Key Dependencies

**Critical (production):**
- `firebase` 12.7.0 - Client-side Auth (Google, Email/Password) + Firestore
- `firebase-admin` 13.7.0 - Server-side Firestore access in `api/search.js`, `api/embeddings.js`, `api/cost-dashboard.js`
- `ai` 6.0.116 - Streaming/non-streaming LLM calls via Vercel AI Gateway
- `@ai-sdk/google` 3.0.53 - `gemini-2.5-flash-lite` for semantic search
- `@ai-sdk/openai` 3.0.41 - `text-embedding-3-small` for vector embeddings

**Infrastructure:**
- Vite (build), Vitest (test), ESLint (lint) — no other build/infra deps

## Configuration

**Environment:**
- Vite `VITE_` prefix for client-side env vars
- Loader: `src/config.js` reads `import.meta.env`
- Mode flags: `import.meta.env.DEV`, `import.meta.env.PROD`

**Key Environment Variables:**
- Client (public): `VITE_TMDB_API_KEY`, `VITE_YOUTUBE_API_KEY`, `VITE_OMDB_API_KEY`, `VITE_FIREBASE_*` (7 vars)
- Server-only: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `RAPIDAPI_KEY`, `AI_GATEWAY_API_KEY`, `FIREBASE_ADMIN_*` (service account), `REVENUECAT_API_KEY` (optional)

**Build:**
- `vite.config.js` - root config, base `/`, esbuild minification
- `eslint.config.js` - flat ESLint v9 config
- `vitest.config.js` - jsdom env, tests under `tests/**/*.{test,spec}.{js,ts}`
- `vercel.json` - function routing + headers
- Firebase: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`
- Scripts: `dev`, `build`, `preview`, `lint`, `lint:fix`, `test`, `test:watch`, `test:ui`, `test:coverage`

## Platform Requirements

**Development:**
- Node.js 20+ (LTS)
- npm
- Modern browser DevTools with mobile device emulation (project is mobile-only)

**Production:**
- Vercel hosting (static + Edge + Node serverless functions)
- Firebase project (Auth + Firestore)
- Mobile-only target — no desktop layout exists

## Build Output

**Output Directory:** `dist/`

**Build Configuration:**
- Minifier: esbuild
- Source maps: dev only
- Base path: `/`
- Entry: `index.html`

## Module System

**Module Type:** ES Modules (`"type": "module"` in package.json)
- All `src/**/*.js` and `api/**/*.js` use `import`/`export`
- API routes export default async handler (Vercel) and a `config` object for runtime

## Project Application Type

- Mobile-only web app (Lumi - Film Keşif Platformu) v0.13.0
- Single-page architecture (`index.html` + `src/main.js`)
- No desktop or tablet variant — all CSS targets mobile viewport widths

---

*Stack analysis: 2026-05-07*
