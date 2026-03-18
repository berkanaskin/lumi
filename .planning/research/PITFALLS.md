# Domain Pitfalls: Movie/TV Discovery Platform

**Domain:** AI-powered movie/TV discovery platform with streaming availability, ratings aggregation, freemium model, and PWA capabilities

**Researched:** 2026-03-19

**Confidence:** HIGH (based on ecosystem analysis, post-mortems, community patterns, and documented case studies)

---

## Critical Pitfalls

### Pitfall 1: AI Search Filter Bubble Traps Users in Echo Chambers

**What goes wrong:**

Over-personalized AI recommendations create filter bubbles where users only see content matching their established preferences. The algorithm becomes so good at predicting what they've already watched that it stops showing diverse or novel content. Users end up cycling through similar genres indefinitely, reducing exploration and perceived value of the platform.

**Why it happens:**

Developers optimize the AI model purely for engagement metrics ("maximize watch clicks") without balancing for serendipity. Hybrid embedding + LLM approaches default to returning high-confidence matches rather than weighted diversity. No mechanism exists to deliberately surface content slightly outside the user's typical preferences.

**How to avoid:**

- Implement a **diversity threshold** in embedding search: include 10-15% of results from outside the user's top genres, tagged as "explore" recommendations
- Add explicit user controls: "Show me more like this" vs. "Surprise me" with different algorithms powering each
- Monitor engagement across new-to-user content separately; if users abandon "explore" results, the algorithm needs adjustment, not removal
- Track Cold Start Problem: new users with zero history shouldn't immediately lock into narrow recommendations
- Include anti-features in rating: deliberately downweight repeating the same director/actor/genre within a single week

**Warning signs:**

- User retention drops after week 2-3 (initial engagement peak followed by decline)
- Engagement metrics show users only clicking on results from 2-3 genres consistently
- A/B test shows diversified results have lower CTR but higher long-term retention
- Community feedback: "All recommendations are the same" or "Recommended this to me 5 times"

**Phase to address:**

**Phase 2 or 3** (Hybrid AI Search implementation) — bake diversity into the embedding model from the start. Retrofitting after launch is expensive.

---

### Pitfall 2: Stale Streaming Availability Data Erodes Trust

**What goes wrong:**

Streaming availability data becomes outdated — platform shows Netflix has a title, but it was removed last week. User clicks through to Netflix, content is gone. Platform credibility tanks immediately. Users stop trusting availability claims and stop using the "where to watch" feature entirely. The core differentiator becomes a liability.

**Why it happens:**

External APIs (Watchmode, Streaming Availability API, etc.) have cache TTLs measured in days or weeks. Data can be 3-7 days stale during rapid content rotation. Most developers assume "if we call the API, data is current" without checking update frequency. No monitoring of mismatches between cached availability and reality.

**How to avoid:**

- **Document API staleness upfront**: Verify TTL for each streaming data provider. Watchmode, Streaming Availability API, and TMDB all have different update windows
- **User-facing transparency**: Show "Last updated: 2 hours ago" for streaming availability, not just content availability
- **Implement feedback loop**: Add "Is this available?" user-reportable button on detail pages feeding corrections back to your database
- **Cache aggressively with fallbacks**: If data is stale, show a "Availability may have changed" disclaimer rather than stale data with confidence
- **Monitor provider health**: Track when API responses change and publish those timestamps to Firestore, visible to users
- **Verify multi-country**: Streaming catalog varies by region; stale data in one country shouldn't be served to another

**Warning signs:**

- Users report "I went to watch this and it's not there" more than 2-3 times per 100 clicks
- Streaming availability feature has lower engagement than other detail page sections
- API responses show old timestamps (>1 day old data served to users)
- No mechanism exists to detect provider outages or API lag

**Phase to address:**

**Phase 4** (Streaming Availability feature launch) — test data freshness before shipping. This is a trust multiplier or trust destroyer; no middle ground.

---

### Pitfall 3: Ratings Aggregation Hides Critic-Audience Divergence

**What goes wrong:**

Platform shows single aggregated score (e.g., 7.5/10 averaging IMDB + Rotten Tomatoes + Metacritic) hiding the fact that critics rated it 5.8 while audiences gave it 8.1. User watches based on aggregate, discovers mismatch, feels misled. Worse: some users always trust critics, others always trust audiences; aggregation removes their ability to filter by perspective.

**Why it happens:**

Developers treat all rating sources as equally valid. Different platforms use different rating methodologies (IMDB: user 1-10, RT: binary critic fresh/rotten + audience percentage, Metacritic: weighted critic average + user score). Averaging across these is mathematically unsound and masks real disagreement.

**How to avoid:**

- **Never display single aggregated score alone.** Always show the source breakdown: IMDB 7.2, RT Critics 65% / Audience 82%, Metacritic 72
- **Separate critic vs. audience scores explicitly**: "Critics: 6.5 | Audiences: 8.1" lets users self-filter
- **Explain methodology briefly**: "IMDB: User ratings 1-10 | RT: % of critics who liked it" prevents misinterpretation
- **Highlight divergence when it's large**: If critic-audience gap > 1.5 points, add a warning badge: "Audiences much higher than critics"
- **Track which source users trust**: Analytics should show if click-through is influenced by which rating they see first
- **Use individual scores in recommendations**, not aggregates (IMDB for user-driven suggestions, critics for prestige recommendations)

**Warning signs:**

- High user churn after watching "high-rated" content (suggests aggregation mislead users)
- Comments like "Why did you recommend this, it's terrible?" (user trusted aggregate that didn't match their criteria)
- Zero engagement with ratings display (users aren't looking at it because it's confusing)
- Analytics show same content has very different click-through when different rating source is shown

**Phase to address:**

**Phase 5** (Ratings Aggregation feature) — design rating display before data integration. Showing wrong thing is worse than showing nothing.

---

### Pitfall 4: Community Ratings System Vulnerable to Review Bombing and Spam

**What goes wrong:**

Lumi launches community ratings (Premium feature). Bad actors coordinate review bombing on controversial content. Platform shows "1/10 - 14,000 ratings" for a divisive film when those are coordinated attacks, not organic user preferences. Platform credibility collapses. DMCA takedown requests arrive from studios claiming defamation. Community feature becomes liability.

**Why it happens:**

Developers assume users rate honestly and build simple averaging. No detection for coordinated activity, suspicious IP blocks, velocity spikes, or temporal clustering. One retweet calling for review bombing can flood the system in minutes. Research shows 30-35% of online reviews are spam or manipulated.

**How to avoid:**

- **Require verified viewership**: Users can only rate content they've proven they've watched (watch history integration, Premium subscription level, or explicit "Did you watch this?" confirmation)
- **Implement temporal analysis**: Flag if 50+ ratings arrive within same hour from different accounts; quarantine from public display pending review
- **Track IP/device fingerprints**: Detect coordinated rating campaigns (multiple accounts from same IP). Rate limit ratings per IP per hour
- **Use machine learning screening**: Implement basic sentiment consistency checks (all 1-star reviews with identical language = spam signal)
- **Show confidence intervals, not just averages**: "Rating: 7.2 (based on 142 verified ratings, 88% confidence)" communicates data quality
- **Separate verified from unverified**: Show "Verified viewers: 7.8" and "All users: 6.9" so divergence is visible
- **Include human moderation triage**: Automated system flags suspicious patterns; humans review top-flagged items weekly
- **Platform-wide abuse reporting**: Allow users to flag suspicious rating patterns as well

**Warning signs:**

- Sudden rating shifts (>0.5 point swing in <1 hour) on controversial content
- Rating distribution is bimodal (all 1s or 10s, no middle ground) for individual titles
- Multiple accounts created same day, all rating same content
- Community complaints about manipulation; users lose trust in ratings

**Phase to address:**

**Phase 6** (Community Ratings Premium feature) — design detection system before launch. Once public, trust is hard to rebuild. Consider soft launch with moderation before full rollout.

---

### Pitfall 5: PWA Offline Mode Appears Functional But Breaks on Content Changes

**What goes wrong:**

PWA works beautifully offline for cached pages. User opens app on airplane, browses cached movie titles, clicks detail page, everything loads smoothly. But the data is 3 days old — different cast, different ratings, missing new trailers. User thinks the app is broken, not realizing they're offline. Or worse: user rates movie offline, goes online, conflicts with server state cause data loss.

**Why it happens:**

Developers cache the UI and think "offline functionality" is solved. They don't cache dynamic data (ratings, streaming availability, cast) or implement conflict resolution. Service workers proxy requests but don't distinguish "this can work stale" from "this must be fresh." Offline state isn't explicitly communicated to users.

**How to avoid:**

- **Transparent offline indicator**: Show "Offline Mode — some data may be outdated" banner permanently when no network. Don't let users forget they're offline
- **Segment caching by freshness tier**: Cache UI indefinitely, cache movie metadata for 24 hours, never cache streaming availability or ratings offline (they change too fast)
- **Implement sync queue**: User actions taken offline (favorites, ratings) are stored locally and queued for sync. On reconnect, replay with conflict detection
- **Conflict resolution strategy**: If user rated movie 8/10 offline but server shows it 7/10 (another user's edit), surface the conflict: "Your rating [8] conflicts with [7]. Accept or discard?"
- **Storage limits and warnings**: Cache takes disk space. Warn users if offline cache exceeds 50MB and offer cleanup
- **Disable write operations offline if risky**: If conflict resolution is complex, show "Rating unavailable offline" rather than risking data loss
- **Test offline explicitly**: Add Lighthouse audit for offline functionality; test with network throttle monthly

**Warning signs:**

- Users report "data is outdated" when viewing offline
- Ratings or favorites disappear after offline session
- Support tickets: "Why did my watchlist disappear?"
- Offline users report confusion about what's cached vs. not

**Phase to address:**

**Phase 7** (PWA implementation) — design offline strategy upfront. Retrofit sync logic is expensive and error-prone.

---

### Pitfall 6: Geolocation Detection for Streaming Availability Has Privacy and Accuracy Traps

**What goes wrong:**

Platform detects user location via IP to show correct streaming availability for their region. User travels to Turkey for vacation, but IP geolocation says Germany (VPN or ISP routing), so they see German streaming catalog instead of Turkish. Content they need isn't available. Alternatively, platform asks for GPS permission, many users deny it, platform falls back to IP (inaccurate), and shows wrong data anyway.

Worse: if platform collects GPS location persistently for streaming features, it violates privacy expectations. Users discover location tracking and churn. GDPR/local privacy laws create compliance risk.

**Why it happens:**

Developers implement IP geolocation for convenience (no permission needed). It's often inaccurate (±100 miles typical). Users traveling cross-country or using VPNs see wrong data. GPS is more accurate but requires permission and battery drain. No fallback or manual region selection exists, so wrong detections are permanent until they travel again.

**How to avoid:**

- **Always offer manual region override**: Display "Showing availability for: [Detected Country]. Change →" and let users set region explicitly. Store in Firestore.
- **Default to IP geolocation (fast, no permission), but communicate uncertainty**: "Showing content available in [Country] (based on your connection). This may not be accurate if you use VPN."
- **Implement optional GPS as supplement, not requirement**: Offer "Use precise location" toggle for accuracy, clearly labeled. Make it optional.
- **Don't persist location unnecessarily**: Only retain region preference in Firestore, not GPS coordinates. Location data from request should not be logged long-term.
- **Test with VPN/ISP-routed addresses**: Regularly verify IP geolocation accuracy by testing from different regions. Document known issues.
- **Multi-country support from day one**: Lumi targets EN + TR. Ensure streaming availability changes instantly when user switches region. Test each country pair.
- **Privacy-first UX**: Never request location permission on app startup. Only ask when user navigates to streaming availability feature, with clear explanation why.

**Warning signs:**

- Users report "Wrong country — I'm on vacation but seeing my home country's content"
- Privacy-conscious users disable location permission; they see generic/unavailable results
- Support queue fills with "How do I change my region?" questions
- Analytics shows users toggle region setting repeatedly (sign that auto-detection is failing)

**Phase to address:**

**Phase 4** (Streaming Availability) — design region handling before building. Multi-region support is a foundation, not a feature.

---

### Pitfall 7: Embedding Search Model Requires Retraining When Content Library Grows

**What goes wrong:**

Hybrid AI search launches: embeddings for 5,000 titles work beautifully. Lumi scales to 50,000 titles. Embeddings become less accurate because the original vector space was trained on smaller dataset. Or new titles aren't embedded (no retraining scheduled). Searches start returning irrelevant results. Users revert to keyword search. Expensive LLM fallback activates for every query because embeddings fail. Costs spiral.

**Why it happens:**

Developers treat embeddings as "fire and forget." They generate embeddings once, store them, and assume they work forever. But embeddings are statistical models trained on a specific dataset. As that dataset grows, relevance degrades. No scheduled retraining exists, so new content isn't embedded, or old embeddings become stale.

**How to avoid:**

- **Plan embedding lifecycle upfront**: Schedule retraining quarterly (or monthly if rapidly adding content). Document the schedule and automate it with Vercel cron jobs or Cloud Tasks
- **Implement embedding versioning**: When you retrain, version embeddings (v1, v2, v3). Keep old versions for 30 days to migrate gradually
- **Monitor embedding quality**: Track LLM fallback rate weekly. If fallback exceeds 20% of queries, trigger retraining immediately
- **Batch new content**: Don't embed single new titles as they arrive. Accumulate 100-500 new titles, then batch embed and swap vector index
- **Use vector database with index management**: Services like Pinecone or Weaviate handle index versioning. Don't build embedding storage from scratch
- **Test on holdout set**: Before swapping embeddings, test new model on historically good queries. Ensure relevance improves, doesn't regress
- **Cap embedding dimensionality**: Smaller dimensions (256-512) are cheaper and faster than 1536. Test tradeoff between cost and quality early

**Warning signs:**

- LLM fallback rate increases month-over-month
- New content never appears in embedding search results
- Users report searches returning irrelevant results
- Embedding generation costs don't decrease per-title over time (sign of inefficient process)

**Phase to address:**

**Phase 2** (Hybrid AI Search) — design embedding infrastructure for scale before launch. Once live, retraining requires careful migration.

---

### Pitfall 8: Freemium Paywall Shown Too Early Blocks Core Discovery Value

**What goes wrong:**

User lands on Lumi, immediately encounters "Sign up to unlock AI search" or "Premium only: streaming availability." They haven't yet experienced the core value (discovering what to watch). They leave. Conversion is near-zero because they don't know what they're missing.

Alternatively, paywall is hidden perfectly, but when it appears (after 3 recommendations), users resent the interruption. They've already mentally committed to free search and won't upgrade.

**Why it happens:**

Business stakeholders push to monetize early. Developers place paywall based on feature (Premium = community ratings) without considering user journey. Users haven't experienced value yet, so willingness-to-pay is zero. Research shows users who understand value before paywall are 30% more likely to convert.

**How to avoid:**

- **Let users discover freely first**: Free tier shows 5-10 AI recommendations before suggesting Premium. User experiences value, then upgrade feels natural
- **Distinguish free vs. paid features clearly**: Core discovery is free (browse, AI search, ratings display, streaming availability). Premium = community ratings, release notifications, full trivia, offline beyond basic cache
- **Time paywall to natural breakpoints**: Show upgrade prompt after user saves 5 movies (they're engaged), not on first search
- **Use conditional paywalls**: If user searches and results are limited ("Only 3 results shown in free tier"), that's a strong moment to upsell
- **Test with analytics**: Measure paywall impression → conversion → churn. If conversion drops below 2% or churn spikes after paywall, timing is wrong
- **Use free trial for uncertain users**: 3-day free Premium trial after first 10 searches lets them experience value before deciding
- **Make cancellation painless**: Easy-to-find unsubscribe link reduces trust issues and actually improves conversion (users feel in control)

**Warning signs:**

- Paywall impression rate is high, but conversion is <1%
- User churn spikes 1-2 days after first paywall impression
- A/B test shows users who see paywall earlier convert worse than those who see it later
- Support tickets: "Why is [basic feature] Premium?"

**Phase to address:**

**Phase 6** (Freemium + RevenueCat) — test paywall timing with analytics before launch. Adjust based on real user behavior, not assumptions.

---

### Pitfall 9: API Rate Limits and Cost Overruns on Multiple Data Sources

**What goes wrong:**

Platform calls TMDB (free tier: 40 requests/10s), YouTube API (quoted, not free), Gemini embeddings API (paid), Gemini LLM fallback (paid), Rotten Tomatoes scraping (violates ToS if not licensed), and streaming availability API (paid). A viral moment hits: 10,000 users on simultaneously. One user triggers 20 API calls across 4 services. Rate limits hit immediately. Platform returns 429 errors. Users blame Lumi, not the API. Costs spike 10x monthly spend. Budget explodes.

**Why it happens:**

Developers integrate APIs independently without understanding rate limits. No global rate limiting exists across services. Caching isn't aggressive enough. Cost monitoring isn't set up; bills arrive as surprises. Fallback chains (if TMDB fails, try backup) multiply requests.

**How to avoid:**

- **Document every API and its limits upfront**: TMDB free tier = 40 req/10s, YouTube Data API = 10,000 units/day, Gemini = 15 req/min (free tier), etc. Create rate limit budget spreadsheet.
- **Implement exponential backoff and jitter**: If you hit rate limit, don't retry immediately. Wait 2s, then 4s, then 8s with random jitter to prevent thundering herd
- **Cache aggressively with layered strategy**:
  - Query cache (Redis): "Titanic" search → reuse for 1 hour
  - TMDB responses → cache 24 hours (data doesn't change often)
  - Embedding results → cache search queries + results for 7 days
  - Avoid calling TMDB for every detail page view; use Firestore cache
- **Set hard limits on per-user API spend**: Track tokens per user/day. If user does 50 searches, some get cached results instead of fresh LLM calls
- **Use AI gateway or middleware**: Services like Vercel AI SDK or LangChain handle rate limiting, caching, and cost controls centrally. Don't call APIs directly from client
- **Monitor costs in real-time**: Set up Gemini API quota alerts at 50% and 80% of monthly budget. Set up TMDB monitoring to track request rates. Daily reports to team
- **Test under load before launch**: Simulate 1,000 concurrent users. Measure actual API calls. If call volume is 5x what you budgeted, that's a phase-gate blocker
- **Negotiate volume discounts early**: Once you know your cost profile, contact API providers for discounts if you're a high-volume user

**Warning signs:**

- First week of launch costs 5x what was budgeted
- Rate limit errors appear in logs
- API call volume doesn't plateau; it keeps growing (no caching)
- Billing surprises (unexpected charges for overage)

**Phase to address:**

**Phase 2-3** (Hybrid AI Search + Ratings integration) — set up cost monitoring immediately. Don't wait for launch to discover the problem.

---

### Pitfall 10: Turkish "I" Problem in Localization Breaks Search and Sorting

**What goes wrong:**

Lumi supports EN + TR. Developer implements search that does `query.toLowerCase()` for matching. English: "IRON MAN" → "iron man" (works). Turkish: "KIZ" (girl) → "kız" (correct). But JavaScript's String.toLowerCase() in Turkish locale returns "kIz" (dotless i), not "kız". Searches fail silently. Or sorting by title breaks: Turkish title "İzle" (watch) sorts incorrectly because uppercase İ (dotted I) converts wrong.

**Why it happens:**

Turkish has unique character rules: uppercase I (no dot) ↔ lowercase ı (no dot), and uppercase İ (dot) ↔ lowercase i (dot). English only has I ↔ i. JavaScript's default toLowerCase() respects locale in some browsers, ignores it in others. String comparisons without locale-awareness fail. Developers test in English only, miss the bug entirely.

**How to avoid:**

- **Always specify locale in string operations**: Use `string.toLocaleString('tr-TR')` for Turkish, `string.toLocaleString('en-US')` for English. Don't use default `toLowerCase()`
- **Use Intl API for comparisons**: `new Intl.Collator('tr-TR').compare(a, b)` for sorting handles Turkish characters correctly
- **Test Turkish-specific strings in CI**: Add test cases: "İzle", "KIŞI" (person), "KIZ" (girl). Verify toLowerCase and sorting work
- **Document i18n standards in README**: Turkish localization requires special case handling. Future developers need to know this isn't just a translation problem
- **Use i18n library that handles this**: Libraries like i18next or intl-messageformat have built-in support. Don't build string manipulation from scratch
- **Test under Turkish locale**: Set system locale to Turkish in test environment and run full test suite. This catches subtle breakage

**Warning signs:**

- Turkish users report search returns no results for common titles
- Sorting by title appears broken in Turkish version
- User feedback: "Search works in English, broken in Turkish"
- Analytics shows Turkish search engagement is 50% lower than English

**Phase to address:**

**Phase 1** (Setup, i18n system) — verify Turkish string handling before adding content. This is a foundation issue, not a feature.

---

## Technical Debt Patterns

Common shortcuts that seem reasonable in MVP but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Cache streaming availability for 7 days (stale) | Simple implementation, no polling logic | Users see outdated data; trust erodes; users stop checking availability | Never — find provider with 24h update window instead |
| Aggregate ratings as simple average (IMDB + RT + MC) / 3 | Quick to implement, single number | Hides critic vs. audience divergence; misled users; feature becomes liability | Only if you plan to redesign before public launch |
| Single IP-based geolocation, no user override | Launch faster, no manual region input | Wrong data for VPN users, travelers; support burden increases | Only for beta. Manual region selector is critical for launch |
| Embed all content on day one, no scheduled retraining | Get to market quickly | Embeddings degrade as library grows; LLM fallback explodes costs; search becomes unusable | Acceptable if you schedule retraining before doubling library size |
| Show "Coming Soon" for community ratings instead of implementing moderation | Ship feature gate without anti-spam | Users expect moderation; first abuse wave destroys credibility | Never — moderation must be baked in before public launch |
| Cache embeddings in Firestore instead of vector DB | Firestore is already in stack; avoid new service | Vector search becomes slow at 10k+ titles; can't query by similarity efficiently; must migrate later | Only if expecting <5k titles at launch and willing to migrate Phase 3-4 |
| No offline support; PWA just caches UI | Simpler logic; faster launch | Offline users see stale data, think app is broken; ratings/favorites conflict on reconnect | Only if explicitly out of scope. Lumi targets mobile, so PWA offline is table stakes |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **TMDB API** | Assuming free tier limits are generous; no fallback when quota hits | Document 40 req/10s limit upfront. Implement request queuing. Cache responses 24 hours. Have fallback (cached data older than 24h is acceptable) |
| **YouTube Data API** | Calling it for every detail page load; quota burns fast | Cache video list in Firestore, refresh once daily. Use YouTube embed fallback if API fails |
| **Gemini Embeddings** | Regenerating embeddings on every query; not caching results | Cache embedding vectors in Pinecone/Weaviate. Recompute only on content updates or monthly retraining cycle |
| **Gemini LLM** | Every query triggers LLM call; massive cost | Design hybrid: 80% resolve with embeddings, 10% fall back to LLM on low confidence, 10% user feedback triggers retraining |
| **Streaming Availability API** | Not checking update frequency; serving stale data as current | Verify update window with provider (often 24-48h lag). Show timestamp to users. Test data freshness weekly |
| **Firebase Auth** | Assuming all sign-up methods work globally; provider issues vary by region | Test Google OAuth and email auth separately in EN and TR. Have support path if provider fails (email fallback, etc.) |
| **RevenueCat** | Integrating subscription logic directly; hard to change if RevenueCat fails | Keep RevenueCat calls in adapter layer. If provider fails, graceful degradation: show Premium features, allow use, mark as "offline purchase" pending reconciliation |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Embedding search without batching** | Query latency increases 500%+ as title count grows from 5k to 50k | Use batch embedding generation monthly. Version embeddings. Implement approximate nearest neighbor search (not exhaustive) | >10k titles |
| **No caching layer on TMDB calls** | TMDB rate limit hit within 1 hour of launch with 100 concurrent users | Cache TMDB responses in Firestore/Redis. 24-hour TTL for metadata, 1-hour for images. Implement cache warming for top 1000 titles | >500 concurrent users, >100 req/s |
| **Single point of failure on YouTube API** | Detail page breaks completely if YouTube API is down | Implement fallback: show static "Watch trailer on YouTube" link if API fails. Cache video list in Firestore | >1k detail page views/day |
| **No rate limiting on LLM calls** | One user doing 100 searches per minute burns entire monthly LLM budget | Set per-user rate limits: max 10 searches/min, max 100/day. Use cost middleware to track and alert | >100 users on platform |
| **Unindexed Firestore queries on large collections** | User profile loads take 10+ seconds as watchlist grows from 50 to 500+ items | Index `userId + createdAt` on watchlist collection. Paginate results (20 per page). Implement local caching in IndexedDB | >100k total watchlist items |
| **Service worker caching entire movie library** | App storage balloons to 500MB+; users complain about disk space | Segment cache: UI indefinitely, metadata 24h, videos never, user data never. Implement cache size monitoring + user cleanup prompt | >20k users with app installed |
| **No connection pooling to Firestore** | Timeouts and connection resets under load | Use Firebase Admin SDK with connection pooling (built-in). Test with load simulator. Monitor connection count | >1k concurrent users |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|----------|
| **Scraping Rotten Tomatoes/IMDb without license** | DMCA takedown, legal action, site becomes unavailable, user trust destroyed | Use official APIs (OMDb for IMDb, RT has limited API) or licensed aggregation service (Watchmode) only. Document data source in UI. Review ToS before integration |
| **Persisting GPS location data for geolocation** | GDPR fines (up to 4% revenue), privacy lawsuits, user backlash on discovery | Only store region preference (country code), never GPS coordinates. Delete location from request logs after 24h. Implement privacy policy updates before launch |
| **Storing plaintext API keys in Vercel env** | Attacker extracts keys, abuses quotas, racks up charges, accesses user data via YouTube/TMDB | Use Vercel's secure env variable storage (values not visible in UI). Rotate keys quarterly. Monitor API key usage via provider dashboards |
| **No rate limiting on community rating endpoint** | Attacker floods 1 movie with 1,000 spam ratings; platform credibility destroyed; costs to moderate spike | Implement per-IP rate limiting (1 rating/hour/IP). Require auth (logged-in users only). Implement review bombing detection (50+ ratings/hour triggers quarantine) |
| **Storing user ratings in client-side cache without server sync** | User data loss if cache clears; users think their ratings are saved, they're not; frustration and churn | All user-generated content (ratings, watchlist) must sync to Firestore immediately or queue for sync on reconnect. Show sync status in UI |
| **No validation on text fields in community ratings** | XSS attacks in user-submitted reviews (if you ever add review text); account takeover | Sanitize all user input with DOMPurify or similar. Use Content Security Policy headers. Never render user input as HTML; always use `.textContent` for strings |
| **Exposing internal API URLs in client logs** | Attacker discovers backend endpoint structure, fuzzes for vulnerabilities | Use opaque API routes (/api/search not /api/tmdb/search). Never log full URLs. Implement CORS strictly |

---

## UX Pitfalls

Common user experience mistakes in movie/TV discovery platforms.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **Too many navigation options in sidebar; primary actions hidden** | Users can't find watchlist, favorites, search. High bounce rate. Assumes social features (activity) are equal priority to core features (discovery) | Bottom nav bar for primary actions: Home, Search, Watchlist, Profile. Keep sidebar for secondary options. Prioritize discovery over social |
| **Overwhelming filter options without defaults** | User sees 20 filters (genre, rating, year, runtime, etc.), picks 5, gets 0 results. Frustrated. Clicks elsewhere | Default to "All content, sorted by popularity." Apply filters incrementally; show result count updating. Suggest filter combinations |
| **Ambiguous "What should I watch?" message** | Users don't know if searching means AI or keyword. Unclear if free or paid. Confused onboarding | Label AI search explicitly: "Describe what you want to watch (AI-powered)" vs. "Search by title, actor, director" for keyword search. Show paywall early if Premium |
| **Ratings shown without context** | User sees 8.5/10 on a niche indie film, assumes it's broadly excellent. Actually, 12 people rated it. Not representative | Show sample size: "8.5 ⭐ (1,247 ratings)" for IMDB vs. "65% Fresh (42 critic reviews)" for RT. Context prevents misinterpretation |
| **Streaming availability shown but content not there** | User clicks "Watch on Netflix", Netflix says unavailable. Trust eroded | Add "Last checked: 2 hours ago" timestamp. Implement user feedback: "Is this still available?" button. Fall back to "Check on Netflix" link if confidence is low |
| **Detail page doesn't show why this was recommended** | User sees recommended movie, no context for why. Seems random. Doesn't trust recommendations | Add one-liner: "Recommended because you liked [similar movie]" or "Matches your mood: indie drama, 2020+" |
| **Watchlist grows to 500 items, becomes unusable** | User can't find anything to watch in their own list. List defeats its purpose | Add sorting (by date added, rating, etc.), categories, or smart list suggestions: "Recently added", "Highly rated from your list", "Similar to [movie you just watched]" |
| **PWA install UX absent or unclear** | Users don't know app is installable. Bounce to web every session. High friction | Show install prompt after 2-3 visits. On mobile Safari (iOS), explain iOS PWA limitation upfront: "Installable on Android, works on iOS but not installable yet" |
| **Premium paywall kills momentum** | User finds perfect movie via free AI search, attempts to view detail page, "Premium only" appears. Loses them | Gate the paywall, not the detail view. Free: see detail and ratings. Premium: community ratings, offline download, notifications |
| **No onboarding for new users** | User lands, sees discover page, doesn't know what to do. Clicks around aimlessly. Bounces | Onboarding: "1. Search or browse. 2. Save to watchlist. 3. View availability." Show mini-tutorial on first visit. Offer guided tour option |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Hybrid AI Search:** Often missing — cost monitoring and LLM fallback triggers. Verify that embedding search resolves 70%+ of queries; LLM fallback is <20% of volume and <30% of cost
- [ ] **Streaming Availability:** Often missing — data freshness verification and user feedback loop. Verify provider update frequency, show timestamp to users, test region switching
- [ ] **Ratings Aggregation:** Often missing — critic vs. audience separation and divergence handling. Verify all sources display independently AND users can't be misled by weighted average
- [ ] **Community Ratings (Premium):** Often missing — spam detection and moderation workflow. Verify rate limiting, temporal analysis, and human review process are implemented before public launch
- [ ] **Geolocation for Streaming:** Often missing — manual region override and fallback UX. Verify users can override detected country AND VPN/traveling users aren't trapped
- [ ] **PWA Offline Mode:** Often missing — sync queue for offline actions and conflict resolution. Verify offline ratings don't disappear on reconnect; show sync status in UI
- [ ] **Freemium Paywall:** Often missing — analytics to measure paywall timing effectiveness. Verify conversion rate >2% and user churn doesn't spike post-paywall impression
- [ ] **Embedding Search:** Often missing — retraining schedule and embedding versioning. Verify quarterly retraining is planned; LLM fallback rate is monitored
- [ ] **API Integration:** Often missing — rate limit monitoring and cost alerts. Verify Gemini API, TMDB, YouTube all have per-service quota tracking; daily spend reports to team
- [ ] **Turkish Localization:** Often missing — string case handling and Turkish-specific test cases. Verify `toLocaleString('tr-TR')` is used for case conversion; search and sorting work in Turkish

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **Filter bubble traps users** | MEDIUM — Requires embedding retraining + UX redesign | 1. Audit embedding model diversity 2. Implement 10-15% explore results 3. A/B test vs. old model 4. Retrain if needed (1-2 weeks) 5. Communicate changes to users |
| **Stale streaming data erodes trust** | MEDIUM — Requires API provider change or additional source | 1. Analyze API freshness logs 2. Negotiate better update SLA with provider 3. If provider fails, switch to more frequent updates service 4. Add user feedback loop 5. Public apology + changelog |
| **Ratings aggregation misleads users** | LOW — Requires UI redesign only | 1. Redesign ratings display to show sources separately 2. Add critic vs. audience visual distinction 3. Highlight divergence when large 4. A/B test new design 5. Rollout gradually |
| **Community ratings manipulated** | HIGH — Requires retraining detection model + manual review | 1. Audit all ratings for patterns 2. Quarantine suspicious ratings 3. Implement machine learning detection 4. Manual moderation of flagged items 5. Adjust rating calculation to weight verified users more 6. Publish transparency report |
| **PWA offline breaks on reconnect** | MEDIUM — Requires sync logic refactoring | 1. Audit Firestore for conflicts 2. Implement merge resolution strategy 3. Add conflict display in UI 4. Migrate existing data 5. Test with known conflicts 6. Roll out gradually to 10% → 50% → 100% |
| **Wrong geolocation data for users** | LOW — Requires adding manual override | 1. Add "Change region" button to streaming availability section 2. Store user preference in Firestore 3. Prioritize preference over detected location 4. Test with known VPN/travel cases 5. Announce feature to users |
| **Embedding search quality degraded** | MEDIUM — Requires retraining + migration | 1. Generate new embeddings on holdout test set 2. Compare quality metrics 3. Retrain full model 4. Version old and new embeddings 5. Gradual rollout: 10% → 50% → 100% 6. Monitor LLM fallback rate |
| **Costs spiked unexpectedly** | MEDIUM — Requires optimization + rate limiting | 1. Audit which API is overspending (Gemini, TMDB, YouTube) 2. Implement rate limiting on that service 3. Add aggressive caching 4. Negotiate discount with provider if long-term customer 5. Set up spend alerts 6. Communicate next steps to stakeholders |
| **Freemium paywall converts poorly** | MEDIUM — Requires analytics analysis + timing adjustment | 1. Analyze paywall impression → conversion → churn funnel 2. A/B test earlier paywall (after 2 searches instead of 5) 3. A/B test later paywall (after 10 searches) 4. Measure both conversion and day-30 retention 5. Adjust based on data 6. Consider free trial as middle option |
| **Turkish search broken** | LOW — Requires i18n fix + test regression | 1. Add Turkish test cases to suite 2. Replace `.toLowerCase()` with `.toLocaleString('tr-TR')` 3. Fix sorting with Intl.Collator 4. Run Turkish locale tests in CI 5. Communicate fix to Turkish users 6. Regression test both EN and TR going forward |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Filter bubble (recommendation diversity) | Phase 2: Hybrid AI Search | Analytics: New users sample diverse content; engagement on "Explore" results >10% of total |
| Stale streaming data | Phase 4: Streaming Availability | Manual testing: Check 10 random titles; verify data matches current provider state within 1 day |
| Ratings aggregation divergence | Phase 5: Ratings Aggregation | Manual testing: Verify critic vs. audience shown separately; user survey confirms understanding of differences |
| Community rating spam | Phase 6: Community Ratings (Premium) | Load testing: Coordinate 100 accounts to rate test title; verify detection flags >90% of spam within 10 minutes |
| PWA offline conflicts | Phase 7: PWA & Offline | Testing: Rating offline → reconnect; verify no data loss and conflicts are surfaced if they occur |
| Geolocation accuracy | Phase 4: Streaming Availability | Manual testing: VPN to Turkey, Brazil, Germany; verify content availability matches each country; manual override works |
| Embedding model degradation | Phase 2: Hybrid AI Search | Monitoring: LLM fallback rate <20% week-over-week; schedule monthly retraining audit; version control embeddings |
| API cost overruns | Phase 2 onward: Setup cost monitoring NOW | Dashboard: Daily API call volume per service; weekly cost by service; alerts at 50%, 80%, 100% of budget; zero surprises |
| Freemium paywall timing | Phase 6: Freemium & RevenueCat | Analytics: Paywall conversion >2%; day-7 retention same for free and upgrading users; no churn spike post-paywall |
| Turkish "I" problem | Phase 1: Setup & i18n System | Automated testing: Turkish string test cases in CI; verify toLowerCase, sorting, search all work with Turkish characters |

---

## Sources

- [Leveraging AI in OTT and CTV Content Discovery](https://www.streamingmediaglobal.com/Articles/Editorial/Featured-Articles/Leveraging-AI-in-OTT-and-CTV-Content-Discovery-171249.aspx)
- [How Artificial Intelligence Is Changing TV Content Discovery](https://agiletv.com/how-ai-is-shaping-the-future-of-content-discovery/)
- [What Is AI Video Discovery? An Updated Guide for 2026](https://www.momentslab.com/blog/what-is-ai-video-discovery-an-updated-guide-for-2026)
- [IMDb vs. Rotten Tomatoes vs. Metacritic: Which Movie Ratings Site Is Best?](https://www.makeuseof.com/tag/best-movie-ratings-sites/)
- [Rotten Tomatoes, Metacritic, IMDB, and CinemaScore Explained](https://screenrant.com/rotten-tomatoes-metacritic-imdb-cinemascore-explained/)
- [Watchmode - Streaming Availability Metadata API](https://api.watchmode.com/)
- [Streaming Availability API](https://www.movieofthenight.com/about/api)
- [Mastering Freemium Paywalls: Strategic Timing for SaaS Success](https://www.getmonetizely.com/articles/mastering-freemium-paywalls-strategic-timing-for-saas-success)
- [The Guide to Improving Freemium Conversion Rate for SaaS](https://userpilot.com/blog/freemium-conversion-rate/)
- [What the best subscription apps get right about paywalls](https://www.revenuecat.com/blog/growth/how-top-apps-approach-paywalls/)
- [Offline and background operation - Progressive web apps | MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [How to Make Your PWA Work Offline](https://simicart.com/blog/pwa-offline/)
- [The Power of Place: Geolocation Tracking and Privacy](https://businesslawtoday.org/2019/03/power-place-geolocation-tracking-privacy/)
- [How Review Bombing Happens—and What Businesses Can Do About It](https://www.internetreputation.com/how-review-bombing-happens-and-what-businesses-can-do-about-it/)
- [Review bombing: ideology-driven polarisation in online ratings](https://link.springer.com/article/10.1007/s11135-024-01981-z)
- [The Economics and Design of Rating Systems in Digital Platforms](https://medium.com/the-discovery-imperative/the-economics-and-design-of-rating-systems-in-digital-platforms-01922e57b48b)
- [Exploring Semantic Search Using Embeddings and Vector Databases](https://medium.com/@pankaj_pandey/exploring-semantic-search-using-embeddings-and-vector-databases-with-some-popular-use-cases-2543a79d3ba6)
- [Embeddings, Vector Databases, and Semantic Search: A Comprehensive Guide](https://dev.to/imsushant12/embeddings-vector-databases-and-semantic-search-a-comprehensive-guide-2j01)
- [Letterboxd on steroids — a UX redesign case study](https://medium.com/design-bootcamp/letterboxd-on-steroids-a-ux-redesign-case-study-b88b7075a6a9)
- [Letterboxd Redesign: Improving the UX of a social film discovery platform](https://medium.com/@khushi.pro/letterboxd-redesign-improving-the-user-experience-of-a-social-film-discovery-platform-1b94a404ae09)
- [Rate Limiting in AI Gateway: The Ultimate Guide](https://www.truefoundry.com/blog/rate-limiting-in-llm-gateway)
- [LLM Cost Control: Practical LLMOps Strategies for Monitoring API Spend](https://radicalbit.ai/resources/blog/cost-control/)
- [LLM Token Optimization: Cut Costs & Latency in 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Token-Based Rate Limiting: How to Manage AI Agent API Traffic in 2026](https://zuplo.com/learning-center/token-based-rate-limiting-ai-agents)
- [LLM Cost Optimization: How to Reduce API Spending by 40-60%](https://leantechpro.com/llm-cost-optimization-reduce-api-spending/)
- [Internationalization for Turkish: Dotted and Dotless Letter "I"](http://www.i18nguy.com/unicode/turkish-i18n.html)
- [Fix i18n Bugs: Best Practices for Software Localization](https://linipeport.com/blog/i18n-bugs/)
- [What's Wrong With Turkey?](https://blog.codinghorror.com/whats-wrong-with-turkey/)

---

*Pitfalls research for: Movie/TV Discovery Platform (Lumi)*

*Researched: 2026-03-19*
