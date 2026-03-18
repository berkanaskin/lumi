# Feature Research: Movie/TV Discovery Platform

**Domain:** Entertainment discovery and content aggregation
**Researched:** March 19, 2026
**Confidence:** HIGH (verified across Letterboxd, JustWatch, IMDB, Reelgood, and Netflix AI trials)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or inferior to competitors.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Search by title/actor/genre | Core discovery mechanism; baseline expectation from IMDB, Letterboxd, JustWatch | LOW | Should include auto-complete and filters |
| Detail page with cast/crew | Users need to understand what they're watching before committing time | MEDIUM | Cast/crew clickable to see filmography; need TMDB integration |
| Aggregated ratings (IMDB, RT, Metacritic) | Users compare scores across platforms to validate quality; no single rating is trusted | MEDIUM | Display prominently; clarify what each score means (user vs critic) |
| Streaming availability by region | JustWatch built $100M+ company on this; users need to know WHERE to watch | MEDIUM | Requires TMDB/JustWatch API; must be country-aware |
| Watchlist/favorites | Users save for later; baseline state management | LOW | Firebase-backed; already implemented in Lumi |
| Trailers and video content | Users want preview before watching; expected on detail pages | MEDIUM | YouTube integration (already implemented); add BTS/clips |
| Overview/synopsis | Plot summary helps decision-making | LOW | TMDB provides; display prominently |
| Release date tracking | Users want to know WHEN content is available/coming | LOW | Display theatrical vs streaming release dates |
| Authentication (login/signup) | Preserve state across sessions; baseline feature | LOW | Firebase Auth (already implemented) |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but highly valued by engaged users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Natural language/AI search | Users describe mood ("feel-good Korean drama") instead of keywords; Netflix testing this in 2025 | HIGH | Hybrid approach: embedding search (80%) + LLM fallback (20%) to control costs; Lumi has Gemini integration |
| Community ratings (Lumi-native) | Crowdsourced perspective distinct from IMDB/RT; builds platform stickiness | MEDIUM | Premium feature; requires user participation and data aggregation |
| Platform drop notifications | Alert when content lands on streaming service; Reelgood/JustWatch premium feature | MEDIUM | RevenueCat Premium feature; requires content availability data integration |
| Trivia and behind-the-scenes | Deepen engagement with interesting facts, production stories, cast anecdotes | MEDIUM | TMDB provides some; IMDb trivia is crowd-sourced and rich; curate top entries |
| Actor/director deep pages | Jump to filmography, filmography filtered by genre/rating, career stats | MEDIUM | Goes beyond search; Letterboxd Pro shows annual stats, decade breakdowns |
| Personalized recommendations | "People who liked X also liked Y" based on user's watchlist | MEDIUM | Collaborative filtering; requires user behavior data collection |
| Cinematic design/UX | Premium visual experience; Letterboxd-style poster-heavy dark theme | HIGH | Design differentiator; already scoped as core to Lumi identity |
| Location intelligence | Show what's available RIGHT NOW in your country; dynamic country detection | LOW-MEDIUM | TMDB handles this; auto-detect user country or settings-based |
| Curated lists/collections | Thematic film lists created by platform; featured recommendations | LOW-MEDIUM | Can be built on TMDB + editorial selection; low dev cost |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly avoid building.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Social following/activity feeds | "See what friends are watching" sounds engaging | Creates moderation overhead, privacy concerns, toxicity risk, shifts focus from discovery to social; Letterboxd's strength is NOT social as primary (it's secondary) | Watchlist sharing (one-way) instead of bidirectional following; keep social light |
| Long-form user reviews | "Let users write detailed reviews like IMDB" | Moderation burden, spam, review manipulation, quality control, storage costs; IMDB struggles with this; Rotten Tomatoes focuses on ratings not reviews | Community ratings (1-5 stars) instead of written reviews; link to IMDB/RT for in-depth reviews |
| Real-time chat/community forums | "Build community discussion" | Not aligned with "what should I watch" core mission; requires moderation, creates legal liability, fragments the app | Minimal feedback (ratings/thumbs-up); link to external communities if needed |
| Streaming playback integration | "Watch directly in the app" | Legal complexity (licensing per territory), payment processing, content protection, support burden, competes with existing services | Stay as aggregator; link to streaming platforms instead; let Netflix/Apple handle playback |
| User-generated spoiler content | "Let users share theories/discussions" | Spoiler management is hard; ruins discovery experience; creates moderation nightmare | Opt-in spoiler warnings on IMDB trivia section; don't encourage user-generated content |
| Advanced filtering by crew (DP, composer, etc.) | "Power users want this" | 80/20 rule: 5% of users need it; creates UI complexity; TMDB API doesn't expose this well | Basic filtering (director, actor); link to IMDbPro for deep crew filtering |

## Feature Dependencies

```
Authentication (Login/Signup)
    └──requires──> User State (Firestore)
                       └──enables──> Watchlist/Favorites
                                         └──enhances──> Personalized Recommendations
                                         └──enables──> Community Ratings (Premium)
                                         └──enables──> Platform Drop Notifications (Premium)

Search/Browse
    ├──requires──> TMDB API integration
    │                  ├──provides──> Detail Pages (cast, crew, overview)
    │                  └──provides──> Trailers (via YouTube)
    │
    ├──enhances──> Natural Language Search
    │                  ├──requires──> Embedding model (TMDB data vectors)
    │                  └──fallback──> Gemini LLM (for complex queries)
    │
    └──requires──> Streaming Availability Data
                       ├──requires──> JustWatch API or TMDB streaming data
                       └──enables──> Platform Drop Notifications

Aggregated Ratings Display
    └──requires──> OMDb API (IMDB, RT, Metacritic scores)

Cinematic Design & UX
    └──enhances──> All discovery features (searchability, detail page layout)

Trivia & Behind-the-Scenes
    ├──requires──> TMDB trivia/keywords data
    ├──requires──> YouTube BTS content discovery
    └──enhances──> Detail Page engagement

Actor/Director Deep Pages
    ├──requires──> TMDB filmography API
    ├──requires──> User data (ratings) for career stats
    └──enhances──> Discovery (click cast → see other films)

Community Ratings (Premium)
    ├──requires──> User authentication & state
    ├──requires──> Aggregation logic (average Lumi ratings)
    └──conflicts──> Aggregated ratings (can feel redundant if not differentiated)

Platform Drop Notifications (Premium)
    ├──requires──> Streaming availability data
    ├──requires──> Push notification system (RevenueCat integration)
    ├──requires──> Background job to track changes
    └──enhances──> Watchlist (notify when items are available)

Personalized Recommendations
    ├──requires──> User watchlist/ratings data
    ├──requires──> Collaborative filtering or LLM-based engine
    └──enhances──> Discover page
```

### Dependency Notes

- **Authentication requires User State:** Must persist login across sessions; state enables all Premium features
- **Search requires TMDB integration:** Detail pages, ratings, trailers all depend on TMDB as source of truth
- **Natural Language Search requires two substacks:** Embedding vectors (offline, fast, 80% of queries) + Gemini LLM (expensive, 20% of complex queries); neither works alone
- **Streaming Availability requires geo-awareness:** Must detect user country to show relevant platforms (Netflix US ≠ Netflix Turkey); hardcoded country list at launch, IP-based detection later
- **Trivia conflicts with user reviews:** IMDb trivia is curated factual content; user reviews are opinions. Keep separate to avoid moderation burden
- **Community Ratings vs Aggregated Ratings:** Both display ratings, but Lumi community is user-powered (sticky), aggregated is platform-agnostic. Don't make them redundant; position community as "what Lumi users think" (Premium)

## MVP Definition

### Launch With (v1.0 — Core Discovery)

**Minimum viable product to validate "What should I watch?" concept:**

- [x] **Search by title/actor/genre** — Users must find content; baseline discovery mechanism
- [x] **Detail pages (cast, crew, overview, ratings, trailers)** — Users need to decide before committing time
- [x] **Aggregated ratings display (IMDB, RT scores)** — Users validate quality before watching
- [x] **Streaming availability by region** — Core Lumi differentiator; shows where to watch
- [x] **Watchlist/favorites** — Users save for later; basic state persistence
- [x] **Authentication (Google + email/password)** — Preserve state across sessions
- [ ] **Natural language AI search** — "I want something feel-good" instead of exact title; Lumi's core differentiator
- [ ] **Cinematic design overhaul** — Dark theme, poster-heavy, premium visual feel (already scoped as Active)

**Why these and not others:** These solve the core problem ("What should I watch?"). Everything else is enhancement or monetization.

### Add After Validation (v1.x — Engagement & Monetization)

**Features to add once core is working and users validate the concept:**

- [ ] **Community ratings (Premium)** — Once user base reaches 1000+; incentivizes premium conversion
- [ ] **Platform drop notifications (Premium)** — Once streaming data is reliable; high engagement driver
- [ ] **Trivia & behind-the-scenes (Premium)** — Deepen engagement after discovery happens
- [ ] **Actor/director deep pages** — Increases time-on-site; enhances discovery chain
- [ ] **Personalized recommendations** — Requires sufficient user behavior data; collaborative filtering needs threshold

**Trigger for adding:** Monitor user engagement:
- Community ratings: Add when DAU reaches 5K+ (enough volume to make aggregation meaningful)
- Drop notifications: Add when user watchlist avg > 10 items (notification intent is clear)
- Trivia: Add when detail page bounce rate > 60% (users leave too early; need engagement hooks)

### Future Consideration (v2+ — Platform Expansion)

**Features to defer until product-market fit and monetization are established:**

- [ ] **Mobile app (iOS/Android)** — PWA strategy is validated; native apps only if PWA adoption stalls
- [ ] **International expansion beyond EN + TR** — Once EN + TR is stable; add 3-5 languages based on user demand
- [ ] **Advanced actor/crew filtering** — Low user demand; 5% of users care; defer until specifically requested
- [ ] **Streaming playback integration** — Legal complexity, licensing per territory, payment processing; stay as aggregator

**Why defer:** Distracts from core "discovery" mission. Platform expansion should follow PMF, not precede it.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Current Status |
|---------|------------|---------------------|----------|-----------------|
| Search by title/actor/genre | HIGH | LOW | P1 | ✓ Shipped |
| Detail page with cast/crew/ratings | HIGH | MEDIUM | P1 | ✓ Shipped |
| Aggregated ratings display | HIGH | MEDIUM | P1 | Partial (OMDb stubbed) |
| Streaming availability by region | HIGH | MEDIUM | P1 | Partial (TMDB data exists) |
| Watchlist/favorites | HIGH | LOW | P1 | ✓ Shipped |
| Trailers & video content | HIGH | MEDIUM | P1 | ✓ Shipped (YouTube) |
| Natural language AI search | HIGH | HIGH | P1 | Active (Gemini proxy ready) |
| Cinematic design overhaul | MEDIUM | HIGH | P1 | Active (design iteration) |
| Community ratings (Premium) | MEDIUM | MEDIUM | P2 | Planned |
| Platform drop notifications (Premium) | MEDIUM | MEDIUM | P2 | Planned |
| Trivia & behind-the-scenes (Premium) | MEDIUM | LOW | P2 | Planned |
| Actor/director deep pages | MEDIUM | MEDIUM | P2 | Planned |
| Personalized recommendations | MEDIUM | HIGH | P2 | Planned |
| Location intelligence (auto-detect) | LOW | LOW | P3 | Nice-to-have |
| Curated lists/collections | LOW | MEDIUM | P3 | Nice-to-have |
| Advanced crew filtering | LOW | MEDIUM | P3 | Defer indefinitely |
| Streaming playback | LOW | HIGH | P3 | Out of scope |
| Long-form user reviews | LOW | HIGH | P3 | Out of scope |

**Priority key:**
- **P1:** Must have for v1.0 launch (core discovery experience)
- **P2:** Should have for v1.x (engagement/monetization; add after validation)
- **P3:** Nice to have or future (defer until PMF or specific request)

## Competitor Feature Analysis

| Feature | Letterboxd | JustWatch | IMDB | Reelgood | Lumi Approach |
|---------|-----------|-----------|------|----------|---------------|
| **Search** | Title/actor/genre/user-created lists | Title/actor/genre + streaming filters | Title/actor/genre/keywords | Title/actor/genre + streaming | All + natural language (AI) |
| **Ratings Display** | Letterboxd community only | Aggregates from multiple platforms | IMDB user + critic (reviews) | IMDB + other aggregators | Aggregated (OMDb) + Lumi community |
| **Streaming Availability** | Partial (partnered with JustWatch) | Full integration (core product) | Links only | Full, 300+ services | Full by region (TMDB/JustWatch) |
| **Community Features** | Heavy (reviews, lists, follows) | Minimal (watchlists, notifications) | Moderate (reviews, lists, forum) | None (pure aggregator) | Minimal (ratings only, no follows) |
| **Personalization** | Yes (based on follows/activity) | Yes (based on tracked shows) | Basic (recommendations) | Basic (notifications) | Planned (collaborative filtering) |
| **Trivia/BTS Content** | Limited | None | Extensive (user-contributed) | None | Premium tier (curated) |
| **Video Content** | Limited (posters, clips) | None | Cast/crew pages | None | Trailers + BTS (YouTube) |
| **Design/UX** | Poster-heavy, community-focused | Utilitarian, data-focused | Information-dense | Minimalist | Cinematic (Letterboxd-inspired) |
| **Monetization** | Pro ($5.99/mo) — stats, critiques | JustWatch Pro — advanced filters | IMDbPro ($149.99/yr) — industry tools | Free (no premium) | Freemium (Premium TBD) |

**Key Insight:** No single competitor does everything well. Lumi can differentiate by:
1. **Natural language AI search** (Netflix testing; not standard yet)
2. **Streaming availability + community ratings** (JustWatch has #2, Letterboxd has #3; Lumi combines both)
3. **Cinematic design** (Letterboxd's strength; Lumi copying intentionally)
4. **Community-driven, not social-driven** (ratings, not reviews/follows)

## Feature Gaps in Ecosystem

Based on research, movie discovery apps are missing:

1. **Cross-platform recommendation engine** — "I want something like X but on Netflix (not IMDB-only)" — requires real-time streaming availability + recommendations. Lumi can own this.
2. **Mood-to-film matching at scale** — Netflix is testing AI search; most apps use genres. Lumi's natural language search can be the go-to for this.
3. **Release date + availability combo** — Show "coming to Netflix April 1" while available on Blu-ray now. Reelgood does notifications, but not integrated discovery.
4. **International genre understanding** — IMDB genres are US-centric. Korean apps have different genre taxonomies. Opportunity for localized discovery in Turkish market.

## Sources

- [Letterboxd features overview](https://letterboxd.com/)
- [Letterboxd Video Store announcement](https://letterboxd.com/journal/letterboxd-video-store/)
- [JustWatch platform features](https://www.justwatch.com)
- [JustWatch Wikipedia](https://en.wikipedia.org/wiki/JustWatch)
- [How to Use JustWatch in 2026](https://www.cloudwards.net/how-to-use-justwatch/)
- [IMDB Ratings and Platform Comparison](https://hombreytierra.com/imdb-ratings-meaning-impact-and-interpretation)
- [Reelgood streaming aggregator features](https://reelgood.com/faq)
- [Movie discovery apps and community ratings](https://www.tasteray.com/articles/movie-discovery)
- [Natural language search in movie discovery (Sony AI)](https://ai.sony/publications/Transformative-Movie-Discovery-Large-Language-Models-for-Recommendation-and-Genre-Prediction/)
- [Netflix AI search tool testing](https://mojoauth.com/blog/netflix-tests-openai-powered-ai-search-tool-for-easier-show-discovery/)
- [AI Video Discovery Guide for 2026](https://www.momentslab.com/blog/what-is-ai-video-discovery-an-updated-guide-for-2026/)
- [IMDb Trivia and cast/crew features](https://help.imdb.com/article/contribution/filmography-credits/cast/GH3JZC74FVYKKFMD)
- [Netflix notifications system](https://help.netflix.com/en/node/101522)
- [Letterboxd vs IMDB vs JustWatch comparison](https://appmus.com/vs/letterboxd-vs-imdb)
- [JustWatch, Letterboxd, Trakt comparison](https://twit.tv/posts/tech/justwatch-letterboxd-trakt-which-app-should-you-use-manage-your-watchlist)

---

*Feature research for: Movie/TV Discovery Platform (Lumi)*
*Researched: March 19, 2026*
*Milestone: Adding features to existing app*
