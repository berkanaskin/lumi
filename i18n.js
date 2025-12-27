// ============================================
// NEREDE İZLERİM? - Localization (i18n)
// ============================================

const i18n = {
    currentLang: 'tr',

    translations: {
        tr: {
            // App
            appTitle: 'Nerede İzlerim?',
            search: 'Film veya dizi ara...',

            // Section Headers (for dynamic header)
            sectionHome: 'Nerede İzlerim?',
            sectionDiscover: 'Ne İzlesem?',
            sectionFavorites: 'Favorilerim',
            sectionProfile: 'Profilim',

            // Sections
            trending: 'Popüler',
            newReleases: 'Yeni Çıkanlar',
            classics: 'Klasikler',
            suggested: 'Önerilen',
            turkishContent: '🇹🇷 Türk Yapımları',

            // Genres
            action: 'Aksiyon',
            comedy: 'Komedi',
            drama: 'Drama',
            horror: 'Korku',
            romance: 'Romantik',
            scifi: 'Bilim Kurgu',

            // Detail Modal
            watchOn: 'Nerede İzlenir',
            cast: 'Oyuncular',
            videos: 'Videolar',
            trailer: 'Fragman',
            behindTheScenes: 'Kamera Arkası',
            reviews: 'İçerikler',
            trivia: 'İlginç Bilgiler',
            director: 'Yönetmen',
            writer: 'Yazar',

            // Ratings
            yourRating: 'Puanın',

            // Actions
            addFavorite: '🤍 Ekle',
            removeFavorite: '❤️ Çıkar',
            notify: '🔔 Haber Ver',
            notifyLocked: '🔒 Haber Ver (Premium)',
            rateIt: 'Oy Ver',
            deleteRating: 'Sil',
            theme: 'Tema',
            dark: 'Koyu',
            light: 'Açık',
            membership: 'Üyelik',
            guest: 'Misafir',
            member: 'Üye',
            premium: 'Premium',
            myRatings: 'Puanlarım',
            upgradePremium: "Premium'a Yükselt",

            // Premium
            premiumTitle: "Premium'a Geç",
            premiumDesc: 'Tüm özelliklere sınırsız erişim!',
            premiumFeatures: {
                notifications: '🔔 Bildirim Sistemi',
                trivia: '🤓 İlginç Bilgiler',
                rating: '⭐ Puanlama Sistemi',
                adFree: '🚫 Reklamsız Deneyim'
            },
            perYear: '/yıl',
            buyNow: 'Satın Al',

            // Auth
            login: 'Giriş Yap',
            logout: 'Çıkış Yap',
            signUp: 'Kayıt Ol',

            // Status
            loading: 'Yükleniyor...',
            noResults: 'Sonuç bulunamadı',
            upcoming: 'Yakında',
            inCinemas: 'Sinemalarda',

            // Time
            minutes: 'dk',
            movie: 'Film',
            tvShow: 'Dizi'
        },

        en: {
            // App
            appTitle: 'Where to Watch?',
            search: 'Search movies or TV shows...',

            // Section Headers (for dynamic header)
            sectionHome: 'Where to Watch?',
            sectionDiscover: 'What to Watch?',
            sectionFavorites: 'My Favorites',
            sectionProfile: 'My Profile',

            // Sections
            trending: 'Trending',
            newReleases: 'New Releases',
            classics: 'Classics',
            suggested: 'For You',
            turkishContent: '🎬 Local Content',

            // Genres
            action: 'Action',
            comedy: 'Comedy',
            drama: 'Drama',
            horror: 'Horror',
            romance: 'Romance',
            scifi: 'Sci-Fi',

            // Detail Modal
            watchOn: 'Where to Watch',
            cast: 'Cast',
            videos: 'Videos',
            trailer: 'Trailer',
            behindTheScenes: 'Behind the Scenes',
            reviews: 'Reviews',
            trivia: 'Trivia',
            director: 'Director',
            writer: 'Writer',

            // Ratings
            yourRating: 'Your Rating',

            // Actions
            addFavorite: '🤍 Add',
            removeFavorite: '❤️ Remove',
            notify: '🔔 Notify',

            // Profile
            theme: 'Theme',
            dark: 'Dark',
            light: 'Light',
            membership: 'Membership',
            guest: 'Guest',
            member: 'Member',
            premium: 'Premium',
            myRatings: 'My Ratings',
            upgradePremium: 'Upgrade to Premium',

            // Premium
            premiumTitle: 'Go Premium',
            premiumDesc: 'Unlimited access to all features!',
            premiumFeatures: {
                notifications: '🔔 Notifications',
                trivia: '🤓 Trivia & Facts',
                rating: '⭐ Rating System',
                adFree: '🚫 Ad-Free Experience'
            },
            perYear: '/year',
            buyNow: 'Buy Now',

            // Auth
            login: 'Log In',
            logout: 'Log Out',
            signUp: 'Sign Up',

            // Status
            loading: 'Loading...',
            noResults: 'No results found',
            upcoming: 'Coming Soon',
            inCinemas: 'In Theaters',

            // Time
            minutes: 'min',
            movie: 'Movie',
            tvShow: 'TV Show'
        }
    },

    // Get translation
    t(key) {
        const lang = this.translations[this.currentLang] || this.translations.tr;
        return lang[key] || key;
    },

    // Set language
    setLanguage(langCode) {
        if (this.translations[langCode]) {
            this.currentLang = langCode;
            localStorage.setItem('appLanguage', langCode);
            return true;
        }
        return false;
    },

    // Load saved language
    loadLanguage() {
        const saved = localStorage.getItem('appLanguage');
        if (saved && this.translations[saved]) {
            this.currentLang = saved;
        }
    }
};

// Expose globally
window.i18n = i18n;
