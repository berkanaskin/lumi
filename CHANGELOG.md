# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [1.2.0] - 2026-01-13 - Testing Infrastructure 🧪

### 🧪 Testing

- **Vitest Configuration:** Modern test framework with jsdom
  - `vitest.config.js` with jsdom environment
  - ESM-compatible setup with path aliases
  - Coverage configuration (v8 provider)

### ✅ Test Suites (45 Tests)

- `tests/helpers.test.js` - Utility function tests
  - debounce, throttle, formatDate, formatRuntime
  - getYear, truncate, escapeHtml, formatNumber
- `tests/constants.test.js` - Constants module tests
  - Genre mappings (TR/EN), image URL generation
  - Daily recommendation categories
- `tests/platforms.test.js` - Platform URL tests
  - Streaming platform URLs, Turkish platform detection

### 📁 New Files

- `vitest.config.js` - Vitest configuration
- `tests/setup.js` - Global test mocks
- `tests/helpers.test.js` - Helper tests
- `tests/constants.test.js` - Constants tests
- `tests/platforms.test.js` - Platform tests

### 🔧 Scripts

- `npm test` - Run all tests
- `npm run test:watch` - Watch mode
- `npm run test:ui` - Vitest UI
- `npm run test:coverage` - Coverage report

### 📦 Dependencies

- `vitest`: ^4.0.17
- `@vitest/ui`: ^4.0.17
- `jsdom`: ^27.4.0

---

## [1.1.0] - 2026-01-13 - Modular Architecture 🏗️

### 🏗️ Core Modules

- **State Management:** `src/lib/state.js`
  - Centralized app state with localStorage sync
  - Event-driven updates with subscriptions
- **Helpers:** `src/lib/helpers.js`
  - debounce, throttle, formatters, utilities
- **Platforms:** `src/lib/platforms.js`
  - Streaming service URLs and helpers
- **Constants:** `src/lib/constants.js`
  - Genre mappings, image helpers, AI placeholders
- **Navigation:** `src/lib/navigation.js`
  - Page routing and bottom navigation

### 🎨 UI Components

- **Toast:** `src/ui/toast.js` - Notification system
- **Theme:** `src/ui/theme.js` - Dark/light mode
- **Movie Card:** `src/ui/movie-card.js` - Reusable cards
- **Loading:** `src/ui/loading.js` - Skeletons & spinners

---

## [1.0.1] - 2026-01-13 - CI/CD Pipeline 🚀

### 🔧 CI/CD

- **GitHub Actions Workflow:** `.github/workflows/ci.yml`
  - Lint job (ESLint)
  - Test job (placeholder for Sprint 3)
  - Build job (Vite production build)
  - Deploy job (Vercel auto-deploy on main)

### 📦 Dependencies

- **ESLint:** Code quality tooling
  - `eslint`: ^9.39.2
  - `@eslint/js`: ^9.39.2
  - `globals`: ^17.0.0

### 📁 New Files

- `.github/workflows/ci.yml` - CI/CD workflow
- `.github/dependabot.yml` - Automated dependency updates
- `eslint.config.js` - ESLint flat config

### 🔧 Scripts

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix lint issues

---

## [1.0.0-alpha] - 2026-01-13 - Vite Migration & Security 🔒

### 🎉 Major Changes

- **Vite Migration:** Modern build tool ile production-ready altyapı
  - `npm run dev` ile hot-reload development
  - `npm run build` ile optimized production build
  - ESM modül sistemi

### 🔐 Security

- **Environment Variables:** API key'ler artık `.env.local` dosyasında
  - Client-side safe: `VITE_` prefix
  - Server-side only: No prefix (Gemini, RapidAPI)
- **Backend Proxies:** Vercel Edge Functions
  - `/api/tmdb` - TMDB proxy + caching
  - `/api/gemini` - AI proxy (key hidden)
  - `/api/youtube` - YouTube proxy + caching

### 📁 New Files

- `package.json` - npm configuration
- `vite.config.js` - Vite build configuration
- `vercel.json` - Vercel deployment config
- `src/config.js` - Secure configuration module
- `src/main.js` - Entry point
- `api/tmdb.js` - TMDB proxy
- `api/gemini.js` - Gemini AI proxy
- `api/youtube.js` - YouTube proxy
- `.env.local` - Development secrets
- `.env.example` - Template for secrets

### 🔧 Technical

- APP_VERSION: 1.0.0-alpha
- Node.js ESM modules (`"type": "module"`)
- esbuild minification

---

## [0.9.11] - 2026-01-13 - Comprehensive Sprint Implementation

### 🌐 i18n Completion

- **Decade Chips i18n:** 80s, 90s, 2000s, 2010s, 2020s çevirileri eklendi
  - HTML: `data-i18n="era80s"` vb. attributes eklendi
  - TR: 80'ler, 90'lar, 2000'ler, 2010'lar, 2020'ler
  - EN: 80s, 90s, 2000s, 2010s, 2020s

### 📊 Documentation Updates

- **ROADMAP.md:** Progress %63 → %66 güncellendi
  - Dil desteği: 7/10 tamamlandı (önceki: 2/5)
  - Yeni i18n achievements eklendi

### 🔧 Technical

- APP_VERSION: 0.9.11
- 3 analiz raporunun harmanlanan önerileri uygulandı

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
