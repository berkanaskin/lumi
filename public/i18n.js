// ============================================
// NEREDE İZLERİM? - Localization (i18n)
// ============================================

const i18n = {
    currentLang: 'en',

    translations: {
        tr: {
            // App
            appTitle: 'Nerede İzlerim?',
            search: 'Film ve Diziler Nereden İzlenir? Ara...',

            // Section Headers (for dynamic header)
            sectionHome: 'Nerede İzlerim?',
            sectionDiscover: 'Ne İzlesem?',
            sectionFavorites: 'Favorilerim',
            sectionProfile: 'Profilim',

            // Nav Labels
            navHome: 'Ana Sayfa',
            navDiscover: 'Ne İzlesem',
            navFavorites: 'Favorilerim',
            navProfile: 'Profil',

            // Sections
            trending: 'Popüler',
            newReleases: 'Yeni Çıkanlar',
            classics: 'Klasikler',
            suggested: 'Size Özel',
            turkishContent: '🇹🇷 Türk Yapımları',
            localContent: 'Yerel İçerikler',

            // Ne İzlesem Wizard
            wizardQuestion: 'Bu akşam ne izlemek istersin?',
            wizardTypeAll: 'İkisi de olur',
            wizardTypeMovie: 'Film',
            wizardTypeTv: 'Dizi',
            mainCategory: 'Ana Kategori',
            moodLabel: 'Ruh halin nasıl?',
            moodTrend: 'Trend',
            moodRandom: 'Rastgele',
            moodBlockbuster: 'Blockbuster',
            moodArt: 'Sanat',
            moodAwarded: 'Ödüllü',
            moodClassic: 'Klasik',
            moodLocal: 'Yerli',
            genreLabel: 'Tür',
            genreOptional: 'seçmezsen hepsinden gelir',
            platformLabel: 'Nerede izleyeceksin?',
            anyPlatform: 'Fark Etmez',
            generateBtn: 'ÖNERİ AL',
            resultsTitle: 'Sizin İçin Seçtiklerimiz',
            resetFilters: 'Tekrar Seç',
            loadMore: 'Daha Fazla Göster',

            // Mood Chips
            moodChill: 'Rahat',
            moodAdrenaline: 'Heyecan',
            moodTearjerker: 'Duygusal',
            moodMindbending: 'Beyin Yakan',

            // Era Chips
            allEras: 'Tüm Dönemler',
            eraClassic: 'Klasik',
            era80s: '80\'ler',
            era90s: '90\'lar',
            era2000s: '2000\'ler',
            era2010s: '2010\'lar',
            era2020s: '2020\'ler',

            // Action Buttons
            recommendBtn: 'Öner Bana',
            surpriseBtn: 'Sürpriz Yap',

            // Trending & Daily Pick
            dailyPick: 'GÜNÜN ÖNERİSİ',
            trendingSearches: 'Trend Aramalar',

            // Genres
            action: 'Aksiyon',
            comedy: 'Komedi',
            drama: 'Drama',
            horror: 'Korku',
            romance: 'Romantik',
            scifi: 'Bilim Kurgu',
            thriller: 'Gerilim',
            animation: 'Animasyon',

            // Detail Modal
            watchOn: 'Nerede İzlenir',
            airingOn: 'Yayın Kanalı',
            cast: 'Oyuncular',
            videos: 'Videolar',
            trailer: 'Fragman',
            behindTheScenes: 'Kamera Arkası',
            reviews: 'İçerikler',
            trivia: 'İlginç Bilgiler',
            director: 'Yönetmen',
            writer: 'Yazar',
            originalNetwork: 'Orijinal Yayıncı',
            noPlatform: 'Platform bilgisi bulunamadı',
            searchYouTube: 'YouTube\'da Ara',
            nearestCinemas: 'Yakındaki Sinemalar',

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

            // Auth / Login Modal
            login: 'Giriş',
            logout: 'Çıkış Yap',
            signUp: 'Kayıt Ol',
            loginTitle: 'Hoş Geldiniz',
            loginSubtitle: 'Devam etmek için giriş yapın',
            continueWithGoogle: 'Google ile devam et',
            continueWithFacebook: 'Facebook ile devam et',
            continueWithApple: 'Apple ile devam et',
            close: 'Kapat',

            // Favorites
            favAll: 'Tümü',
            favMovies: 'Filmler',
            favSeries: 'Diziler',

            // Status
            loading: 'Yükleniyor...',
            noResults: 'Sonuç bulunamadı',
            upcoming: 'Yakında',
            inCinemas: 'Sinemalarda',
            searchResults: 'Arama Sonuçları',

            // AI Input
            aiInputLabel: 'Bugün nasıl hissediyorsun?',
            aiInputPlaceholder: 'Beni çocukluğuma götürecek sıcak bir aile filmi...',
            aiSearching: '🤖 Gemini düşünüyor...',
            aiRecommendations: 'AI Önerileri',

            // Detail Tabs
            detailTabOverview: 'Özet',
            detailTabCast: 'Kadro',
            detailTabTrailer: 'Fragman',

            // Avatar
            changeAvatar: 'Avatar Değiştir',
            selectAvatar: 'Avatar Seç',

            // Search Filter Chips
            filter_all: 'Tümü',
            filter_movies: 'Filmler',
            filter_tv_shows: 'Diziler',
            filter_people: 'Kişiler',

            // Time
            minutes: 'dk',
            movie: 'Film',
            tvShow: 'Dizi',

            // Phase 04-03: Action-triggered auth gate
            'authGate.title': 'Giriş yap',
            'authGate.default': 'Devam etmek için giriş yapın.',
            'authGate.rateMovie': 'Puan vermek için giriş yapın.',
            'authGate.shareList': 'Paylaşmak için giriş yapın.',
            'authGate.commentPost': 'Yorum yapmak için giriş yapın.',
            'authGate.editProfile': 'Profilini kişiselleştirmek için giriş yapın.',
            'profile.guestCta': 'Profilini kişiselleştirmek için giriş yap.',
            'profile.guestCtaButton': 'Giriş Yap',
            'common.comingSoon': 'Yakında',

            // Phase 04-04: Onboarding wizard
            'onboarding.skip': 'Atla',
            'onboarding.step1.title': 'Doğru dil mi?',
            'onboarding.step1.confirm': 'Evet, devam',
            'onboarding.step1.chooseOther': 'Başka bir dil seç',
            'onboarding.step2.title': 'Ülken hangisi?',
            'onboarding.step2.confirm': 'Evet, devam',
            'onboarding.step2.chooseOther': 'Başka bir ülke seç',
            'onboarding.step3.title': 'Hangi platformları kullanıyorsun?',
            'onboarding.step3.done': 'Bitir',
            'onboarding.step3.skip': 'Sonra eklerim',
            'onboarding.providers.loadError': 'Şu an yükleyemedik. Sonra eklersin.',

            // Phase 04-04 R1: Cinematic redesign — 5-slide wizard copy
            'onboarding.next': 'Devam',
            'onboarding.welcome.title': "Lumi'ye hoş geldin.",
            'onboarding.welcome.sub': 'İzleyecek bir şey bulamadığında, biz buradayız.',
            'onboarding.welcome.cta': 'Başlayalım',
            'onboarding.lang.title': 'Hangi dilde konuşalım?',
            'onboarding.lang.sub': 'Daha fazla dil yakında.',
            'onboarding.country.title': 'Nereden izliyorsun?',
            'onboarding.country.sub': 'Yayın platformlarını ülkene göre getiriyoruz.',
            'onboarding.country.search': 'Ülke ara',
            'onboarding.country.empty': 'Sonuç yok',
            'onboarding.platforms.title': 'Hangi platformların var?',
            'onboarding.platforms.sub': 'Birden fazla seçebilirsin.',
            'onboarding.platforms.subSelected': '{n} seçildi',
            'onboarding.ready.title': 'Hazırız.',
            'onboarding.ready.sub': 'Sana özel seçimler hazır.',
            'onboarding.ready.platforms': '{n} platform',
            'onboarding.ready.cta': "Lumi'yi keşfet",

            // Onboarding — Premium teaser slide (S5) — 04-04-r1
            'onboarding.premium.title': 'Lumi Premium',
            'onboarding.premium.sub': 'Film Gecesi Asistanın',
            'onboarding.premium.feature.decide.title': 'Decide-for-Me',
            'onboarding.premium.feature.decide.desc': 'Karar veremediğinde Lumi versin',
            'onboarding.premium.feature.pair.title': 'Pair Mode',
            'onboarding.premium.feature.pair.desc': 'İki kişi için ortak öneri',
            'onboarding.premium.feature.notif.title': 'Smart Notifications',
            'onboarding.premium.feature.notif.desc': 'Sevdiğin dizilere yeni bölüm geldiğinde haber',
            'onboarding.premium.feature.evening.title': 'Evening Assistant',
            'onboarding.premium.feature.evening.desc': "Akşam 8'de bugünlük öneri",
            'onboarding.premium.limited': 'Limited',
            'onboarding.premium.trialNote': 'İlk 7 gün ücretsiz',
            'onboarding.premium.cta': "Premium'u dene",
            'onboarding.premium.skip': 'Şimdilik geç',
            'onboarding.premium.tier.monthly': 'Aylık',
            'onboarding.premium.tier.yearly': 'Yıllık',
            'onboarding.premium.tier.lifetime': 'Ömürlük',
            'onboarding.premium.bestValue': 'BEST VALUE',
            'onboarding.premium.savings': 'Aylığa göre {amount} tasarruf',
            'onboarding.premium.notifyCta': 'Premium çıkınca haber ver',
            'onboarding.premium.notifyAdded': 'Eklendi',
            'onboarding.premium.restore': 'Satın alımları geri yükle',
            'onboarding.premium.restoreSoon': 'Phase 5 ile aktif olacak',

            // Profile — Developer / QA section (04-04-r1)
            'profile.dev.title': 'Geliştirici / QA',
            'profile.dev.alwaysShowOnboarding': "Onboarding'i her zaman göster",
            'profile.dev.alwaysShowOnboardingHint': 'Test için. Her uygulama açılışında onboarding ekranı tekrar görünür.',
            'profile.dev.betaTesterOnly': 'Sadece beta test için'
        },

        en: {
            // App
            appTitle: 'Where to Watch?',
            search: 'Where to Watch Movies & TV? Search...',

            // Section Headers (for dynamic header)
            sectionHome: 'Where to Watch?',
            sectionDiscover: 'What to Watch?',
            sectionFavorites: 'My Favorites',
            sectionProfile: 'My Profile',

            // Nav Labels
            navHome: 'Home',
            navDiscover: 'What to Watch',
            navFavorites: 'My Favorites',
            navProfile: 'Profile',

            // Sections
            trending: 'Trending',
            newReleases: 'New Releases',
            classics: 'Classics',
            suggested: 'For You',
            turkishContent: '🎬 Local Content',
            localContent: 'Local Content',

            // Ne İzlesem Wizard
            wizardQuestion: 'What do you want to watch tonight?',
            wizardTypeAll: 'Both are fine',
            wizardTypeMovie: 'Movie',
            wizardTypeTv: 'TV Show',
            mainCategory: 'Main Category',
            moodLabel: 'What\'s your mood?',
            moodTrend: 'Trending',
            moodRandom: 'Random',
            moodBlockbuster: 'Blockbuster',
            moodArt: 'Art House',
            moodAwarded: 'Award Winners',
            moodClassic: 'Classic',
            moodLocal: 'Local',
            genreLabel: 'Genre',
            genreOptional: 'skip to include all',
            platformLabel: 'Where will you watch?',
            anyPlatform: 'Any',
            generateBtn: 'Surprise Me!',
            resultsTitle: 'Picked for You',
            resetFilters: 'Try Again',
            loadMore: 'Load More',

            // Mood Chips
            moodChill: 'Chill',
            moodAdrenaline: 'Adrenaline',
            moodTearjerker: 'Emotional',
            moodMindbending: 'Mind-bending',

            // Era Chips
            allEras: 'All Eras',
            eraClassic: 'Classic',
            era80s: '80s',
            era90s: '90s',
            era2000s: '2000s',
            era2010s: '2010s',
            era2020s: '2020s',

            // Action Buttons
            recommendBtn: 'Recommend',
            surpriseBtn: 'Surprise Me',

            // Trending & Daily Pick
            dailyPick: 'DAILY PICK',
            trendingSearches: 'Trending Searches',

            // Genres
            action: 'Action',
            comedy: 'Comedy',
            drama: 'Drama',
            horror: 'Horror',
            romance: 'Romance',
            scifi: 'Sci-Fi',
            thriller: 'Thriller',
            animation: 'Animation',

            // Detail Modal
            watchOn: 'Where to Watch',
            airingOn: 'Airing on',
            cast: 'Cast',
            videos: 'Videos',
            trailer: 'Trailer',
            behindTheScenes: 'Behind the Scenes',
            reviews: 'Reviews',
            trivia: 'Trivia',
            director: 'Director',
            writer: 'Writer',
            originalNetwork: 'Original Network',
            noPlatform: 'No streaming info available',
            searchYouTube: 'Search on YouTube',
            nearestCinemas: 'Nearby Theaters',

            // Ratings
            yourRating: 'Your Rating',

            // Actions
            addFavorite: '🤍 Add',
            removeFavorite: '❤️ Remove',
            notify: '🔔 Notify Me',
            notifyLocked: '🔒 Notify (Premium)',
            rateIt: 'Rate',
            deleteRating: 'Delete',
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

            // Auth / Login Modal
            login: 'Log In',
            logout: 'Log Out',
            signUp: 'Sign Up',
            loginTitle: 'Welcome',
            loginSubtitle: 'Sign in to continue',
            continueWithGoogle: 'Continue with Google',
            continueWithFacebook: 'Continue with Facebook',
            continueWithApple: 'Continue with Apple',
            close: 'Close',

            // Favorites
            favAll: 'All',
            favMovies: 'Movies',
            favSeries: 'TV Shows',

            // Status
            loading: 'Loading...',
            noResults: 'No results found',
            upcoming: 'Coming Soon',
            inCinemas: 'In Theaters',
            searchResults: 'Search Results',

            // AI Input
            aiInputLabel: 'How are you feeling today?',
            aiInputPlaceholder: 'A warm family movie that takes me back to my childhood...',
            aiSearching: '🤖 Gemini is thinking...',
            aiRecommendations: 'AI Recommendations',

            // Detail Tabs
            detailTabOverview: 'Overview',
            detailTabCast: 'Cast',
            detailTabTrailer: 'Trailers',

            // Avatar
            changeAvatar: 'Change Avatar',
            selectAvatar: 'Select Avatar',

            // Search Filter Chips
            filter_all: 'All',
            filter_movies: 'Movies',
            filter_tv_shows: 'TV Shows',
            filter_people: 'People',

            // Time
            minutes: 'min',
            movie: 'Movie',
            tvShow: 'TV Show',

            // Phase 04-03: Action-triggered auth gate
            'authGate.title': 'Sign in',
            'authGate.default': 'Sign in to continue.',
            'authGate.rateMovie': 'Sign in to rate movies.',
            'authGate.shareList': 'Sign in to share your list.',
            'authGate.commentPost': 'Sign in to comment.',
            'authGate.editProfile': 'Sign in to customize your profile.',
            'profile.guestCta': 'Sign in to customize your profile.',
            'profile.guestCtaButton': 'Sign In',
            'common.comingSoon': 'Coming soon',

            // Phase 04-04: Onboarding wizard
            'onboarding.skip': 'Skip',
            'onboarding.step1.title': 'Right language?',
            'onboarding.step1.confirm': 'Yes, continue',
            'onboarding.step1.chooseOther': 'Choose another language',
            'onboarding.step2.title': 'Your country?',
            'onboarding.step2.confirm': 'Yes, continue',
            'onboarding.step2.chooseOther': 'Choose another country',
            'onboarding.step3.title': 'Which platforms do you use?',
            'onboarding.step3.done': 'Done',
            'onboarding.step3.skip': 'Add later',
            'onboarding.providers.loadError': "Couldn't load providers. Add later.",

            // Phase 04-04 R1: Cinematic redesign — 5-slide wizard copy
            'onboarding.next': 'Continue',
            'onboarding.welcome.title': 'Welcome to Lumi.',
            'onboarding.welcome.sub': "When you don't know what to watch, we're here.",
            'onboarding.welcome.cta': "Let's go",
            'onboarding.lang.title': 'Which language?',
            'onboarding.lang.sub': 'More languages coming soon.',
            'onboarding.country.title': 'Where are you watching from?',
            'onboarding.country.sub': "We'll surface streaming services for your region.",
            'onboarding.country.search': 'Search country',
            'onboarding.country.empty': 'No matches',
            'onboarding.platforms.title': 'Which platforms do you have?',
            'onboarding.platforms.sub': 'Pick as many as you like.',
            'onboarding.platforms.subSelected': '{n} selected',
            'onboarding.ready.title': 'All set.',
            'onboarding.ready.sub': 'Your picks are ready.',
            'onboarding.ready.platforms': '{n} platforms',
            'onboarding.ready.cta': 'Discover Lumi',

            // Onboarding — Premium teaser slide (S5) — 04-04-r1
            'onboarding.premium.title': 'Lumi Premium',
            'onboarding.premium.sub': 'Your Movie Night Agent',
            'onboarding.premium.feature.decide.title': 'Decide-for-Me',
            'onboarding.premium.feature.decide.desc': "Let Lumi pick when you can't decide",
            'onboarding.premium.feature.pair.title': 'Pair Mode',
            'onboarding.premium.feature.pair.desc': 'Recommendations for two',
            'onboarding.premium.feature.notif.title': 'Smart Notifications',
            'onboarding.premium.feature.notif.desc': 'Get notified when your favorites drop new episodes',
            'onboarding.premium.feature.evening.title': 'Evening Assistant',
            'onboarding.premium.feature.evening.desc': "Tonight's pick at 8pm",
            'onboarding.premium.limited': 'Limited',
            'onboarding.premium.trialNote': 'First 7 days free',
            'onboarding.premium.cta': 'Try Premium',
            'onboarding.premium.skip': 'Skip for now',
            'onboarding.premium.tier.monthly': 'Monthly',
            'onboarding.premium.tier.yearly': 'Yearly',
            'onboarding.premium.tier.lifetime': 'Lifetime',
            'onboarding.premium.bestValue': 'BEST VALUE',
            'onboarding.premium.savings': '{amount} saved vs monthly',
            'onboarding.premium.notifyCta': 'Notify me when Premium launches',
            'onboarding.premium.notifyAdded': 'Added',
            'onboarding.premium.restore': 'Restore purchases',
            'onboarding.premium.restoreSoon': 'Coming in Phase 5',

            // Profile — Developer / QA section (04-04-r1)
            'profile.dev.title': 'Developer / QA',
            'profile.dev.alwaysShowOnboarding': 'Always show onboarding',
            'profile.dev.alwaysShowOnboardingHint': 'For testing. The onboarding screen will appear every time the app launches.',
            'profile.dev.betaTesterOnly': 'Beta tester only'
        },

        de: {
            // App
            appTitle: 'Wo schauen?',
            search: 'Wo kann man Filme & Serien sehen? Suchen...',

            // Section Headers
            sectionHome: 'Wo schauen?',
            sectionDiscover: 'Was schauen?',
            sectionFavorites: 'Meine Favoriten',
            sectionProfile: 'Mein Profil',

            // Nav Labels
            navHome: 'Startseite',
            navDiscover: 'Was schauen',
            navFavorites: 'Meine Favoriten',
            navProfile: 'Profil',

            // Sections
            trending: 'Beliebt',
            newReleases: 'Neu erschienen',
            classics: 'Klassiker',
            suggested: 'Für dich',
            turkishContent: '🎬 Lokale Inhalte',
            localContent: 'Lokale Inhalte',

            // Wizard
            wizardQuestion: 'Was möchtest du heute Abend schauen?',
            wizardTypeAll: 'Beides ist ok',
            wizardTypeMovie: 'Film',
            wizardTypeTv: 'Serie',
            moodLabel: 'Wie ist deine Stimmung?',
            moodTrend: 'Trend',
            moodRandom: 'Zufällig',
            moodBlockbuster: 'Blockbuster',
            moodArt: 'Kunstfilm',
            moodAwarded: 'Preisgekrönt',
            moodClassic: 'Klassiker',
            moodLocal: 'Lokal',
            genreLabel: 'Genre',
            genreOptional: 'überspringen für alle',
            platformLabel: 'Wo wirst du schauen?',
            generateBtn: 'Überrasche mich!',
            resultsTitle: 'Für dich ausgewählt',
            resetFilters: 'Erneut versuchen',
            loadMore: 'Mehr laden',

            // Genres
            action: 'Action',
            comedy: 'Komödie',
            drama: 'Drama',
            horror: 'Horror',
            romance: 'Romantik',
            scifi: 'Sci-Fi',
            thriller: 'Thriller',
            animation: 'Animation',

            // Detail Modal
            watchOn: 'Wo zu sehen',
            cast: 'Besetzung',
            videos: 'Videos',
            trailer: 'Trailer',
            behindTheScenes: 'Hinter den Kulissen',
            reviews: 'Rezensionen',
            trivia: 'Wissenswertes',
            director: 'Regisseur',
            writer: 'Drehbuch',
            originalNetwork: 'Originalsender',
            noPlatform: 'Keine Streaming-Info verfügbar',
            searchYouTube: 'Auf YouTube suchen',
            nearestCinemas: 'Kinos in der Nähe',

            // Ratings
            yourRating: 'Deine Bewertung',

            // Actions
            addFavorite: '🤍 Hinzufügen',
            removeFavorite: '❤️ Entfernen',
            notify: '🔔 Benachrichtigen',
            notifyLocked: '🔒 Benachrichtigen (Premium)',
            rateIt: 'Bewerten',
            deleteRating: 'Löschen',
            theme: 'Thema',
            dark: 'Dunkel',
            light: 'Hell',
            membership: 'Mitgliedschaft',
            guest: 'Gast',
            member: 'Mitglied',
            premium: 'Premium',
            myRatings: 'Meine Bewertungen',
            upgradePremium: 'Auf Premium upgraden',

            // Premium
            premiumTitle: 'Premium werden',
            premiumDesc: 'Unbegrenzter Zugang zu allen Funktionen!',
            perYear: '/Jahr',
            buyNow: 'Jetzt kaufen',

            // Auth / Login Modal
            login: 'Anmelden',
            logout: 'Abmelden',
            signUp: 'Registrieren',
            loginTitle: 'Willkommen',
            loginSubtitle: 'Anmelden um fortzufahren',
            continueWithGoogle: 'Mit Google fortfahren',
            continueWithFacebook: 'Mit Facebook fortfahren',
            continueWithApple: 'Mit Apple fortfahren',
            close: 'Schließen',

            // Favorites
            favAll: 'Alle',
            favMovies: 'Filme',
            favSeries: 'Serien',

            // Status
            loading: 'Laden...',
            noResults: 'Keine Ergebnisse',
            upcoming: 'Demnächst',
            inCinemas: 'Im Kino',
            searchResults: 'Suchergebnisse',

            // Time
            minutes: 'Min',
            movie: 'Film',
            tvShow: 'Serie'
        },

        fr: {
            // App
            appTitle: 'Où regarder?',
            search: 'Où regarder Films & Séries? Rechercher...',

            // Section Headers
            sectionHome: 'Où regarder?',
            sectionDiscover: 'Quoi regarder?',
            sectionFavorites: 'Mes Favoris',
            sectionProfile: 'Mon Profil',

            // Nav Labels
            navHome: 'Accueil',
            navDiscover: 'Quoi regarder',
            navFavorites: 'Mes Favoris',
            navProfile: 'Profil',

            // Sections
            trending: 'Tendances',
            newReleases: 'Nouveautés',
            classics: 'Classiques',
            suggested: 'Pour vous',
            turkishContent: '🎬 Contenu local',
            localContent: 'Contenu local',

            // Wizard
            wizardQuestion: 'Que voulez-vous regarder ce soir?',
            wizardTypeAll: 'Les deux me vont',
            wizardTypeMovie: 'Film',
            wizardTypeTv: 'Série',
            moodLabel: 'Quelle est votre humeur?',
            moodTrend: 'Tendance',
            moodRandom: 'Aléatoire',
            moodBlockbuster: 'Blockbuster',
            moodArt: 'Film d\'art',
            moodAwarded: 'Primé',
            moodClassic: 'Classique',
            moodLocal: 'Local',
            genreLabel: 'Genre',
            genreOptional: 'passer pour inclure tous',
            platformLabel: 'Où allez-vous regarder?',
            generateBtn: 'Surprise!',
            resultsTitle: 'Choisis pour vous',
            resetFilters: 'Réessayer',
            loadMore: 'Charger plus',

            // Genres
            action: 'Action',
            comedy: 'Comédie',
            drama: 'Drame',
            horror: 'Horreur',
            romance: 'Romance',
            scifi: 'Sci-Fi',
            thriller: 'Thriller',
            animation: 'Animation',

            // Detail Modal
            watchOn: 'Où regarder',
            cast: 'Distribution',
            videos: 'Vidéos',
            trailer: 'Bande-annonce',
            behindTheScenes: 'Coulisses',
            reviews: 'Critiques',
            trivia: 'Anecdotes',
            director: 'Réalisateur',
            writer: 'Scénariste',
            originalNetwork: 'Diffuseur original',
            noPlatform: 'Aucune info de streaming',
            searchYouTube: 'Rechercher sur YouTube',
            nearestCinemas: 'Cinémas à proximité',

            // Ratings
            yourRating: 'Votre note',

            // Actions
            addFavorite: '🤍 Ajouter',
            removeFavorite: '❤️ Retirer',
            notify: '🔔 Notifier',
            notifyLocked: '🔒 Notifier (Premium)',
            rateIt: 'Noter',
            deleteRating: 'Supprimer',
            theme: 'Thème',
            dark: 'Sombre',
            light: 'Clair',
            membership: 'Abonnement',
            guest: 'Invité',
            member: 'Membre',
            premium: 'Premium',
            myRatings: 'Mes Notes',
            upgradePremium: 'Passer à Premium',

            // Premium
            premiumTitle: 'Devenir Premium',
            premiumDesc: 'Accès illimité à toutes les fonctionnalités!',
            perYear: '/an',
            buyNow: 'Acheter',

            // Auth / Login Modal
            login: 'Connexion',
            logout: 'Déconnexion',
            signUp: 'S\'inscrire',
            loginTitle: 'Bienvenue',
            loginSubtitle: 'Connectez-vous pour continuer',
            continueWithGoogle: 'Continuer avec Google',
            continueWithFacebook: 'Continuer avec Facebook',
            continueWithApple: 'Continuer avec Apple',
            close: 'Fermer',

            // Favorites
            favAll: 'Tous',
            favMovies: 'Films',
            favSeries: 'Séries',

            // Status
            loading: 'Chargement...',
            noResults: 'Aucun résultat',
            upcoming: 'Bientôt',
            inCinemas: 'Au cinéma',
            searchResults: 'Résultats de recherche',

            // Time
            minutes: 'min',
            movie: 'Film',
            tvShow: 'Série'
        },

        es: {
            // App
            appTitle: '¿Dónde ver?',
            search: '¿Dónde ver Películas y Series? Buscar...',

            // Section Headers
            sectionHome: '¿Dónde ver?',
            sectionDiscover: '¿Qué ver?',
            sectionFavorites: 'Mis Favoritos',
            sectionProfile: 'Mi Perfil',

            // Nav Labels
            navHome: 'Inicio',
            navDiscover: '¿Qué ver?',
            navFavorites: 'Mis Favoritos',
            navProfile: 'Perfil',

            // Sections
            trending: 'Tendencias',
            newReleases: 'Nuevos lanzamientos',
            classics: 'Clásicos',
            suggested: 'Para ti',
            turkishContent: '🎬 Contenido local',
            localContent: 'Contenido local',

            // Wizard
            wizardQuestion: '¿Qué quieres ver esta noche?',
            wizardTypeAll: 'Ambos están bien',
            wizardTypeMovie: 'Película',
            wizardTypeTv: 'Serie',
            moodLabel: '¿Cuál es tu estado de ánimo?',
            moodTrend: 'Tendencia',
            moodRandom: 'Aleatorio',
            moodBlockbuster: 'Blockbuster',
            moodArt: 'Cine de autor',
            moodAwarded: 'Premiado',
            moodClassic: 'Clásico',
            moodLocal: 'Local',
            genreLabel: 'Género',
            genreOptional: 'omitir para incluir todos',
            platformLabel: '¿Dónde vas a ver?',
            generateBtn: '¡Sorpréndeme!',
            resultsTitle: 'Elegidos para ti',
            resetFilters: 'Reintentar',
            loadMore: 'Cargar más',

            // Genres
            action: 'Acción',
            comedy: 'Comedia',
            drama: 'Drama',
            horror: 'Terror',
            romance: 'Romance',
            scifi: 'Ciencia ficción',
            thriller: 'Suspenso',
            animation: 'Animación',

            // Detail Modal
            watchOn: 'Dónde ver',
            cast: 'Reparto',
            videos: 'Videos',
            trailer: 'Tráiler',
            behindTheScenes: 'Detrás de cámaras',
            reviews: 'Reseñas',
            trivia: 'Curiosidades',
            director: 'Director',
            writer: 'Guionista',
            originalNetwork: 'Emisora original',
            noPlatform: 'Sin info de streaming',
            searchYouTube: 'Buscar en YouTube',
            nearestCinemas: 'Cines cercanos',

            // Ratings
            yourRating: 'Tu valoración',

            // Actions
            addFavorite: '🤍 Añadir',
            removeFavorite: '❤️ Quitar',
            notify: '🔔 Notificar',
            notifyLocked: '🔒 Notificar (Premium)',
            rateIt: 'Valorar',
            deleteRating: 'Eliminar',
            theme: 'Tema',
            dark: 'Oscuro',
            light: 'Claro',
            membership: 'Membresía',
            guest: 'Invitado',
            member: 'Miembro',
            premium: 'Premium',
            myRatings: 'Mis Valoraciones',
            upgradePremium: 'Mejorar a Premium',

            // Premium
            premiumTitle: 'Hazte Premium',
            premiumDesc: '¡Acceso ilimitado a todas las funciones!',
            perYear: '/año',
            buyNow: 'Comprar',

            // Auth / Login Modal
            login: 'Iniciar sesión',
            logout: 'Cerrar sesión',
            signUp: 'Registrarse',
            loginTitle: 'Bienvenido',
            loginSubtitle: 'Inicia sesión para continuar',
            continueWithGoogle: 'Continuar con Google',
            continueWithFacebook: 'Continuar con Facebook',
            continueWithApple: 'Continuar con Apple',
            close: 'Cerrar',

            // Favorites
            favAll: 'Todos',
            favMovies: 'Películas',
            favSeries: 'Series',

            // Status
            loading: 'Cargando...',
            noResults: 'Sin resultados',
            upcoming: 'Próximamente',
            inCinemas: 'En cines',
            searchResults: 'Resultados de búsqueda',

            // Time
            minutes: 'min',
            movie: 'Película',
            tvShow: 'Serie'
        },

        ja: {
            // App
            appTitle: 'どこで見る？',
            search: '映画やドラマを検索...',

            // Section Headers
            sectionHome: 'どこで見る？',
            sectionDiscover: '何を見る？',
            sectionFavorites: 'お気に入り',
            sectionProfile: 'プロフィール',

            // Sections
            trending: '人気',
            newReleases: '新着',
            classics: 'クラシック',
            suggested: 'おすすめ',
            turkishContent: '🎬 ローカルコンテンツ',

            // Genres
            action: 'アクション',
            comedy: 'コメディ',
            drama: 'ドラマ',
            horror: 'ホラー',
            romance: 'ロマンス',
            scifi: 'SF',

            // Detail Modal
            watchOn: '視聴先',
            cast: 'キャスト',
            videos: '動画',
            trailer: '予告編',
            behindTheScenes: 'メイキング',
            reviews: 'レビュー',
            trivia: 'トリビア',
            director: '監督',
            writer: '脚本',

            // Ratings
            yourRating: 'あなたの評価',

            // Actions
            addFavorite: '🤍 追加',
            removeFavorite: '❤️ 削除',
            notify: '🔔 通知',
            theme: 'テーマ',
            dark: 'ダーク',
            light: 'ライト',
            membership: '会員',
            guest: 'ゲスト',
            member: 'メンバー',
            premium: 'プレミアム',
            myRatings: 'マイ評価',
            upgradePremium: 'プレミアムへ',

            // Premium
            premiumTitle: 'プレミアムになる',
            premiumDesc: 'すべての機能に無制限アクセス！',
            perYear: '/年',
            buyNow: '購入',

            // Auth
            login: 'ログイン',
            logout: 'ログアウト',
            signUp: '登録',

            // Status
            loading: '読み込み中...',
            noResults: '結果なし',
            upcoming: '近日公開',
            inCinemas: '上映中',

            // Time
            minutes: '分',
            movie: '映画',
            tvShow: 'ドラマ'
        },

        zh: {
            // App
            appTitle: '哪里看？',
            search: '搜索电影或剧集...',

            // Section Headers
            sectionHome: '哪里看？',
            sectionDiscover: '看什么？',
            sectionFavorites: '我的收藏',
            sectionProfile: '我的资料',

            // Sections
            trending: '热门',
            newReleases: '新上映',
            classics: '经典',
            suggested: '为你推荐',
            turkishContent: '🎬 本地内容',

            // Genres
            action: '动作',
            comedy: '喜剧',
            drama: '剧情',
            horror: '恐怖',
            romance: '爱情',
            scifi: '科幻',

            // Detail Modal
            watchOn: '在哪看',
            cast: '演员',
            videos: '视频',
            trailer: '预告片',
            behindTheScenes: '幕后',
            reviews: '评论',
            trivia: '趣闻',
            director: '导演',
            writer: '编剧',

            // Ratings
            yourRating: '你的评分',

            // Actions
            addFavorite: '🤍 收藏',
            removeFavorite: '❤️ 取消',
            notify: '🔔 提醒',
            theme: '主题',
            dark: '深色',
            light: '浅色',
            membership: '会员',
            guest: '游客',
            member: '会员',
            premium: '高级',
            myRatings: '我的评分',
            upgradePremium: '升级高级版',

            // Premium
            premiumTitle: '升级高级版',
            premiumDesc: '无限访问所有功能！',
            perYear: '/年',
            buyNow: '购买',

            // Auth
            login: '登录',
            logout: '退出',
            signUp: '注册',

            // Status
            loading: '加载中...',
            noResults: '无结果',
            upcoming: '即将上映',
            inCinemas: '正在上映',

            // Time
            minutes: '分钟',
            movie: '电影',
            tvShow: '剧集'
        },

        ko: {
            // App
            appTitle: '어디서 볼까?',
            search: '영화나 드라마 검색...',

            // Section Headers
            sectionHome: '어디서 볼까?',
            sectionDiscover: '뭘 볼까?',
            sectionFavorites: '즐겨찾기',
            sectionProfile: '프로필',

            // Sections
            trending: '인기',
            newReleases: '최신',
            classics: '클래식',
            suggested: '추천',
            turkishContent: '🎬 로컬 콘텐츠',

            // Genres
            action: '액션',
            comedy: '코미디',
            drama: '드라마',
            horror: '공포',
            romance: '로맨스',
            scifi: 'SF',

            // Detail Modal
            watchOn: '시청 가능',
            cast: '출연진',
            videos: '영상',
            trailer: '예고편',
            behindTheScenes: '비하인드',
            reviews: '리뷰',
            trivia: '트리비아',
            director: '감독',
            writer: '각본',

            // Ratings
            yourRating: '내 평점',

            // Actions
            addFavorite: '🤍 추가',
            removeFavorite: '❤️ 삭제',
            notify: '🔔 알림',
            theme: '테마',
            dark: '다크',
            light: '라이트',
            membership: '멤버십',
            guest: '게스트',
            member: '회원',
            premium: '프리미엄',
            myRatings: '내 평점',
            upgradePremium: '프리미엄으로',

            // Premium
            premiumTitle: '프리미엄 되기',
            premiumDesc: '모든 기능 무제한 이용!',
            perYear: '/년',
            buyNow: '구매',

            // Auth
            login: '로그인',
            logout: '로그아웃',
            signUp: '가입',

            // Status
            loading: '로딩 중...',
            noResults: '결과 없음',
            upcoming: '개봉 예정',
            inCinemas: '상영 중',

            // Time
            minutes: '분',
            movie: '영화',
            tvShow: '드라마'
        }
        // NOTE: es/fr/de/ja/ko blocks defined above. Missing keys per language
        // fall through to EN via the t() chain — see public/i18n/{lang}.json
        // for full keyset scaffolds that future translators will fill.
    },

    // Get translation with EN fallback chain.
    // 1. currentLang dict has the key → return it
    // 2. EN dict has the key → return EN value
    // 3. otherwise → return the raw key (last-resort marker)
    t(key) {
        return this.translations[this.currentLang]?.[key]
            ?? this.translations.en?.[key]
            ?? key;
    },

    // Set language and update UI
    setLanguage(langCode) {
        // Normalize to 2-letter ISO code (e.g., "en-US" -> "en")
        const normalized = langCode.includes('-') ? langCode.split('-')[0] : langCode;

        if (this.translations[normalized]) {
            this.currentLang = normalized;
            localStorage.setItem('appLanguage', normalized);

            // Update all DOM elements with translations
            this.updateTranslations();

            console.log(`[i18n] Language changed to: ${normalized}`);
            return true;
        }
        console.warn(`[i18n] Translation not found for: ${langCode} (normalized: ${normalized})`);
        return false;
    },

    // Load saved language. Phase 04-02 added lumi_locale as the new source of
    // truth; legacy appLanguage is kept as a fallback so existing users keep
    // their language without forcing a re-detect.
    loadLanguage() {
        let resolved = null;
        try {
            const raw = localStorage.getItem('lumi_locale');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.lang && this.translations[parsed.lang]) resolved = parsed.lang;
        } catch {}
        if (!resolved) {
            const legacy = localStorage.getItem('appLanguage');
            if (legacy && this.translations[legacy]) resolved = legacy;
        }
        if (resolved) this.currentLang = resolved;
    },

    // Update all translatable elements in DOM
    updateTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });

        // Update placeholders with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation && translation !== key) {
                el.placeholder = translation;
            }
        });

        // Update page title
        document.title = this.t('appTitle');
    }
};

// Expose globally
window.i18n = i18n;
