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

            // Nav Labels
            navHome: 'Ana Sayfa',
            navDiscover: 'Keşfet',
            navFavorites: 'Favoriler',
            navProfile: 'Profil',

            // Sections
            trending: 'Popüler',
            newReleases: 'Yeni Çıkanlar',
            classics: 'Klasikler',
            suggested: 'Önerilen',
            turkishContent: '🇹🇷 Türk Yapımları',
            localContent: 'Yerel İçerikler',

            // Ne İzlesem Wizard
            wizardQuestion: 'Bu akşam ne izlemek istersin?',
            wizardTypeAll: 'İkisi de olur',
            wizardTypeMovie: 'Film',
            wizardTypeTv: 'Dizi',
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
            generateBtn: 'Sürpriz Yap!',
            resultsTitle: 'Sizin İçin Seçtiklerimiz',
            resetFilters: 'Tekrar Seç',
            loadMore: 'Daha Fazla Göster',

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

            // Nav Labels
            navHome: 'Home',
            navDiscover: 'Discover',
            navFavorites: 'Favorites',
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
            generateBtn: 'Surprise Me!',
            resultsTitle: 'Picked for You',
            resetFilters: 'Try Again',
            loadMore: 'Load More',

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

            // Time
            minutes: 'min',
            movie: 'Movie',
            tvShow: 'TV Show'
        },

        de: {
            // App
            appTitle: 'Wo schauen?',
            search: 'Filme oder Serien suchen...',

            // Section Headers
            sectionHome: 'Wo schauen?',
            sectionDiscover: 'Was schauen?',
            sectionFavorites: 'Meine Favoriten',
            sectionProfile: 'Mein Profil',

            // Sections
            trending: 'Beliebt',
            newReleases: 'Neu erschienen',
            classics: 'Klassiker',
            suggested: 'Für dich',
            turkishContent: '🎬 Lokale Inhalte',

            // Genres
            action: 'Action',
            comedy: 'Komödie',
            drama: 'Drama',
            horror: 'Horror',
            romance: 'Romantik',
            scifi: 'Sci-Fi',

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

            // Ratings
            yourRating: 'Deine Bewertung',

            // Actions
            addFavorite: '🤍 Hinzufügen',
            removeFavorite: '❤️ Entfernen',
            notify: '🔔 Benachrichtigen',
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

            // Auth
            login: 'Anmelden',
            logout: 'Abmelden',
            signUp: 'Registrieren',

            // Status
            loading: 'Laden...',
            noResults: 'Keine Ergebnisse',
            upcoming: 'Demnächst',
            inCinemas: 'Im Kino',

            // Time
            minutes: 'Min',
            movie: 'Film',
            tvShow: 'Serie'
        },

        fr: {
            // App
            appTitle: 'Où regarder?',
            search: 'Rechercher films ou séries...',

            // Section Headers
            sectionHome: 'Où regarder?',
            sectionDiscover: 'Quoi regarder?',
            sectionFavorites: 'Mes Favoris',
            sectionProfile: 'Mon Profil',

            // Sections
            trending: 'Tendances',
            newReleases: 'Nouveautés',
            classics: 'Classiques',
            suggested: 'Pour vous',
            turkishContent: '🎬 Contenu local',

            // Genres
            action: 'Action',
            comedy: 'Comédie',
            drama: 'Drame',
            horror: 'Horreur',
            romance: 'Romance',
            scifi: 'Sci-Fi',

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

            // Ratings
            yourRating: 'Votre note',

            // Actions
            addFavorite: '🤍 Ajouter',
            removeFavorite: '❤️ Retirer',
            notify: '🔔 Notifier',
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

            // Auth
            login: 'Connexion',
            logout: 'Déconnexion',
            signUp: 'S\'inscrire',

            // Status
            loading: 'Chargement...',
            noResults: 'Aucun résultat',
            upcoming: 'Bientôt',
            inCinemas: 'Au cinéma',

            // Time
            minutes: 'min',
            movie: 'Film',
            tvShow: 'Série'
        },

        es: {
            // App
            appTitle: '¿Dónde ver?',
            search: 'Buscar películas o series...',

            // Section Headers
            sectionHome: '¿Dónde ver?',
            sectionDiscover: '¿Qué ver?',
            sectionFavorites: 'Mis Favoritos',
            sectionProfile: 'Mi Perfil',

            // Sections
            trending: 'Tendencias',
            newReleases: 'Nuevos lanzamientos',
            classics: 'Clásicos',
            suggested: 'Para ti',
            turkishContent: '🎬 Contenido local',

            // Genres
            action: 'Acción',
            comedy: 'Comedia',
            drama: 'Drama',
            horror: 'Terror',
            romance: 'Romance',
            scifi: 'Ciencia ficción',

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

            // Ratings
            yourRating: 'Tu valoración',

            // Actions
            addFavorite: '🤍 Añadir',
            removeFavorite: '❤️ Quitar',
            notify: '🔔 Notificar',
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

            // Auth
            login: 'Iniciar sesión',
            logout: 'Cerrar sesión',
            signUp: 'Registrarse',

            // Status
            loading: 'Cargando...',
            noResults: 'Sin resultados',
            upcoming: 'Próximamente',
            inCinemas: 'En cines',

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
