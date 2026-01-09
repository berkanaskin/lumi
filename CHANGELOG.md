# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.9.6] - 2026-01-09 - Feature Completion

### 🎨 UI Polishing

- **Gradient Blend Fix:** Ana sayfa posterleri header gradient'ının arkasından akıyor
- **Light Mode Fixes:**
  - Arama input beyaz kutucuk sorunu düzeltildi
  - Listem metin renkleri kontrastı artırıldı
  - Profil avatar border temaya uygun hale getirildi
- **Settings Panel:** Profil sayfasına toggle switch'ler eklendi

### 🔍 Search UX

- **Arama Geri Dönüş:** Modal kapanınca arama sonuçlarına geri dönüş
- `state.lastView` ve `state.lastScrollPosition` ile scroll position korunuyor

### 🎬 Detail Modal Enrichment

- **Multi-Ratings Grid:** IMDb, Rotten Tomatoes, Metacritic puanları
- **Crew Info:** Yönetmen ve Senarist bilgisi
- **Match Percentage:** %XX Eşleşme göstergesi
- **Trailer Button:** YouTube fragman linki
- **Premium Trivia:** Blur + kilit ile premium-only içerik

### 👤 Profile & Favorites

- **Stitch Design:** LİSTEM başlığı, segmented control tabs
- **Settings Section:** Karanlık Mod, Bildirimler, Wi-Fi toggle'ları

### Technical

- APP_VERSION: 0.9.6-beta

---

## [0.9.5] - 2026-01-09 - Release Candidate 1

### 🚀 Major Changes

**Platform & Architecture:**

- Mobile-only deployment (Android + iOS via Capacitor)
- Firebase Authentication entegrasyonu
- RevenueCat in-app purchase hazırlığı

**UI/UX Fixes:**

- LUMI logosu sol üste taşındı ve büyütüldü
- Masonry grid → CSS Columns yapısına geçiş
- Gradient header ile poster blend düzeltmesi
- Light/Dark tema toggle

**Search Engine:**

- Autocomplete [object Object] bug düzeltildi
- Detay modalından dönünce input temizleme
- History state ile arama korunması

**Detail Page:**

- OMDb API ile IMDb, RT, Metacritic puanları
- Cast ve Trailer bilgisi
- Scroll lock iyileştirmesi

### 🔧 Technical Changes

- Firebase + RevenueCat config eklendi
- APP_VERSION: 0.9.5-rc

---

## [0.9.3] - 2026-01-09

*Eski: 2.2.1*

- Gradient header 160px
- Mobile keyboard blur fix
- Modal scroll lock

---

## [0.9.2] - 2026-01-09

*Eski: 2.2.0*

- Gradient Header + Action Bar
- Dual-Mode Search (Trend + Autocomplete)
- Notification/Profile dropdowns
- Matte Filter posterlere

---

## [0.9.1] - 2026-01-08

*Eski: 2.1.0*

- Infinity Feed (Masonry Grid)
- Material Symbols icons
- 3-Icon Floating Nav
- Search Overlay

---

## [0.9.0] - 2026-01-08 - Beta Start

*Eski: 2.0.0*

- WtW → Lumi Rebrand
- index_lumi.css design system
- Void Dark + Glassmorphism
- SPA View System

---

## [0.8.x] - Alpha Phase

*Eski: 1.9.x*

Pre-rebrand development:

- Ne İzlesem wizard
- Multi-language support
- Platform providers
- Favorites management
