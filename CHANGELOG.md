# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Sürümleme: Major.Minor.Patch.Build (örn: 2.2.0.0)

---

## [2.2.1.0] - 2026-01-09

### Bug Fixes & Polish

**Header & Layout:**

- Gradient header height extended to 160px for smoother fade
- App padding-top increased to 160px

**Search Fixes:**

- Input blur on Enter (closes mobile keyboard)
- Search input cleared when modal closes

**Modal Scroll Lock (Complete):**

- Added `touch-action: none` to modal.active
- Added `overscroll-behavior: contain`

---

## [2.2.0.0] - 2026-01-09

### Grand Unification - UI/UX & Features Complete

**Yeni Özellikler:**

- **Gradient Header**: Fixed position, siyah→şeffaf gradient, z-index: 1000
- **Action Bar**: Dil (TR/EN), Tema toggle, Bildirimler, Profil butonları
- **Notification Dropdown**: Glassmorphism bildirim paneli
- **Profile Dropdown**: Kullanıcı bilgisi, Premium badge, Ayarlar menüsü
- **Dual-Mode Search**:
  - Focus → Trend Aramalar (chips)
  - Typing → Autocomplete dropdown
  - Enter → Full-page search overlay
- **Matte Filter**: Posterlere premium vignette efekti (%15-30 opacity)
- **Scroll Lock**: Modal açıkken `body.overflow: hidden`

**Teknik İyileştirmeler:**

- `showAutocomplete()`: Header arama için anlık sonuç dropdown
- `closeAllDropdowns()`: Global dropdown kapatma fonksiyonu
- Header butonları için dropdown toggle handlers
- Trend chip click → Autocomplete tetikleme
- Modal kapatma → Scroll unlock

---

## [2.1.0.0] - 2026-01-08

### Lumi Infinity Feed UI Dönüşümü

**Yeni Özellikler:**

- **Infinity Feed (Masonry Grid)**: Slider'lar yerine Pinterest tarzı 2 sütunlu poster grid
- **Karışık İçerik Algoritması**: Trending + Now Playing + Top Rated verilerini birleştirip shuffle
- **Sticky Search Header**: Glassmorphism arama pill'i, üstte sabit gradient overlay ile
- **3-Icon Floating Nav**: Home / Favorites / Profile - floating pill tasarım
- **Search Overlay**: Full-screen arama deneyimi, filter chips (All/Movies/TV/People)
- **Material Symbols**: Icon font olarak Material Symbols Outlined eklendi

**Tasarım Değişiklikleri:**

- **Primary Color**: `#5858f3` (Electric Violet, Stitch tasarımlarına uygun)
- **Hero Section Kaldırıldı**: Infinity Feed ile değiştirildi
- **Slider'lar Kaldırıldı**: Masonry grid yapısına geçildi
- **Bottom Nav Sadeleştirildi**: 5 icon → 3 icon (Home, Favorites, Profile)

**Teknik İyileştirmeler:**

- `loadInfinityFeed()`: Çoklu API birleştirme + shuffle algoritması
- `handleOverlaySearch()`: Debounced search with filter support
- Poster olmayan içerikler otomatik filtreleniyor
- `onerror` ile hatalı poster'lar gizleniyor (görsel bütünlük)

---

## [2.0.0.0] - 2026-01-08

### WtW → Lumi Rebrand

**Değişen:**

- **Proje Adı**: WtW → Lumi
- **Asset Dosyaları**: `wtw-logo*.png` → `lumi-logo*.png`
- **localStorage Keys**: `wtw_*` → `lumi_*`
- **Legal Sayfalar**: WtW referansları Lumi ile güncellendi
- **GitHub Repo**: `berkanaskin/WtW` → `berkanaskin/lumi`

**CSS Tasarım Sistemi:**

- `index_lumi.css`: Void Dark + Glassmorphism design system
- Ambient Glows (violet/blue blur circles)
- SPA View System (4 sayfa arası geçiş)
- Bottom Sheet Modal

---

## [1.9.9.0] - 2025-12-31

### FAZ 4: Teknik ve Tasarım Revizyonları

**Düzeltilen:**

- **Dil Dropdown Toggle**: İkinci tıklamada düzgün şekilde kapanıyor
- **Çift Tıklama Zoom**: `touch-action: manipulation` ile mobilde zoom engellendi
- **Günün Önerisi Butonları**: Beğen (♡) ve İzle (+) butonları localStorage ile senkronize
- **Geri Navigasyon**: Kategori ve Sürpriz sonuçlarından Ne İzlesem'e dönüş düzgün çalışıyor

**Değişen:**

- **Modal Butonlar Sadeliği**: Detay modalındaki beğen/izle butonları artık sadece ikon (♡/+), metin yok
- **Premium Butonu Kaldırıldı**: Detay modalından "Haber Ver (Premium)" butonu kaldırıldı
- **Listem Tasarımı**: Elegant boş durum görünümü (gradient çerçeve)
- **Profil Tasarımı**: Modern ve dengeli bilgi dağılımı

---

## [1.9.8.0] - 2025-12-30

### FAZ 1 Revizyonları

**Eklenen:**

- **Size Özel Akıllı Algoritma**: Favoriler ve watchlist'ten genre analizi, veri yoksa popüler + yerel karışık öneri
- **Tümünü Gör Butonları**: 4 section için infinite scroll destekli tam sayfa görünüm
- **closeAllDropdowns()**: Tüm dropdown'lar için global kapatma fonksiyonu

**Düzeltilen:**

- **Header Buton Boyutları**: Login/dil/bildirim butonları 32px ile uniform
- **Bayrak Ortalama**: Dil dropdown'ında bayraklar ortalandı, border eklendi
- **Dropdown Çakışması**: Bir dropdown açıldığında diğerleri kapanıyor
- **Autocomplete Navigasyon**: Detay modal'dan dönüşte ana sayfaya akıllı yönlendirme
- **Slider Item Sayısı**: 50'den 20'ye düşürüldü (performans)

**Silinen:**

- `assets/code.html` - Eski Tailwind mockup
- `assets/stitch_ke_fet_ana_sayfas.zip` - Gereksiz zip dosyası

---

## [1.9.7.0] - 2025-12-29

### Eklenen

- **Ne İzlesem Yeniden Tasarım**: Tamamen yeni UI/UX tasarımı
  - AI mood prompt kartı: "Nasıl Hissediyorsun?" gradient kartı
  - Film/Dizi toggle: Modern toggle butonları
  - 4 dropdown filtre: Tür, Dönem, Platform, Ruh Hali
  - Sürpriz Yap butonu: Gradient tasarım ve animasyonlar
  - Günün Önerisi featured card: Trending içerikten dinamik olarak doldurulur
  - Mood Modal: Duygularını yazarak öneri alma (AI-ready)

### Değişen

- Ne İzlesem bölümü kart tabanlı wizard yerine compact dropdown filtrelere geçti
- Featured card aspect-ratio responsive olarak ayarlandı

---

## [1.9.6.1] - 2025-12-29

### Eklenen

- **Notification Dropdown**: Zil ikonuna tıklandığında açılan bildirim paneli
  - Bildirim listesi görüntüleme
  - "Tümünü Okundu İşaretle" butonu
  - Zaman formatı (Az önce, 5 dakika önce, vb.)
  - Boş durum göstergesi

### Düzeltilen

- **Search Restore Bug**: Modal kapatıldığında arama sonuçlarının kaybolması sorunu düzeltildi
  - `index.html`'deki `triggerSearchClear()` çakışması kaldırıldı
  - `searchClear` click event'ine koruma eklendi
  - `loadHomePage` için `skipNextHomePage` flag mekanizması eklendi

---

## [1.9.6.0] - 2025-12-29

### Değişen

- Sürüm numarası formatı güncellendi (beta X.X.X.X)

---

## [1.9.5.0] - 2025-12-28 ve öncesi

### Eklenen

- "Ne İzlesem?" modern wizard tasarımı
- Çoklu dil desteği (TR, EN, DE, FR, ES, JA, ZH, KO)
- Platform izleme özellikleri
- "Haber Ver" takip sistemi
- Favori yönetimi
- Detay modal'ı
- Autocomplete arama
- Responsive tasarım

---

> **Not**: 1.9.5.0 öncesi değişiklikler için git history'sine bakınız.
