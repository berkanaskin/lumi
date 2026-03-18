# Pitfalls Research Summary for Lumi

**Researched:** 2026-03-19

**Overall Confidence:** HIGH

---

## Key Findings

Research identified **10 critical pitfalls** specific to AI-powered movie/TV discovery platforms with streaming data, ratings aggregation, freemium models, and PWA features. These fall into distinct vulnerability windows:

### Early-Stage Vulnerabilities (Phase 1-2)
- Turkish "I" localization breaks fundamentals (search, sorting, string comparison)
- API rate limit monitoring absent; cost overruns happen silently
- Embedding search lacks retraining schedule; quality degrades as content grows

### Feature Launch Vulnerabilities (Phase 2-6)
- AI search creates filter bubbles without explicit diversity mechanisms
- Streaming availability data becomes stale; erodes trust immediately
- Ratings aggregation hides critic-audience divergence; misleads users
- Community ratings vulnerable to bombing; moderation required from day 1
- PWA offline mode breaks on reconnect if sync logic missing
- Geolocation detection wrong for VPN/traveling users without override

### Monetization Vulnerabilities (Phase 6)
- Freemium paywall shown too early; users haven't experienced value
- Community features require anti-spam measures before going public

---

## Impact Level by Phase

| Phase | Pitfall | Impact | Prevention Effort |
|-------|---------|--------|-------------------|
| **1: Setup** | Turkish "I" string handling | Foundation-level: breaks search/sorting in TR | LOW — implement before feature work |
| **1: Setup** | API cost monitoring absent | Silent budget overruns, financial surprise | LOW — dashboards needed now |
| **2: AI Search** | Filter bubble trap | User retention cliff at week 2-3 | MEDIUM — requires retraining logic |
| **2: AI Search** | Embedding degradation | LLM fallback costs spike as catalog grows | MEDIUM — schedule retraining upfront |
| **4: Streaming** | Stale availability data | Trust destroyed, feature becomes liability | MEDIUM — provider SLA verification needed |
| **4: Streaming** | Geolocation wrong for VPNs | Support burden, UX confusion | LOW — add manual region override |
| **5: Ratings** | Aggregation misleads users | User churn, feature backfires | LOW — redesign ratings display |
| **6: Community** | Review bombing vulnerability | Credibility destroyed week 1 | MEDIUM — moderation required pre-launch |
| **6: Freemium** | Paywall timing wrong | Conversion <1%, user churn spikes | MEDIUM — A/B testing required |
| **7: PWA** | Offline sync conflicts | Data loss, user frustration, platform bloat | MEDIUM — conflict resolution logic needed |

---

## Critical Success Criteria by Phase

These tie pitfalls to measurable phase gates:

### Phase 1: Setup & i18n
- ✓ Turkish string case handling works (`.toLocaleString('tr-TR')`)
- ✓ Sorting by title works in Turkish
- ✓ CI includes Turkish test cases
- ✓ API cost dashboard created; daily spend reports configured

### Phase 2: Hybrid AI Search
- ✓ Embedding quality test on holdout set passes
- ✓ Embedding retraining schedule documented (quarterly)
- ✓ LLM fallback rate monitoring in place (<20% of queries)
- ✓ Diversity mechanism prevents filter bubble (10-15% explore results)
- ✓ Load test: 1,000 concurrent users triggers rate limiting, not crashes

### Phase 4: Streaming Availability
- ✓ Provider data freshness verified (document API update window)
- ✓ Manual testing: 10 random titles match current provider state
- ✓ User manual region override works (fallback to user choice over IP geolocation)
- ✓ Users can report outdated availability (feedback loop implemented)

### Phase 5: Ratings Aggregation
- ✓ Ratings display shows sources separately (IMDB, RT, MC, not average)
- ✓ Critic vs. audience scores labeled clearly
- ✓ Divergence flagged when gap >1.5 points
- ✓ User survey: >80% understand the difference between critic and audience ratings

### Phase 6: Community Ratings + Freemium
- ✓ Rate limiting: max 1 rating/hour/IP; max 10 ratings/day/user
- ✓ Temporal spam detection: 50+ ratings/hour → quarantine
- ✓ Machine learning review screening in place
- ✓ Manual moderation workflow exists before public launch
- ✓ Paywall conversion >2%; no churn spike post-impression
- ✓ Free tier users experience clear value before paywall appears

### Phase 7: PWA & Offline
- ✓ Offline indicator shows ("Offline Mode — data may be outdated")
- ✓ Offline actions (ratings, favorites) queue for sync
- ✓ Conflict resolution UI shown if offline edit conflicts with server
- ✓ Storage limits enforced; no unexpected disk bloat
- ✓ Load test: offline → reconnect → sync resolves correctly

---

## Pitfall Prevention Checklist

Before shipping each feature, verify:

#### AI Search (Phase 2)
- [ ] Diversity mechanism prevents filter bubble
- [ ] Embedding retraining schedule exists and is automated
- [ ] LLM fallback rate is <20% in production testing
- [ ] Cost monitoring alerts configured

#### Streaming Availability (Phase 4)
- [ ] Data freshness verified with provider (TTL documented)
- [ ] Manual region override implemented
- [ ] Timestamp shown ("Last updated: 2h ago")
- [ ] User feedback loop for "Is this available?" implemented

#### Ratings Aggregation (Phase 5)
- [ ] Sources displayed separately, not averaged
- [ ] Critic vs. audience clearly labeled
- [ ] Divergence flagged when significant
- [ ] User testing confirms comprehension

#### Community Ratings (Phase 6)
- [ ] Rate limiting enforced (per-user, per-IP)
- [ ] Spam detection ML model trained and tested
- [ ] Manual moderation workflow documented
- [ ] Load test: 100 coordinated accounts fail to manipulate top rating

#### Freemium Model (Phase 6)
- [ ] Paywall A/B tests show >2% conversion
- [ ] Free tier shows clear value before upgrade prompt
- [ ] Analytics track paywall impression → conversion → churn
- [ ] Users can see upgrade path clearly

#### PWA Offline (Phase 7)
- [ ] Offline indicator always visible
- [ ] Offline actions sync without data loss
- [ ] Conflict resolution UI works
- [ ] Storage size monitoring in place

#### Internationalization (All Phases)
- [ ] Turkish "I" problem fixed (toLocaleString)
- [ ] Sorting works in Turkish (Intl.Collator)
- [ ] Turkish test cases in CI
- [ ] Turkish user testing confirms all strings work

---

## Risk Ranking

Pitfalls sorted by impact × probability without prevention:

1. **Filter bubble traps users** (HIGH impact, HIGH probability) — Directly affects retention
2. **Turkish localization breaks search** (HIGH impact, HIGH probability) — Foundation issue; blocks Turkish launch
3. **Stale streaming data** (MEDIUM-HIGH impact, HIGH probability) — Trust multiplier; easy to fail
4. **API costs spiral** (MEDIUM impact, HIGH probability) — Silent until bill arrives
5. **Community ratings manipulated** (MEDIUM impact, MEDIUM probability) — Rare but catastrophic when it happens
6. **Paywall timing wrong** (MEDIUM impact, MEDIUM probability) — Monetization risk
7. **PWA offline conflicts** (MEDIUM impact, MEDIUM probability) — User data loss risk
8. **Ratings aggregation misleads** (MEDIUM impact, LOW probability) — Recoverable via redesign
9. **Embedding model degradation** (MEDIUM impact, LOW probability) — Gradual decline, preventable with monitoring
10. **Geolocation wrong for VPNs** (LOW impact, MEDIUM probability) — Support burden, easy fix

---

## Roadmap Implications

**Phase ordering should reflect pitfall dependencies:**

1. **Phase 1: Setup** must complete Turkish i18n verification and API cost monitoring setup before any features launch
2. **Phase 2: Hybrid AI Search** must include embedding retraining logic from day 1; can't retrofit
3. **Phase 4: Streaming Availability** must verify data freshness with providers; stale data = feature failure
4. **Phase 5: Ratings Aggregation** must redesign display before launch (not after criticism)
5. **Phase 6: Community Ratings & Freemium** must implement anti-spam and paywall A/B testing before public launch
6. **Phase 7: PWA Offline** must implement sync conflict resolution; offline-only saves break user trust

**Red flags that indicate a pitfall is being ignored:**

- API spend dashboard doesn't exist (Phase 1 gate failure)
- Embedding retraining not scheduled (Phase 2 gate failure)
- Streaming provider update window not documented (Phase 4 gate failure)
- Ratings display shows single average instead of sources (Phase 5 gate failure)
- Community ratings go public without rate limiting tests (Phase 6 gate failure)
- Offline mode doesn't queue actions for sync (Phase 7 gate failure)

---

## Research Gaps

Areas that need deeper investigation during phase-specific planning:

1. **Embedding model evaluation metrics**: Which similarity metrics (cosine, L2, etc.) perform best for movie/TV descriptions? Needs testing before Phase 2
2. **Provider data SLA specifics**: Exact update frequencies for Watchmode, Streaming Availability API vary by region. Needs documentation per country before Phase 4
3. **Review bombing frequency**: How often do coordinated review bombing attacks happen on indie/niche films? Helps prioritize moderation resources in Phase 6
4. **Paywall psychology**: Which features feel Premium vs. should be free for movie/TV discovery? A/B test design needed before Phase 6
5. **Turkish streaming availability**: Catalog differs significantly from EN countries. Regional provider list needed before Phase 4

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| **Critical pitfalls** | HIGH | Documented across multiple sources (case studies, post-mortems, academic research) |
| **Prevention strategies** | HIGH | Concrete implementations exist (rate limiting, conflict resolution, spam detection) |
| **Phase mapping** | MEDIUM-HIGH | Based on research, but requires verification against Lumi's specific roadmap |
| **Turkish i18n risk** | HIGH | Well-documented, confirmed in i18next issues and localization guides |
| **Ratings aggregation** | HIGH | Multiple design case studies show this mistake repeated across platforms |
| **Streaming data freshness** | MEDIUM | Based on API documentation; exact TTLs need per-provider verification |
| **AI filter bubble** | HIGH | Academic research + streaming platform patterns confirm this trend |
| **Community moderation** | HIGH | Documented across review platforms (Steam, Metacritic, Goodreads) |
| **PWA offline sync** | MEDIUM | General PWA patterns clear; Lumi-specific sync logic needs design in Phase 7 |

---

## Next Steps

1. **Validate with team**: Review pitfalls against Lumi's specific architecture and constraints
2. **Add to phase gates**: Incorporate pitfall prevention criteria into Phase success definitions
3. **Schedule design work**: Pitfalls needing UI work (ratings display, paywall, offline UI) need design before implementation
4. **Create monitoring dashboards**: API costs, LLM fallback rate, review bombing detection all need real-time visibility
5. **Document decisions**: For each pitfall, record why it's prioritized this way (rationale, tradeoffs, constraints)

---

*Research completed: 2026-03-19*

*Source: Comprehensive ecosystem analysis of movie/TV discovery platforms, AI search systems, ratings aggregation, freemium models, PWA implementation, and community platforms*
