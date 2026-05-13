# Lumi

## What This Is

Lumi is an all-in-one movie and TV show discovery platform that answers the question "What should I watch?" Users describe what they want to watch in natural language, and Lumi returns smart, relevant recommendations. Beyond discovery, Lumi serves as a comprehensive content hub — showing ratings across platforms, streaming availability by location, trailers, behind-the-scenes content, cast/crew info, and trivia. It's a freemium PWA targeting global audiences in English and Turkish.

## Core Value

When someone doesn't know what to watch, Lumi understands what they're in the mood for and finds it — instantly, accurately, and beautifully.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ User can browse trending and popular movies/TV shows — existing (discover page)
- ✓ User can search for movies/TV shows by title — existing (search feature)
- ✓ User can view movie/TV show detail pages with cast, ratings, overview — existing (detail page)
- ✓ User can watch trailers via YouTube integration — existing (detail page video player)
- ✓ User can sign up/login with Google or email/password — existing (Firebase auth)
- ✓ User can save favorites and manage watchlist — existing (profile/state)
- ✓ User can get AI-powered recommendations — existing (Gemini AI search)
- ✓ App supports internationalization (EN/TR) — existing (i18n.js)
- ✓ App is deployed and accessible via Vercel — existing (vercel.json)
- ✓ Cinematic Letterboxd-style design with dark/light themes — Phase 1
- ✓ Responsive design (sidebar desktop, bottom nav mobile) — Phase 1
- ✓ Smooth page transitions and micro-interactions — Phase 1
- ✓ Complete design overhaul of all pages — Phase 1
- ✓ API calls routed through server-side Edge Functions — Phase 1
- ✓ Turkish-safe i18n with complete EN/TR coverage — Phase 1
- ✓ Natural language search with hybrid AI (embedding + LLM fallback) — Phase 2
- ✓ Autocomplete with poster thumbnails for title/actor/genre — Phase 2
- ✓ Watchlist-based personalized recommendations — Phase 2
- ✓ Diversity injection ("Belki de bunu beğenirsin") — Phase 2
- ✓ API cost monitoring dashboard (admin-only) — Phase 2

### Active

<!-- Current scope. Building toward these. -->
- [ ] Location-based streaming availability — show which platforms (Netflix, BluTV, MUBI, etc.) have the content based on user's current country
- [ ] Aggregated ratings display — show scores from IMDB, Rotten Tomatoes, Metacritic, and other major platforms on detail pages
- [ ] Comprehensive video content — trailers, behind-the-scenes, BTS, interviews, all project-related video content in one place
- [ ] Cast/crew deep info with trivia — detailed actor/director pages with filmography and trivia content
- [ ] Lumi community rating system — users can rate content, community averages displayed (Premium)
- [ ] Platform drop notifications — notify user when desired content becomes available on a streaming platform (Premium)
- [ ] Cinema release date tracking — show theatrical release dates (Free), notify when it drops on streaming (Premium)
- [ ] Full trivia access — complete trivia content for movies/shows (Premium)
- [ ] PWA support — installable on mobile devices, offline-capable where possible
- [ ] Freemium payment model — free tier with core features, premium tier via subscription (RevenueCat integration)
- [ ] Global multi-language support — English and Turkish from day one, expandable

### Out of Scope

<!-- Explicit boundaries. -->

- Native mobile apps (iOS/Android) — PWA approach chosen for single codebase efficiency
- Social features (following users, activity feeds) — not core to "what should I watch" mission
- Content streaming/playback — Lumi discovers and informs, doesn't host content
- User-generated reviews/long-form content — ratings yes, written reviews deferred
- Real-time chat or community forums — not aligned with core value

## Context

Lumi is a brownfield project with a functioning SPA built on Vite + vanilla JavaScript + Firebase. The existing codebase includes discover, search, detail, and profile features with TMDB as the primary data source, YouTube for trailers, and a Gemini AI integration for recommendations via a Vercel serverless proxy. Firebase handles auth (Google + email/password) and Firestore for user data. RevenueCat infrastructure is stubbed for future subscription management.

The current state has working features but needs design polish, deeper content integration, and the hybrid AI search system to fulfill the vision. The i18n system supports EN/TR. Deployment is on Vercel with serverless API routes for backend proxying.

Key existing infrastructure:
- TMDB API for movie/TV data
- YouTube Data API for video content
- Gemini AI via server-side proxy for recommendations
- Firebase Auth + Firestore for user management
- OMDb API stub for aggregated ratings
- RevenueCat stub for subscriptions
- Vercel deployment with Edge runtime API routes

## Constraints

- **Tech stack**: Continue with Vite + vanilla JS + Firebase — no framework migration
- **APIs**: TMDB is primary data source; OMDb for aggregated ratings; YouTube for video content
- **AI costs**: Hybrid approach (embedding + LLM fallback) to control costs — most queries should resolve without LLM
- **Deployment**: Vercel (existing infrastructure)
- **Monetization**: RevenueCat for subscription management (infrastructure already stubbed)
- **Design**: Letterboxd-inspired — cinematic, dark theme, poster-heavy, premium feel
- **Localization**: Must support EN + TR from launch; streaming availability varies by user's detected country

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Continue on existing Vite + vanilla JS stack | Working codebase, avoid migration risk, faster to ship | — Pending |
| PWA instead of native mobile apps | Single codebase, lower cost, sufficient for content discovery app | — Pending |
| Hybrid AI search (embedding + LLM fallback) | 80% of queries resolved cheaply via embedding search, LLM only for complex queries | — Pending |
| Letterboxd-style design direction | Cinematic, dark, poster-heavy — fits the movie/TV domain perfectly | — Pending |
| Global launch (EN + TR) | Broader market from day one, i18n already in place | — Pending |
| User community ratings as Premium feature | Incentivizes premium while keeping core discovery free | — Pending |
| **Premium pricing (locked 2026-05-13)** | TR is too price-sensitive for default Apple/Google PPP (~99/599/1499 TL). Custom 50%-scaled TR tier protects conversion. 7-day trial drives sub adoption; lifetime is limited to seed early revenue + scarcity. See `.planning/decisions/PREMIUM-PRICING.md`. | $2.99/mo • $19.99/yr • $49.99 lifetime (limited). TR: 49/299/799 TL custom PPP. 7-day trial on subs only. |
| **Production platforms (locked 2026-05-13)** | Native mobile UX (push, IAP, App Store discovery) is the path to monetization; web payment infra adds maintenance with no upside. RevenueCat unifies iOS + Android purchase + entitlement. | iOS + Android via Capacitor + RevenueCat. NO web premium. Web stays dev/test only. |
| **Lifetime archive (locked 2026-05-13)** | Lifetime is a launch-window scarcity offer, not a permanent SKU. Caps protect long-term ARPU while seeding early loyal users. | Cap at first 1000 lifetime purchases OR 90 days post-launch (whichever first). |

---
*Last updated: 2026-05-13 — Premium pricing + production platforms locked*
