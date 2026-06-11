# Phase 05.5 — Performans Ölçümleri

## BASELINE (2026-06-11, prod lumi-jade.vercel.app, Lighthouse mobil simülasyon)

- **Performance score: 0.55**
- FCP: 11.6 s · LCP: 15.7 s · Speed Index: 11.6 s · TTI: 16.0 s · TBT: 0 ms

### Kök nedenler (ölçülmüş)

| # | Sorun | Maliyet |
|---|---|---|
| 1 | Material Symbols variable font (tüm eksenler: wght,FILL@100..700) | **1.096 KB** woff2 — en büyük asset |
| 2 | 3 senkron CDN Firebase compat script `<head>`'de (render-blocking) | firestore-compat 2.327ms/99KB (80KB unused) + auth-compat 1.330ms/38KB + app-compat 996ms/10KB |
| 3 | Çifte SDK: npm modüler `firebase/firestore` bundle'da (streaming-cache.js, embeddings.js importluyor) + CDN compat | ~100KB+ tekrar |
| 4 | Ana JS açılışta 107KB/130KB unused (kod bölme yok) | transfer 148KB |
| 5 | Grid kartları w500 TMDB görseli (~90-106KB/adet) | feed'de 10+ görsel |
| 6 | Google Fonts CSS render-blocking (Spline Sans 1.030ms) | minör |
| 7 | main CSS 141KB (24KB gz) render-blocking 756ms | minör |

### Build çıktısı (local, vite 7.3.1)
- dist/index.html: 97.72 KB (gzip 19.79)
- assets/main CSS: 141.34 KB (gzip 23.94)
- assets/main JS: 471.24 KB (gzip 146.30)
- Bundle'a girmeyen classic script'ler: i18n.js (40KB), services/auth.js (defer)

## ARA ÖLÇÜM — Açılış round 1+2 sonrası (local `vite preview`, LH mobil sim)

Yapılanlar: CDN compat Firebase kaldırıldı (npm bridge), Material Symbols 37-glif
subset, CSS @import font kopyaları söküldü (index_lumi.css + tokens.css TAM fontu
ikinci kez çekiyordu — asıl 1MB suçlusu buydu), firebase ayrı chunk, onboarding
lazy chunk (main 146→54KB gz), via.placeholder.com → yerel data-URI SVG,
w500→w342 (inline kart), image.tmdb.org preconnect.

- FCP: 11.6 → **6.2 s** · LCP: 15.7 → **8.0 s** · TTI: 16.0 → **8.0 s** (sim)
- Kalan bloklayanlar: font CSS'leri (~0.9s) + ana CSS (~0.9s) + inline script
  exec (~1.4s, 4x CPU sim) — kabul edilebilir; inline script çıkarımı backlog'da.
- Not: local preview'da /api yok → feed yüklenemiyor; prod LCP farklı çıkabilir.
  Nihai ölçüm deploy sonrası prod'dan alınacak.

## PROD ARA ÖLÇÜM (2026-06-11, Blok 1 deploy sonrası)
- FCP: 11.6 → **7.1 s** (−%39) · Speed Index: 11.6 → **7.1 s**
- LCP: 16.0 s — ama LCP elementi **onboarding poster duvarı** (LH sıfır
  kullanıcı olarak girince wizard açılıyor). Geri dönen kullanıcı bu yolu
  görmez. Backlog: onboarding duvar görsellerine fetchpriority=high +
  daha az/küçük görsel; lazy onboarding chunk'ının ilk-kurulum LCP maliyeti.
- Doğrulanan: CDN firebase yok, subset font canlı, tüm Blok 1 fix'leri
  bundle'da (media_type, video overlay, broadcast kuralı).

## SONUÇ (tur bitince prod'dan doldurulacak)
- Performance score: _
- FCP: _ · LCP: _ · Speed Index: _
