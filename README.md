# Lumi - Film Keşif Platformu 🎬

**v0.9.8** | Mobile-First Web App

Lumi, film ve dizi keşfetmenizi kolaylaştıran, AI destekli bir web uygulamasıdır.

## ✨ Özellikler

- 🎬 **TMDB Entegrasyonu** - Milyonlarca film ve dizi arama
- 🤖 **Gemini AI** - Doğal dille akıllı film önerileri
- 🌙 **Dark/Light Tema** - Void Dark tasarım sistemi
- 🌍 **Çoklu Dil** - Türkçe ve İngilizce desteği
- 📱 **Mobile-First** - PWA hazır tasarım
- 💳 **Premium Features** - RevenueCat entegrasyonu (planlı)

## 🚀 Kurulum

```bash
# Repository'yi klonla
git clone https://github.com/berkanaskin/lumi.git
cd lumi

# Geliştirme sunucusunu başlat
npx serve -l 3000
```

## ⚙️ Konfigürasyon

1. `.env.example` dosyasını `.env` olarak kopyalayın
2. API anahtarlarınızı doldurun:

```env
VITE_TMDB_API_KEY=your_tmdb_key
VITE_YOUTUBE_API_KEY=your_youtube_key
GEMINI_API_KEY=your_gemini_key
```

> ⚠️ **Not:** Gemini API anahtarı backend'de saklanmalıdır (production).

## 📁 Proje Yapısı

```text
lumi/
├── index.html          # Ana sayfa
├── app.js              # Uygulama mantığı
├── api.js              # TMDB/API entegrasyonu
├── config.js           # Konfigürasyon
├── i18n.js             # Çeviri sistemi
├── index_lumi.css      # Stil dosyası
├── services/
│   ├── ai.js           # Gemini AI servisi
│   ├── auth.js         # Firebase Auth
│   ├── store.js        # RevenueCat
│   └── notifications.js
└── stitch/             # UI referansları
```

## 🔗 Canlı Demo

👉 <https://berkanaskin.github.io/lumi>

## 📝 Lisans

MIT License - Berkan Aşkın
