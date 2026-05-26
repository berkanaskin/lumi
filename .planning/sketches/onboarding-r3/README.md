# Onboarding R3 — 3 Throwaway Sketches

Mobile-only mockups (390×844, iPhone 14 Pro). Self-contained HTML. Each has 4 slides (Welcome+locale → Platforms → Premium → Ready), inline locale picker, footer CTA always visible, swipe + dots navigation.

## Variants

| File | Visual DNA | Vibe |
|---|---|---|
| `vision-glassmorphic.html` | Apple Vision Pro / iOS 17 Control Center | Floating glass cards over a parallax 4×6 TMDB poster wall. Deep purples + cyan accents. Heavy `backdrop-filter: blur(40px) saturate(180%)`. CTA is a long gradient glass pill. |
| `editorial-bold.html` | Spotify Wrapped 2024 / Linear / NYT Magazine | One bold solid color per slide (magenta → lime → cobalt → sunset). Huge 64–128px black typography. Bento-grid platforms. Square brutal CTAs with translate-on-press. S4 has a giant circular "BAŞLA" button. |
| `cinema-monochrome.html` | Apple TV+ / Letterboxd / Criterion | Pure black with 40px letterbox bars top+bottom. Single full-bleed TMDB poster per slide (Inception, Stranger Things, Dune, Dark Knight). Cormorant Garamond serif headlines, italic gold accent (#f4a261), JetBrains Mono timecodes, film-grain SVG overlay, slow 1s cross-fades. |

## How to view

```powershell
start chrome --window-size=420,900 "C:/Users/berka/.gemini/antigravity/projects/lumi/.planning/sketches/onboarding-r3/vision-glassmorphic.html"
start chrome --window-size=420,900 "C:/Users/berka/.gemini/antigravity/projects/lumi/.planning/sketches/onboarding-r3/editorial-bold.html"
start chrome --window-size=420,900 "C:/Users/berka/.gemini/antigravity/projects/lumi/.planning/sketches/onboarding-r3/cinema-monochrome.html"
```

Then open DevTools → Toggle device toolbar → iPhone 14 Pro (390×844) for best fidelity.

## Interactions (all variants)

- Tap dots in header/footer to jump slides
- Swipe left/right (touch) or click-drag (desktop) to advance/return
- S1: tap locale chip → inline expand (no modal)
- S2: tap platform tiles to toggle selection
- S3: tap pricing tier to select (recap updates)
- S4: recap reflects choices from S1+S2+S3 live
