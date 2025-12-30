# Changelog

Tüm önemli değişiklikler bu dosyada belgelenmektedir.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Sürümleme: Major.Minor.Patch.Build (örn: 1.9.6.1)

---

## [1.9.8.0] - 2025-12-30

### Eklenen

- **Tüm ikonlar SVG**: Emoji ikonlar modern SVG ikonlara dönüştürüldü
- **Ne İzlesem → Arama Sonuçları**: Öneriler artık ana arama sonuçları gibi grid görünümünde

### Düzeltilen

- **Premium Satın Alma**: Premium sonrası "Haber Ver" butonu anında güncelleniyor
- **Bayrak Ortalama**: Dil dropdown'ındaki bayraklar düzgün ortalanıyor
- **Header İkon Boyutu**: 36px'den 32px'e küçültüldü
- **Dönem Filtresi**: 2010'lar = 2010-2019 olarak düzeltildi
- **Haber Ver Çift İkon**: SVG ikonu ile tek ikon gösterilmesi sağlandı

### Silinen

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
