# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.9.10] - 2026-01-12 - Language Code Normalization

### 🐛 Bug Fixes

- **Language Code Mismatch:** `en-US` → `en` normalizasyonu eklendi
  - `applyLanguage()` artık locale kodlarını (tr-TR, en-US) 2-letter ISO'ya dönüştürüyor
  - `i18n.setLanguage()` aynı normalizasyonu içeriyor (güvenlik katmanı)
  - Hatalı dil kodu için console warning eklendi

### 🔧 Code Quality

- Gereksiz `updateTranslations()` çağrısı kaldırıldı (setLanguage içinde zaten çağrılıyor)
- Tüm dil değişim noktalarında tutarlı normalizasyon

### 🔧 Technical

- APP_VERSION: 0.9.10

---

## [0.9.9] - 2026-01-12 - i18n Critical Bug Fix

### 🐛 Bug Fixes

- **i18n Language Toggle - CRITICAL FIX:** Dil değiştiğinde UI string'leri artık güncelleniyor
  - **Root Cause:** Language code mismatch (`"en-US"` passed to `setLanguage()` but translations use `"en"`)
  - **Solution:** Language code normalization added (`lang.split('-')[0]`)
  - **Location:** `index.html:684-688` (language toggle event handler)
  - `setLanguage()` artık `updateTranslations()` çağırıyor
  - Console'da `[i18n] Language changed to: xx` log mesajı
  - ✅ **Verified:** Search placeholder, buttons, badges, mood chips all translate correctly

### 🌐 i18n Improvements

- **data-i18n Attributes:** Discover sayfasındaki elementlere eklendi:
  - Mood chips (Rahat, Heyecan, Duygusal, Beyin Yakan)
  - Genre chips (Aksiyon, Korku, Bilim Kurgu, Romantik)
  - Era chips (Tüm Dönemler, Klasik)
  - Action buttons (Öner Bana, Sürpriz Yap)
- **Yeni Çeviri Keyleri:**
  - TR: `moodChill`, `moodAdrenaline`, `moodTearjerker`, `moodMindbending`
  - EN: `recommendBtn`, `surpriseBtn`, `allEras`, `eraClassic`

### 🔧 Technical

- APP_VERSION: 0.9.9

---

## [0.9.8] - 2026-01-12 - Audit Cleanup & Documentation

### 🧹 Kod Temizliği

- **Deprecated Dosyalar Silindi:**
  - `index_old.css` (112KB gereksiz stylesheet)
  - `test-report.html` (yanlış versiyon v0.9.13, 0 test)
- **Legacy HTML Bloğu Silindi:** `index.html:593-613` (21 satır hidden elements)
- **Versiyon Senkronizasyonu:** Tüm dosyalar v0.9.8

### 📄 Dokümantasyon

- **README.md:** Proje tanımı, özellikler, kurulum talimatları
- **.env.example:** Environment variable template
- **ROADMAP.md:** %29 → %63 tamamlanma (AI/Store/Temizlik eklendi)

### 🔧 Technical

- `config.js:3`: v0.9.8
- `app.js:2,6`: v0.9.8
- `index.html:434`: v0.9.8
- APP_VERSION: 0.9.8

---

## [0.9.7] - 2026-01-12 - Gemini AI Integration

### 🤖 AI Service (YENİ)

- **`services/ai.js`** oluşturuldu
- **Gemini 2.0 Flash** API entegrasyonu (gerçek API, mock değil)
- `getRecommendations(prompt)` fonksiyonu:
  - Kullanıcı promptunu poetik film küratörü olarak yorumlama
  - JSON formatında 3-5 film önerisi döndürme
  - TMDB ile otomatik poster enrichment
  - Fallback mekanizması (API başarısız olursa keyword-based arama)
- `handleAISearch()` → AIService entegrasyonu

### 💳 Store Service (YENİ)

- **`services/store.js`** oluşturuldu
- RevenueCat SDK yapısı hazırlandı
- Mock fallback destekli (SDK yapılandırılmadan test)
- Aylık/Yıllık paketler, entitlement kontrolü

### 🎨 Discover Sayfası Tasarım

- **Full-Bleed Hero:** Arka plan `top: 0`'dan başlıyor
- Header şeffaf (Discover sayfasında)
- **Theme-Aware Gradient:**
  - Dark mode: `#050505` (void black)
  - Light mode: `#f5f7fa`
- **3-Satır Textarea:** AI promptları için geniş alan
- Placeholder poetik örneklerle

### 🌐 i18n Güncellemeleri

- TR/EN: `aiInputLabel`, `aiInputPlaceholder`, `aiSearching`, `aiRecommendations`
- TR/EN: `detailTabOverview`, `detailTabCast`, `detailTabTrailer`
- TR/EN: `changeAvatar`, `selectAvatar`

### 🔧 Technical

- `index.html`: Textarea ve script imports (`ai.js`, `store.js`)
- `index_lumi.css`: `.console-textarea`, `.discover-hero-bg`, `.discover-gradient-overlay`
- APP_VERSION: 0.9.7-beta

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
