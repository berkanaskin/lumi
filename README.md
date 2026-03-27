# Lumi

Film ve dizi kesfetmenizi kolaylastiran, AI destekli mobil web uygulamasi.

## Ozellikler

- **Hybrid AI Arama** - Embedding tabanli semantik arama + Gemini LLM fallback ile dogal dilde film/dizi onerisi
- **Streaming Bilgisi** - Ulke bazli hangi platformda mevcut (TMDB + Streaming Availability API)
- **Detay Sayfasi** - IMDb, Rotten Tomatoes, Metacritic puanlari, fragmanlar, oyuncu kadrosu, trivia
- **Kisi Sayfasi** - Filmografi, biyografi, isbirligi yapilan yonetmen/oyuncular, oduller
- **Sinematik Tasarim** - Letterboxd ilhamli karanlik tema, poster agirlikli gorsel dil
- **Turkce/Ingilizce** - Tam i18n destegi
- **PWA Hazir** - Mobil oncelikli tasarim

## Kurulum

```bash
git clone https://github.com/berkanaskin/lumi.git
cd lumi
npm install
npm run dev
```

## Konfigürasyon

`.env` dosyasi olusturun:

```env
VITE_TMDB_API_KEY=
VITE_YOUTUBE_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
OMDB_API_KEY=
STREAMING_API_KEY=
```

Tum harici API cagrilari Vercel Edge Functions uzerinden proxy edilir (`api/` dizini).

## Proje Yapisi

```
lumi/
├── index.html
├── src/
│   ├── main.js              # Uygulama giris noktasi
│   ├── features/            # Detail, search, discover, profile modulleri
│   ├── lib/                 # State, config, router
│   ├── services/            # API servisleri
│   ├── styles/              # CSS modulleri
│   └── pages/               # Sayfa bileşenleri
├── api/                     # Vercel Edge Functions
│   ├── tmdb.js
│   ├── gemini.js
│   ├── embeddings.js
│   ├── search.js
│   ├── omdb.js
│   ├── streaming-availability.js
│   ├── youtube.js
│   └── geoip.js
├── public/
│   ├── i18n.js              # Ceviri dosyalari
│   └── services/auth.js     # Firebase Auth
└── vercel.json
```

## Tech Stack

- **Frontend:** Vanilla JS + Vite
- **Backend:** Vercel Edge Functions (Serverless)
- **Auth:** Firebase Authentication
- **APIs:** TMDB, OMDb, Streaming Availability, YouTube, OpenAI Embeddings, Gemini
- **Deploy:** Vercel

## Lisans

MIT - Berkan Askin
