---
type: decision
status: LOCKED
created: 2026-05-15
locked: 2026-05-15
owner: Berkan
purpose: Curated per-region streaming platform lists for Lumi onboarding + provider overlay
---

# Per-Region Curated Streaming Platforms — Draft for Review

Top 10-12 platforms per launch region. Order = display priority. Lumi's primary source of truth — Streaming-Availability API + TMDB are cross-reference layers, this curated list wins on conflicts.

**Pre-selected on onboarding (recommended for new user):** marked with ⭐

---

## 🇹🇷 Türkiye (TR)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. HBO Max
5. Apple TV+
6. MUBI
7. Gain
8. Exxen
9. Tabii
10. TOD
11. Puhu TV

**Note:** BluTV closed entirely (2024). Its catalog moved to HBO Max. Not listed.

---

## 🇺🇸 United States (US)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Max (HBO)
5. Apple TV+
6. Hulu
7. Paramount+
8. Peacock
9. Crunchyroll
10. MUBI

---

## 🇬🇧 United Kingdom (GB)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. BBC iPlayer
5. NOW TV
6. Apple TV+
7. Sky Go
8. ITVX
9. BritBox
10. MUBI
11. Discovery+
12. Crunchyroll

---

## 🇩🇪 Deutschland (DE)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. WOW (Sky Ticket)
5. RTL+
6. Joyn
7. Apple TV+
8. Magenta TV
9. MUBI
10. Crunchyroll

---

## 🇫🇷 France (FR)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Canal+
5. myCANAL
6. OCS
7. Apple TV+
8. France TV
9. MUBI
10. Arte
11. Crunchyroll

---

## 🇪🇸 España (ES)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Movistar+
5. Apple TV+
6. HBO Max
7. Filmin
8. Atresplayer Premium
9. RTVE Play
10. MUBI
11. FlixOlé

---

## 🇮🇹 Italia (IT)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. NOW
5. Apple TV+
6. Sky Go Italia
7. RaiPlay
8. Mediaset Infinity
9. TIMVision
10. Discovery+
11. MUBI

---

## 🇯🇵 日本 Japan (JP)

1. ⭐ Netflix
2. ⭐ Amazon Prime Video Japan
3. Disney+
4. U-NEXT
5. Apple TV+
6. Hulu Japan
7. FOD (Fuji TV)
8. dTV / Lemino
9. ABEMA
10. Crunchyroll

---

## 🇰🇷 한국 Korea (KR)

1. ⭐ Netflix
2. ⭐ Disney+
3. Wavve
4. TVING
5. Coupang Play
6. Apple TV+
7. Watcha
8. Amazon Prime Video
9. MUBI

---

## 🇨🇦 Canada (CA)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Crave
5. Apple TV+
6. CBC Gem
7. Paramount+
8. Hulu (limited)
9. Tubi (free)
10. Citytv+
11. MUBI

---

## 🇦🇺 Australia (AU)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Stan
5. Binge
6. Apple TV+
7. Foxtel Now
8. ABC iView
9. SBS On Demand
10. MUBI
11. Paramount+

---

## 🇧🇷 Brasil (BR)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Globoplay
5. Apple TV+
6. Max
7. Telecine
8. Paramount+
9. Looke
10. MUBI

---

## 🇲🇽 México (MX)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Vix
5. Apple TV+
6. Max
7. Paramount+
8. Claro Video
9. Tubi (free)
10. MUBI

---

## 🇮🇳 India (IN)

1. ⭐ Netflix
2. ⭐ Amazon Prime Video
3. Disney+ Hotstar
4. Zee5
5. SonyLIV
6. JioCinema
7. Apple TV+
8. Crunchyroll
9. MUBI

**Note:** Voot merged into JioCinema (2023, Reliance acquisition). Not listed separately.

---

## 🌍 Fallback (any unsupported region)

1. ⭐ Netflix
2. ⭐ Disney+
3. ⭐ Amazon Prime Video
4. Apple TV+
5. MUBI
6. Crunchyroll
7. (region-specific via Streaming-Availability live fetch)

---

## Cross-reference logic (when wired)

```
finalList(country) =
    curated[country]                          // hardcoded, this file
    .intersectAvailableWith(streaming-availability[country])   // strip platforms SA says aren't active
    .union(extraPopular from TMDB watch-region)                // pick up anything we missed
    .cap(12)
    .sortBy(curated order)
```

**Conflict resolution:** curated wins on display name/logo/order. SA wins on "is this still active in this region right now". TMDB wins on logo backup if local missing.

**Result for TR:** Epix-bleed bug impossible (Epix is not in TR_CURATED).

---

## Resolved decisions (2026-05-15 review)

1. ✅ **TR BluTV** — service closed entirely 2024, catalog moved to HBO Max. Not listed.
2. ✅ **DE/JP DAZN** — sports-only, dropped from both lists.
3. ✅ **JP ABEMA** — added (anime + drama coverage).
4. ✅ **IN Voot** — merged into JioCinema (2023). Dropped. SonyLIV stays.
5. ✅ **Free-tier services** — listed equally with paid, no "Free" badge.

**Reviewed:** ☑ (Berkan, 2026-05-15)
**Locked:** ☑

Implementation: wire per-region curated lists into `src/features/onboarding.js` + provider overlay on detail pages. Cross-reference with Streaming-Availability API + TMDB at runtime.
