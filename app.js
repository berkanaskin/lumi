// ============================================
// LUMI v0.9.8 - Audit Cleanup & Documentation
// Mobile-First Film Discovery App
// ============================================

const APP_VERSION = '0.9.8';

// Toast notification function
function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        background: rgba(30, 30, 40, 0.95);
        border: 1px solid rgba(120, 90, 242, 0.5);
        border-radius: 12px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        animation: toastIn 0.3s ease;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Toast animations (inject CSS)
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(toastStyles);

// DOM Elements
const elements = {
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
    languageSelect: document.getElementById('language-select'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    loginModal: document.getElementById('login-modal'), // Future use

    // Sections
    mainContent: document.getElementById('main-content'),
    trendingSection: document.getElementById('trending-section'),
    newReleasesSection: document.getElementById('new-releases-section'),
    classicsSection: document.getElementById('classics-section'),
    suggestedSection: document.getElementById('suggested-section'),
    searchResultsSection: document.getElementById('search-results-section'),
    discoverSection: document.getElementById('discover-section'),
    favoritesSection: document.getElementById('favorites-section'),
    profileSection: document.getElementById('profile-section'),

    // Sliders/Grids
    trendingSlider: document.getElementById('trending-slider'),
    newReleasesSlider: document.getElementById('new-releases-slider'),
    classicsSlider: document.getElementById('classics-slider'),
    suggestedSlider: document.getElementById('suggested-slider'),
    resultsGrid: document.getElementById('results-grid'),
    discoverGrid: document.getElementById('discover-grid'),
    favoritesGrid: document.getElementById('favorites-grid'),
    profileContent: document.getElementById('profile-content'),

    resultsTitle: document.getElementById('results-title'),
    resultsCount: document.getElementById('results-count'),
    favoritesCount: document.getElementById('favorites-count'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('no-results'),
    modal: document.getElementById('detail-modal'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close')
};

// Language to Region mapping (for Watch Providers)
const LANGUAGE_REGIONS = {
    'tr': { lang: 'tr-TR', region: 'TR' },
    'en': { lang: 'en-US', region: 'US' },
    'de': { lang: 'de-DE', region: 'DE' },
    'fr': { lang: 'fr-FR', region: 'FR' },
    'es': { lang: 'es-ES', region: 'ES' },
    'ja': { lang: 'ja-JP', region: 'JP' },
    'zh': { lang: 'zh-CN', region: 'CN' },
    'ko': { lang: 'ko-KR', region: 'KR' }
};

// App State
const state = {
    currentType: 'multi',
    currentLanguageCode: 'tr',
    currentLanguage: 'tr-TR',
    currentRegion: 'TR',
    currentVideos: null,
    currentVideoCategory: 'trailer',
    currentTheme: 'dark',
    currentTitle: '',
    currentPage: 'home',
    currentItemId: null,
    currentItemType: null,
    autocompleteTimeout: null,

    // Search State Persistence
    searchQuery: '',
    searchResults: [],
    searchResultsVisible: false,
    cameFromSearch: false,
    skipNextHomePage: false, // Flag to prevent loadHomePage from overriding search restore
    searchRestoreTime: 0, // Timestamp when search was restored - prevents loadHomePage for 500ms
    lastView: 'home', // Track last view for modal return
    lastScrollPosition: 0, // Track scroll position before modal

    // Auth State
    currentUser: null,
    userTier: 'guest' // 'guest', 'free', 'premium'
};

// Platform URLs for deep linking
// Priority: Direct platform search > Google site search
const PLATFORM_URLS = {
    // Global Streaming Platforms
    'Netflix': 'https://www.netflix.com/search?q=',
    'Amazon Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Amazon Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Disney Plus': 'https://www.disneyplus.com/search?q=',
    'Disney+': 'https://www.disneyplus.com/search?q=',
    'Apple TV': 'https://tv.apple.com/search?term=',
    'Apple TV Plus': 'https://tv.apple.com/search?term=',
    'Apple TV+': 'https://tv.apple.com/search?term=',
    'HBO Max': 'https://play.max.com/search?q=',
    'Max': 'https://play.max.com/search?q=',
    'Hulu': 'https://www.hulu.com/search?q=',
    'Paramount Plus': 'https://www.paramountplus.com/search/?q=',
    'Paramount+': 'https://www.paramountplus.com/search/?q=',
    'Peacock': 'https://www.peacocktv.com/watch/search?q=',
    'Mubi': 'https://mubi.com/tr/search?query=',
    'YouTube': 'https://www.youtube.com/results?search_query=',
    'YouTube Premium': 'https://www.youtube.com/results?search_query=',
    'Crunchyroll': 'https://www.crunchyroll.com/search?q=',

    // Turkey Platforms - Direct search links where available
    'GAIN': 'https://www.gain.tv/search?q=',
    'Gain': 'https://www.gain.tv/search?q=',
    'Exxen': 'https://www.exxen.com/tr/arama?q=',
    'BluTV': 'https://www.blutv.com/ara?q=',
    'blutv': 'https://www.blutv.com/ara?q=',
    'TOD': 'https://www.tod.tv/arama?query=',
    'TOD TV': 'https://www.tod.tv/arama?query=',
    'Tabii': 'https://www.tabii.com/tr/search?q=',
    'beIN CONNECT': 'https://www.beinconnect.com.tr/arama?query=',
    'Puhu TV': 'https://puhutv.com/arama?q=',
    'puhutv': 'https://puhutv.com/arama?q=',
    'TV+': 'https://www.tvplus.com.tr/arama?q=',
    'Tivibu': 'https://www.tivibu.com.tr/arama?q=',
    'Tivibu Go': 'https://www.tivibu.com.tr/arama?q=',
    'D-Smart GO': 'https://www.dsmart.com.tr/dsmartgo/arama?q=',
    'D-Smart': 'https://www.dsmart.com.tr/dsmartgo/arama?q=',
    'Dsmart GO': 'https://www.dsmart.com.tr/dsmartgo/arama?q=',
    'S Sport': 'https://www.ssport.com.tr/search?q=',
    'S Sport Plus': 'https://www.ssportplus.com/arama?q=',
    'S Sport+': 'https://www.ssportplus.com/arama?q=',

    // Rent/Buy Platforms
    'Google Play Movies': 'https://play.google.com/store/search?q=',
    'Google Play Movies & TV': 'https://play.google.com/store/search?q=',
    'Microsoft Store': 'https://www.microsoft.com/tr-tr/search/shop/movies-tv?q=',
    'Apple iTunes': 'https://tv.apple.com/search?term=',
    'iTunes': 'https://tv.apple.com/search?term=',
    'Vudu': 'https://www.vudu.com/content/movies/search?searchString=',
    'Amazon Video': 'https://www.amazon.com/s?k=',

    // Fallback for unknown platforms
    'default': 'https://www.google.com/search?q='
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
    loadTheme();
    loadAuth(); // Check user session
    loadLanguage();
    await detectUserRegion(); // Auto-detect user's region
    setupEventListeners();
    await loadHomePage();

    // Initialize Ne İzlesem (Discover) module
    initDiscoverModule();

    // Initial sync for Suggested section visibility
    updateSuggestedVisibility();
}

// ============================================
// NE İZLESEM (DISCOVER) MODULE
// ============================================

const DAILY_REC_KEY = 'lumi_daily_recommendation';
const DAILY_REC_CATEGORIES = [
    { list: 'popular', label: 'Popüler' },
    { list: 'top_rated', label: 'En İyiler' },
    { list: 'now_playing', label: 'Vizyondakiler' },
    { genres: [18, 10749], label: 'Klasik Drama' },
    { genres: [878, 28], label: 'Aksiyon & Bilim Kurgu' },
    { genres: [35, 14], label: 'Fantastik Komedi' }
];

function initDiscoverModule() {
    // Load Daily Recommendation
    loadDailyRecommendation();

    // Update timer every minute
    setInterval(updateDailyTimer, 60000);
    updateDailyTimer();

    // Set random poetic placeholder
    setRandomPlaceholder();

    // Mood chips toggle - support both legacy and new class names
    document.querySelectorAll('.mood-chip, .console-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('.mood-chip, .console-chip').forEach(c => {
                c.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Era chips toggle
    document.querySelectorAll('.era-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('.era-chip').forEach(c => {
                c.classList.remove('active');
            });
            this.classList.add('active');
        });
    });


    // Platform button toggle
    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const wasActive = this.classList.contains('active');
            if (wasActive) {
                this.classList.remove('active');
                this.style.background = 'var(--glass-bg)';
                this.style.border = '1px solid var(--glass-border)';
                this.style.opacity = '0.6';
            } else {
                this.classList.add('active');
                this.style.background = 'rgba(88,88,243,0.2)';
                this.style.border = '1px solid rgba(88,88,243,0.5)';
                this.style.opacity = '1';
            }
        });
    });

    // Select All Platforms
    document.getElementById('select-all-platforms')?.addEventListener('click', function () {
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.classList.add('active');
            btn.style.background = 'rgba(88,88,243,0.2)';
            btn.style.border = '1px solid rgba(88,88,243,0.5)';
            btn.style.opacity = '1';
        });
    });

    // Button handlers are attached via onclick attributes in HTML
    // No need for addEventListener here to avoid double execution
}

// AI Search Handler - Uses AIService with Gemini
async function handleAISearch() {
    const input = document.getElementById('ai-movie-input');
    const query = input?.value?.trim();

    if (!query || query.length < 3) {
        showToast('Lütfen ne tür bir film izlemek istediğini yaz.');
        return;
    }

    // Show loading state
    showToast('🤖 Gemini düşünüyor...');

    try {
        // Check if AIService is available
        if (window.AIService && typeof window.AIService.getRecommendations === 'function') {
            // Use real Gemini AI
            const results = await window.AIService.getRecommendations(query);

            if (results && results.length > 0) {
                displayDiscoverResultsView(results, 'ai');
                showToast(`✨ ${results.length} film önerisi bulundu!`);
            } else {
                showToast('Öneri bulunamadı, farklı bir şey deneyin.');
            }
        } else {
            // Fallback to keyword-based search
            console.warn('[handleAISearch] AIService not available, using fallback');
            const keywords = extractMovieKeywords(query);
            await showDiscoverResults({
                source: 'ai',
                query: query,
                keywords: keywords
            });
        }
    } catch (error) {
        console.error('[handleAISearch] Error:', error);
        showToast('Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));

        // Fallback on error
        const keywords = extractMovieKeywords(query);
        await showDiscoverResults({
            source: 'ai',
            query: query,
            keywords: keywords
        });
    }
}

// Wizard Search Handler - Uses mood/genre chips, era chips
async function handleWizardSearch() {
    // Get active mood chip - could have data-mood or data-genre
    const activeChip = document.querySelector('.mood-chip.active');
    const mood = activeChip?.dataset.mood || '';
    const genre = activeChip?.dataset.genre || '';

    // Get era from era chips
    const activeEra = document.querySelector('.era-chip.active');
    const era = activeEra?.dataset.era || '';

    showToast('Öneriler yükleniyor...');

    await showDiscoverResults({
        source: 'wizard',
        mood: mood,
        genre: genre,
        era: era
    });
}

// Surprise Me Handler - Random quality films
async function handleSurpriseMe() {
    showToast('Sürpriz hazırlanıyor! 🎲');

    await showDiscoverResults({
        source: 'surprise',
        random: true
    });
}

// Expose handlers to window for onclick
window.handleAISearch = handleAISearch;
window.handleWizardSearch = handleWizardSearch;
window.handleSurpriseMe = handleSurpriseMe;

// Random poetic placeholders for AI search textarea
const POETIC_PLACEHOLDERS = [
    "Sonu ağzımı açık bırakacak ama izlerken de içimi yumuşatacak bir film arıyorum...",
    "Uyumadan önce iç huzuru bulacağım bir dizi lazım...",
    "Beni hem güldürecek hem ağlatacak duygusal bir hikaye...",
    "Beynimin sınırlarını zorlayacak zihin bükücü bir film...",
    "Gerilim dolu ama sonunda rahatlatıcı bir son istiyorum...",
    "Saatlerce konuşacak bir hikaye ve unutulmaz karakterler...",
    "90'ların nostaljisini hissedeceğim klasik bir yapım...",
    "İzlerken zaman durmuş gibi hissedeceğim sinematik bir şaheser...",
    "Aşkı ve kaybı anlamlandıran derin bir anlatı arıyorum...",
    "Finali beni günlerce düşündürecek felsefi bir film...",
];

function setRandomPlaceholder() {
    const input = document.getElementById('ai-movie-input');
    if (input) {
        const randomIndex = Math.floor(Math.random() * POETIC_PLACEHOLDERS.length);
        input.placeholder = POETIC_PLACEHOLDERS[randomIndex];
    }
}

// Extract keywords from natural language query for TMDB
function extractMovieKeywords(query) {
    const lowerQuery = query.toLowerCase();
    const keywords = [];

    // Mood keywords
    if (lowerQuery.includes('komik') || lowerQuery.includes('güle') || lowerQuery.includes('eğlen')) keywords.push('comedy');
    if (lowerQuery.includes('korku') || lowerQuery.includes('geril') || lowerQuery.includes('korkun')) keywords.push('horror', 'thriller');
    if (lowerQuery.includes('aksiyon') || lowerQuery.includes('heyecan')) keywords.push('action');
    if (lowerQuery.includes('romantik') || lowerQuery.includes('aşk') || lowerQuery.includes('sevgi')) keywords.push('romance');
    if (lowerQuery.includes('dram') || lowerQuery.includes('ağla') || lowerQuery.includes('duygu')) keywords.push('drama');
    if (lowerQuery.includes('bilim') || lowerQuery.includes('uzay') || lowerQuery.includes('gelecek')) keywords.push('science fiction');
    if (lowerQuery.includes('animasyon') || lowerQuery.includes('çizgi')) keywords.push('animation');

    return keywords;
}

// Show Discover Results in a new view
async function showDiscoverResults(params) {
    // Build TMDB query based on params
    let url = `${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${state.language}&sort_by=popularity.desc&vote_count.gte=100`;

    // Add genre filter
    if (params.genre) {
        url += `&with_genres=${params.genre}`;
    } else if (params.mood) {
        const moodGenres = {
            chill: '35,10751',
            adrenaline: '28,53',
            tearjerker: '18,10749',
            mindbending: '878,9648',
            funny: '35,16'
        };
        if (moodGenres[params.mood]) {
            url += `&with_genres=${moodGenres[params.mood]}`;
        }
    }

    // Add era filter
    if (params.era) {
        const eraRanges = {
            'classic': { gte: '1920-01-01', lte: '1969-12-31' },
            '80s': { gte: '1980-01-01', lte: '1989-12-31' },
            '90s': { gte: '1990-01-01', lte: '1999-12-31' },
            '2000s': { gte: '2000-01-01', lte: '2009-12-31' },
            '2010s': { gte: '2010-01-01', lte: '2019-12-31' },
            '2020s': { gte: '2020-01-01', lte: '2029-12-31' }
        };
        if (eraRanges[params.era]) {
            url += `&primary_release_date.gte=${eraRanges[params.era].gte}&primary_release_date.lte=${eraRanges[params.era].lte}`;
        }
    }

    // For surprise, add randomness
    if (params.random) {
        url += `&page=${Math.floor(Math.random() * 5) + 1}&vote_average.gte=7`;
    }

    try {
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results && data.results.length > 0) {
            // Shuffle for variety if surprise
            let movies = data.results;
            if (params.random) {
                movies = movies.sort(() => Math.random() - 0.5);
            }

            // Display in home grid as results
            displayDiscoverResultsView(movies, params.source);
        } else {
            showToast('Bu kriterlere uygun film bulunamadı.');
        }
    } catch (error) {
        console.error('Discover results error:', error);
        showToast('Öneriler yüklenirken hata oluştu.');
    }
}

// Display discover results in wizard view (not home!)
function displayDiscoverResultsView(movies, source) {
    const sourceLabels = {
        'ai': '🤖 Senin İçin Öneriler',
        'wizard': '✨ Seçimlerine Göre',
        'surprise': '🎲 Sürpriz Seçimler'
    };

    const label = sourceLabels[source] || 'Öneriler';

    // Get wizard results container
    const resultsContainer = document.getElementById('wizard-results');
    const resultsTitle = document.getElementById('wizard-results-title');
    const resultsGrid = document.getElementById('wizard-results-grid');

    if (!resultsContainer || !resultsGrid) {
        console.error('Wizard results container not found');
        return;
    }

    // Set title and show container using active class for overlay style
    resultsTitle.textContent = label;
    resultsContainer.classList.add('active');
    resultsGrid.innerHTML = '';

    // Add movie cards
    movies.forEach(movie => {
        const posterUrl = movie.poster_path
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : 'https://via.placeholder.com/342x513?text=No+Poster';

        const card = document.createElement('div');
        card.className = 'discover-result-card';
        card.style.cssText = 'cursor: pointer; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.05); aspect-ratio: 2/3;';
        card.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%;">
                <img src="${posterUrl}" alt="${movie.title}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%);"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 8px;">
                    <div style="font-size: 11px; font-weight: 600; color: white; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.title}</div>
                    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                        <span style="color: #fbbf24; font-size: 10px;">⭐ ${movie.vote_average?.toFixed(1) || 'N/A'}</span>
                        <span style="color: rgba(255,255,255,0.5); font-size: 9px;">${movie.release_date?.substring(0, 4) || ''}</span>
                    </div>
                </div>
            </div>
        `;
        card.onclick = () => {
            openDetailModal(movie.id, 'movie');
        };
        resultsGrid.appendChild(card);
    });

    // Scroll to top of results
    resultsContainer.scrollTop = 0;
}

// Close wizard results - updated for overlay style
function closeWizardResults() {
    const resultsContainer = document.getElementById('wizard-results');
    if (resultsContainer) {
        resultsContainer.classList.remove('active');
    }
}

// Expose closeWizardResults globally
window.closeWizardResults = closeWizardResults;

async function loadDailyRecommendation() {
    const stored = localStorage.getItem(DAILY_REC_KEY);
    const today = new Date().toDateString();

    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today && data.movie) {
            renderDailyCard(data.movie, data.category);
            return;
        }
    }

    // Fetch new daily recommendation
    try {
        const dayOfWeek = new Date().getDay();
        const categoryIndex = dayOfWeek % DAILY_REC_CATEGORIES.length;
        const category = DAILY_REC_CATEGORIES[categoryIndex];

        let movies = [];
        if (category.list) {
            const resp = await fetch(`${API_URLS.TMDB_BASE}/movie/${category.list}?api_key=${CONFIG.TMDB_API_KEY}&language=${state.language}&page=1`);
            const data = await resp.json();
            movies = data.results || [];
        } else if (category.genres) {
            const genreStr = category.genres.join(',');
            const resp = await fetch(`${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${state.language}&with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await resp.json();
            movies = data.results || [];
        }

        if (movies.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(movies.length, 10));
            const selected = movies[randomIndex];

            localStorage.setItem(DAILY_REC_KEY, JSON.stringify({
                date: today,
                movie: selected,
                category: category.label
            }));

            renderDailyCard(selected, category.label);
        }
    } catch (error) {
        console.error('Daily recommendation error:', error);
    }
}

function renderDailyCard(movie, categoryLabel) {
    // Legacy elements
    const dailyCard = document.getElementById('daily-card');
    const dailyPoster = document.getElementById('daily-poster');
    const dailyTitle = document.getElementById('daily-title');
    const dailyMeta = document.getElementById('daily-meta');

    // New immersive discover elements
    const discoverBg = document.getElementById('discover-bg');
    const discoverHeroTitle = document.getElementById('discover-hero-title');
    const discoverHeroMeta = document.getElementById('discover-hero-meta');
    const heroImdbChip = document.getElementById('hero-imdb-chip');
    const heroTimerChip = document.getElementById('hero-timer-chip');
    const discoverTopInfo = document.getElementById('discover-top-info');

    if (!movie) return;

    // Save the movie ID for clicking on top info area
    if (discoverTopInfo) {
        discoverTopInfo.dataset.movieId = movie.id;
        discoverTopInfo.style.cursor = 'pointer';
    }

    const backdropUrl = movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : movie.poster_path
            ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
            : '';

    const posterUrl = movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
        : movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : '';

    // Update legacy banner elements (if they exist)
    if (dailyPoster) {
        dailyPoster.style.backgroundImage = posterUrl ? `url('${posterUrl}')` : '';
    }
    if (dailyTitle) {
        dailyTitle.textContent = movie.title || movie.name || 'Günün Filmi';
    }
    if (dailyMeta) {
        const year = movie.release_date?.substring(0, 4) || '';
        const rating = movie.vote_average?.toFixed(1) || '';
        dailyMeta.textContent = [year, rating ? `⭐ ${rating}` : '', categoryLabel].filter(Boolean).join(' • ');
    }
    if (dailyCard) {
        dailyCard.style.cursor = 'pointer';
        dailyCard.onclick = () => openDetailModal(movie.id, 'movie');
    }

    // Update NEW immersive discover elements
    if (discoverBg) {
        discoverBg.style.backgroundImage = backdropUrl ? `url('${backdropUrl}')` : '';
    }
    if (discoverHeroTitle) {
        discoverHeroTitle.textContent = movie.title || movie.name || 'Günün Filmi';
    }
    if (discoverHeroMeta) {
        const year = movie.release_date?.substring(0, 4) || '';
        const genres = movie.genre_ids?.slice(0, 2).map(id => getGenreName(id)).join(' • ') || categoryLabel;
        discoverHeroMeta.textContent = [genres, year].filter(Boolean).join(' • ');
    }
    if (heroImdbChip && movie.vote_average) {
        heroImdbChip.textContent = `IMDb ${movie.vote_average.toFixed(1)}`;
        heroImdbChip.style.display = 'inline-flex';
    }

    // Update timer in new layout
    updateDiscoverHeroTimer();
}

// Update timer for immersive discover hero
function updateDiscoverHeroTimer() {
    const timerEl = document.getElementById('daily-timer');
    const heroTimerChip = document.getElementById('hero-timer-chip');

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const timerText = `${hours}s ${minutes}dk`;

    if (timerEl) {
        timerEl.textContent = `Yeni öneri: ${timerText}`;
    }
    if (heroTimerChip) {
        heroTimerChip.textContent = `⏱ ${timerText}`;
    }
}

// Helper function to get genre name from ID
function getGenreName(genreId) {
    const genres = {
        28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi',
        80: 'Suç', 99: 'Belgesel', 18: 'Drama', 10751: 'Aile',
        14: 'Fantastik', 36: 'Tarih', 27: 'Korku', 10402: 'Müzik',
        9648: 'Gizem', 10749: 'Romantik', 878: 'Bilim Kurgu',
        10770: 'TV Film', 53: 'Gerilim', 10752: 'Savaş', 37: 'Western'
    };
    return genres[genreId] || '';
}

// Open daily recommendation detail (for clicking badge)
function openDailyRecommendation() {
    const discoverTopInfo = document.getElementById('discover-top-info');
    const movieId = discoverTopInfo?.dataset?.movieId;
    if (movieId) {
        openDetailModal(parseInt(movieId), 'movie');
    }
}
window.openDailyRecommendation = openDailyRecommendation;


function updateDailyTimer() {
    const timerEl = document.getElementById('daily-timer');
    if (!timerEl) return;

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    timerEl.textContent = `Yeni öneri: ${hours}s ${minutes}dk`;
}

async function loadRandomRecommendation() {
    const card = document.getElementById('recommendation-card');
    if (!card) return;

    card.innerHTML = '<div class="loading-state" style="display: flex; height: 100%;"><div class="spinner"></div></div>';

    try {
        const activeMood = document.querySelector('.mood-chip.active')?.dataset.mood || 'chill';
        const moodGenres = {
            chill: [35, 10751, 16],
            adrenaline: [28, 53, 12],
            tearjerker: [18, 10749],
            mindbending: [878, 9648, 53],
            funny: [35, 16]
        };

        const genres = moodGenres[activeMood] || [28, 35];
        const genreStr = genres.join(',');

        const resp = await fetch(`${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${state.language}&with_genres=${genreStr}&sort_by=popularity.desc&page=${Math.floor(Math.random() * 5) + 1}`);
        const data = await resp.json();

        if (data.results?.length > 0) {
            const movie = data.results[Math.floor(Math.random() * data.results.length)];
            const posterUrl = movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : 'https://via.placeholder.com/500x750?text=No+Poster';

            card.innerHTML = `
                <div style="position: absolute; inset: 0; background: url('${posterUrl}') center/cover;"></div>
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.6) 50%, transparent 100%);"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: var(--space-lg);">
                    <div style="display: inline-flex; align-items: center; gap: var(--space-xs); background: var(--primary); padding: 4px 12px; border-radius: 9999px; margin-bottom: var(--space-sm);">
                        <span class="material-symbols-outlined" style="font-size: 14px;">auto_awesome</span>
                        <span style="font-size: 0.75rem; font-weight: 600;">${Math.floor(Math.random() * 15 + 85)}% Uyum</span>
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 4px;">${movie.title}</h3>
                    <div style="display: flex; align-items: center; gap: var(--space-sm); color: var(--text-muted); font-size: 0.875rem; margin-bottom: var(--space-md);">
                        <span>⭐ ${movie.vote_average?.toFixed(1)}</span>
                        <span>•</span>
                        <span>${movie.release_date?.substring(0, 4)}</span>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.overview || ''}</p>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--space-sm); margin-top: var(--space-md);">
                        <button onclick="addToWatchlist(${movie.id})" style="padding: var(--space-sm); background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); color: white; cursor: pointer;">
                            <span class="material-symbols-outlined">add</span>
                        </button>
                        <button onclick="openDetailModal(${movie.id}, 'movie')" style="padding: var(--space-sm); background: white; border: none; border-radius: var(--radius-md); color: black; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: var(--space-xs);">
                            <span class="material-symbols-outlined">play_arrow</span>
                            Detaylar
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Random recommendation error:', error);
        card.innerHTML = '<div class="card-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;"><p style="color: var(--text-muted);">Öneri yüklenemedi</p></div>';
    }
}

// Auto-detect user's region for local content and platform providers
async function detectUserRegion() {
    // Check if region is already cached
    const cachedRegion = localStorage.getItem('detectedRegion');
    if (cachedRegion) {
        state.currentRegion = cachedRegion;
        console.log('Using cached region:', cachedRegion);
        return;
    }

    try {
        // Use ipapi.co for region detection (free, no API key needed for basic use)
        const response = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });

        if (response.ok) {
            const data = await response.json();
            if (data.country_code) {
                state.currentRegion = data.country_code;
                localStorage.setItem('detectedRegion', data.country_code);
                console.log('Detected region:', data.country_code);
                return;
            }
        }
    } catch (error) {
        console.warn('Region detection failed, using default:', error);
    }

    // Fallback to default region
    state.currentRegion = CONFIG.DEFAULT_COUNTRY || 'TR';
}

function loadLanguage() {
    // Load saved language preference
    i18n.loadLanguage();

    // Set UI select to match
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = i18n.currentLang;

        // Add change handler
        langSelect.addEventListener('change', (e) => {
            const newLang = e.target.value;
            i18n.setLanguage(newLang);
            i18n.updateTranslations();

            // Also update TMDB language
            state.currentLanguage = newLang === 'tr' ? 'tr-TR' : newLang === 'en' ? 'en-US' : `${newLang}-${newLang.toUpperCase()}`;

            // Reload content with new language
            loadHomePage();
        });
    }

    // Apply initial translations
    i18n.updateTranslations();
}

function loadAuth() {
    state.currentUser = window.AuthService.getCurrentUser();

    // Check localStorage for premium tier (set by purchase)
    const savedTier = localStorage.getItem('userTier');
    if (savedTier) {
        state.userTier = savedTier;
    } else if (state.currentUser) {
        state.userTier = state.currentUser.tier || 'free';
    } else {
        state.userTier = 'guest';
    }

    console.log('User loaded:', state.currentUser?.name, 'Tier:', state.userTier);
    updateAuthUI();
}

function updateAuthUI() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;

    if (state.currentUser) {
        // User is logged in - show avatar with dropdown
        const initial = state.currentUser.name?.charAt(0).toUpperCase() || '👤';
        const isPremium = state.userTier === 'premium';

        authArea.innerHTML = `
            <div class="user-menu-container">
                <button class="user-avatar-btn" id="user-menu-btn">
                    <span class="user-avatar">${initial}</span>
                    <span class="user-name-text">${state.currentUser.name?.split(' ')[0] || i18n.t('guest')}</span>
                    <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
                <div class="user-dropdown" id="user-dropdown">
                    <a href="#" class="dropdown-item" data-action="profile">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        ${i18n.t('sectionProfile')}
                    </a>
                    <a href="#" class="dropdown-item" data-action="favorites">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                        ${i18n.t('navFavorites')}
                    </a>
                    ${!isPremium ? `
                    <a href="#" class="dropdown-item premium-upgrade" data-action="upgrade">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Premium'a Yükselt
                    </a>
                    ` : ''}
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item logout" data-action="logout">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        ${i18n.t('logout')}
                    </a>
                </div>
            </div>
        `;

        // Toggle dropdown on avatar click
        const menuBtn = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-dropdown');

        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('visible');
            closeAllDropdowns(); // Close all dropdowns first
            if (!isOpen) {
                dropdown.classList.add('visible');
            }
        });

        // Handle dropdown item clicks
        dropdown?.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.remove('visible');

                const action = item.dataset.action;
                switch (action) {
                    case 'profile':
                        document.querySelector('.nav-item[data-page="profile"]')?.click();
                        break;
                    case 'favorites':
                        document.querySelector('.nav-item[data-page="favorites"]')?.click();
                        break;
                    case 'upgrade':
                        showPremiumModal();
                        break;
                    case 'logout':
                        handleLogout();
                        break;
                }
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown?.classList.remove('visible');
        });
    } else {
        // Guest - show login button with SVG icon
        authArea.innerHTML = `
            <button class="login-btn" id="login-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                ${i18n.t('login')}
            </button>
        `;
        document.getElementById('login-btn')?.addEventListener('click', openLoginModal);
    }
}

function openLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.add('visible');
}

function closeLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.remove('visible');
}

async function handleSocialLogin(provider) {
    const btn = document.querySelector(`.social-btn.${provider}`);
    if (btn) btn.textContent = 'Giriş yapılıyor...';

    try {
        const user = await window.AuthService.login(provider);
        if (user) {
            state.currentUser = user;
            state.userTier = user.tier;
            closeLoginModal();
            updateAuthUI();
            updateSuggestedVisibility();
            await loadHomePage();
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Giriş yapılamadı. Lütfen tekrar deneyin.');
    }
}

async function handleLogout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        try {
            await window.AuthService.logout();
            state.currentUser = null;
            state.userTier = 'guest';
            localStorage.removeItem('userTier');
            localStorage.removeItem('lumi_user');
            // Update UI without page reload
            updateAuthUI();
            updateProfileAuthUI();
            // Show success message
            showToast('Çıkış yapıldı');
        } catch (error) {
            console.error('Logout error:', error);
            // Still update UI
            state.currentUser = null;
            state.userTier = 'guest';
            updateAuthUI();
            updateProfileAuthUI();
        }
    }
}

// Tester Login - Free User
async function handleTesterLoginFree() {
    try {
        await window.AuthService.loginAsTesterFree();
        state.currentUser = window.AuthService.currentUser;
        state.userTier = 'free';
        updateAuthUI();
        updateProfileAuthUI();
        alert('Test Kullanıcı olarak giriş yapıldı!');
    } catch (error) {
        console.error('Tester login error:', error);
        alert('Giriş yapılamadı.');
    }
}

// Tester Login - Premium User
async function handleTesterLoginPremium() {
    try {
        await window.AuthService.loginAsTester();
        state.currentUser = window.AuthService.currentUser;
        state.userTier = 'premium';
        localStorage.setItem('userTier', 'premium');
        updateAuthUI();
        updateProfileAuthUI();
        alert('Test Premium olarak giriş yapıldı!');
    } catch (error) {
        console.error('Tester premium login error:', error);
        alert('Giriş yapılamadı.');
    }
}

// Update Profile Action Buttons based on Auth State (3 states: guest, free, premium)
function updateProfileAuthUI() {
    const guestButtons = document.getElementById('guest-buttons');
    const freeUserButtons = document.getElementById('free-user-buttons');
    const premiumUserButtons = document.getElementById('premium-user-buttons');

    // Hide all first
    if (guestButtons) guestButtons.style.display = 'none';
    if (freeUserButtons) freeUserButtons.style.display = 'none';
    if (premiumUserButtons) premiumUserButtons.style.display = 'none';

    const isLoggedIn = window.AuthService && window.AuthService.isLoggedIn();
    const isPremium = window.AuthService && window.AuthService.isPremium();

    if (!isLoggedIn) {
        // Guest state - show test login only
        if (guestButtons) guestButtons.style.display = 'block';
    } else if (isPremium) {
        // Premium user - show logout only
        if (premiumUserButtons) premiumUserButtons.style.display = 'block';
    } else {
        // Free user - show premium upgrade + logout
        if (freeUserButtons) freeUserButtons.style.display = 'block';
    }
}

// Listen for auth state changes
window.addEventListener('authStateChanged', function (e) {
    updateAuthUI();
    updateProfileAuthUI();
});

// ============================================
// LEGAL PAGES
// ============================================

function showLegalPage(type) {
    const content = {
        privacy: `
            <div class="legal-page">
                <h2>🔒 Gizlilik Politikası</h2>
                <p class="legal-date">Son Güncelleme: 28 Aralık 2024</p>
                
                <h3>1. Toplanan Veriler</h3>
                <p>Lumi uygulaması aşağıdaki verileri toplar ve işler:</p>
                <ul>
                    <li><strong>Kullanıcı Tercihleri:</strong> Tema seçimi, dil tercihi</li>
                    <li><strong>Favoriler:</strong> Kaydedilen film ve diziler (yerel depolama)</li>
                    <li><strong>Puanlamalar:</strong> Kullanıcının verdiği puanlar (yerel depolama)</li>
                    <li><strong>Konum Bilgisi:</strong> Sadece ülke tespiti için (API çağrıları)</li>
                </ul>
                
                <h3>2. Verilerin Kullanımı</h3>
                <p>Toplanan veriler şu amaçlarla kullanılır:</p>
                <ul>
                    <li>Kişiselleştirilmiş içerik önerileri</li>
                    <li>Ülkeye göre streaming platform bilgisi</li>
                    <li>Kullanıcı deneyiminin iyileştirilmesi</li>
                </ul>
                
                <h3>3. Üçüncü Taraf Hizmetler</h3>
                <p>Uygulamamız aşağıdaki üçüncü taraf API'leri kullanmaktadır:</p>
                <ul>
                    <li>TMDB (The Movie Database) - Film/dizi verileri</li>
                    <li>YouTube API - Video içerikleri</li>
                </ul>
                
                <h3>4. Yerel Depolama</h3>
                <p>Uygulama, kullanıcı tercihlerini saklamak için tarayıcı yerel depolamasını (localStorage) kullanır. Bu veriler cihazınızda saklanır ve sunucularımıza gönderilmez.</p>
                
                <h3>5. Kullanıcı Hakları (KVKK/GDPR)</h3>
                <ul>
                    <li>Verilerinize erişim hakkı</li>
                    <li>Verilerinizin düzeltilmesini isteme hakkı</li>
                    <li>Verilerinizin silinmesini isteme hakkı</li>
                    <li>Veri taşınabilirliği hakkı</li>
                </ul>
                
                <h3>6. İletişim</h3>
                <p>📧 <a href="mailto:privacy@lumi-app.com">privacy@lumi-app.com</a></p>
            </div>
        `,
        terms: `
            <div class="legal-page">
                <h2>📜 Kullanım Şartları</h2>
                <p class="legal-date">Son Güncelleme: 28 Aralık 2024</p>
                
                <h3>1. Hizmet Tanımı</h3>
                <p>Lumi (Where to Watch / Nerede İzlerim?), kullanıcıların film ve dizilerin hangi streaming platformlarında izlenebileceğini öğrenmelerini sağlayan bir keşif uygulamasıdır.</p>
                
                <h3>2. Kabul</h3>
                <p>Bu uygulamayı kullanarak, aşağıdaki şartları kabul etmiş sayılırsınız.</p>
                
                <h3>3. Kullanım Kuralları</h3>
                <ul>
                    <li>Uygulamayı yasal amaçlarla kullanmalısınız</li>
                    <li>Başkalarının haklarını ihlal etmemelisiniz</li>
                    <li>Uygulamanın güvenliğini tehlikeye atmamalısınız</li>
                </ul>
                
                <h3>4. Fikri Mülkiyet</h3>
                <p>Uygulama tasarımı ve kodu geliştiriciye aittir. Film/dizi posterleri ve bilgileri ilgili stüdyo ve API sağlayıcılarına aittir.</p>
                
                <h3>5. Sorumluluk Sınırlaması</h3>
                <p>Uygulama "olduğu gibi" sunulmaktadır. Streaming platform bilgilerinin doğruluğu garanti edilmez. Platform erişilebilirliği değişebilir.</p>
                
                <h3>6. Değişiklikler</h3>
                <p>Bu şartlar önceden haber verilmeksizin değiştirilebilir.</p>
                
                <h3>7. Uygulanacak Hukuk</h3>
                <p>Bu şartlar Türkiye Cumhuriyeti hukuku çerçevesinde yorumlanır.</p>
            </div>
        `
    };

    elements.modal.classList.add('visible');
    elements.modalBody.innerHTML = `
        <div class="legal-modal-content">
            ${content[type] || '<p>Sayfa bulunamadı.</p>'}
            <button class="legal-close-btn" onclick="closeModal()">Kapat</button>
        </div>
    `;
    document.body.style.overflow = 'hidden';
}

// ============================================
// THEME MANAGEMENT
// ============================================

function loadTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    state.currentTheme = saved;
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon();
}

function toggleTheme() {
    state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.currentTheme);
    localStorage.setItem('theme', state.currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle?.querySelector('.material-symbols-outlined');

    if (icon) {
        // Show moon when in dark mode (to switch to light), sun when in light mode (to switch to dark)
        icon.textContent = state.currentTheme === 'dark' ? 'dark_mode' : 'light_mode';
    }
    updateLogoForTheme();
}

// Update Lumi logo based on theme
function updateLogoForTheme() {
    const logo = document.getElementById('lumi-logo');
    if (logo) {
        logo.src = state.currentTheme === 'dark'
            ? 'assets/lumi-logo-dark.png'
            : 'assets/lumi-logo-light.png';
    }
}

// Update header section title based on current page
function updateHeaderTitle(page) {
    const titleEl = document.getElementById('header-section-title');
    if (!titleEl) return;

    const sectionMap = {
        'home': 'sectionHome',
        'discover': 'sectionDiscover',
        'favorites': 'sectionFavorites',
        'profile': 'sectionProfile'
    };

    const key = sectionMap[page] || 'sectionHome';
    titleEl.textContent = i18n.t(key);
}

// ============================================
// PREMIUM MODAL
// ============================================

function showPremiumModal() {
    const modalHtml = `
        <div class="premium-modal-overlay" id="premium-modal-overlay">
            <div class="premium-modal">
                <button class="premium-modal-close" onclick="closePremiumModal()">✕</button>
                <div class="premium-modal-content">
                    <div class="premium-icon">💎</div>
                    <h2>Premium'a Geç</h2>
                    <p class="premium-desc">Tüm özelliklere sınırsız erişim için Premium üye olun!</p>
                    
                    <div class="premium-features">
                        <div class="feature">🔔 Bildirim Sistemi</div>
                        <div class="feature">🤓 İlginç Bilgiler (Trivia)</div>
                        <div class="feature">⭐ Puanlama Sistemi</div>
                        <div class="feature">🚫 Reklamsız Deneyim</div>
                    </div>
                    
                    <div class="premium-pricing">
                        <div class="price-option">
                            <span class="price">₺29.99</span>
                            <span class="period">/ay</span>
                        </div>
                        <div class="price-option yearly">
                            <span class="badge">%40 İndirim</span>
                            <span class="price">₺199.99</span>
                            <span class="period">/yıl</span>
                        </div>
                    </div>
                    
                    <button class="premium-buy-btn" onclick="simulatePurchase()">
                        Premium'a Yükselt
                    </button>
                    <p class="premium-note">7 gün ücretsiz deneme - İstediğiniz zaman iptal edin</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePremiumModal() {
    const overlay = document.getElementById('premium-modal-overlay');
    if (overlay) overlay.remove();
}

function simulatePurchase() {
    state.userTier = 'premium';
    localStorage.setItem('userTier', 'premium');

    // Also update AuthService user if logged in
    if (window.AuthService && window.AuthService.currentUser) {
        window.AuthService.currentUser.tier = 'premium';
        window.AuthService.saveUser(window.AuthService.currentUser);
    }

    closePremiumModal();
    alert('Tebrikler! Artık Premium üyesiniz! 🎉');

    // Reload current view to reflect changes
    if (state.currentPage === 'profile') {
        loadProfilePage();
    }

    // Update auth UI
    updateAuthUI();

    // If in detail modal, update the notify button immediately
    const notifyBtn = document.getElementById('notify-btn');
    if (notifyBtn) {
        notifyBtn.classList.remove('locked');
        notifyBtn.disabled = false;
        notifyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Haber Ver';
    }
}

// ============================================
// LANGUAGE & REGION MANAGEMENT
// ============================================

// Language = UI translation + TMDB data language
// Region = Auto-detected location for platforms (stays constant unless manually changed)

function loadLanguage() {
    // Check if user has a saved language preference
    const saved = localStorage.getItem('language');

    if (saved) {
        applyLanguage(saved);
        return;
    }

    // Auto-detect from browser on first visit
    const browserLang = navigator.language || navigator.userLanguage || 'tr';
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Map to supported languages
    const supported = ['tr', 'en', 'de', 'fr', 'es', 'ja', 'zh', 'ko'];
    const detected = supported.includes(langCode) ? langCode : 'tr';

    applyLanguage(detected);
}

// Apply language for UI and TMDB data - does NOT change region
function applyLanguage(langCode) {
    const langConfig = LANGUAGE_REGIONS[langCode] || LANGUAGE_REGIONS['tr'];

    state.currentLanguageCode = langCode;
    state.currentLanguage = langConfig.lang; // For TMDB API calls

    // DO NOT change region here - region is auto-detected separately
    // state.currentRegion stays as detected by detectUserRegion()

    localStorage.setItem('language', langCode);

    // Update custom flag dropdown
    const langToFlag = {
        'tr': 'tr', 'en': 'us', 'de': 'de', 'fr': 'fr',
        'es': 'es', 'ja': 'jp', 'zh': 'cn', 'ko': 'kr'
    };
    const currentLangFlag = document.getElementById('current-lang-flag');
    if (currentLangFlag) {
        currentLangFlag.src = `https://flagcdn.com/w40/${langToFlag[langCode] || 'tr'}.png`;
    }

    // Update i18n and apply translations
    if (window.i18n) {
        i18n.setLanguage(langCode);
        i18n.updateTranslations();
    }

    // Update auth UI to reflect new language (login button, dropdown menu)
    updateAuthUI();
}

function handleLanguageChange(langCode) {
    applyLanguage(langCode);

    // Reload current page with new language for TMDB data
    if (state.currentPage === 'home') {
        loadHomePage();
    } else if (state.currentPage === 'discover') {
        loadDiscoverPage();
    }
    // Favorites and Profile don't need reload - translations applied via i18n.updateTranslations()
}

// ============================================
// CLOSE ALL DROPDOWNS
// ============================================
function closeAllDropdowns() {
    // Close language dropdown
    const langDropdownMenu = document.getElementById('lang-dropdown-menu');
    if (langDropdownMenu) langDropdownMenu.classList.remove('visible');

    // Close notification dropdown
    const notificationDropdown = document.getElementById('notification-dropdown');
    if (notificationDropdown) notificationDropdown.classList.remove('visible');

    // Close user dropdown
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.remove('visible');
}

// Expose to window for use in other scripts
window.closeAllDropdowns = closeAllDropdowns;

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Custom Language Dropdown
    const langDropdownBtn = document.getElementById('lang-dropdown-btn');
    const langDropdownMenu = document.getElementById('lang-dropdown-menu');
    const currentLangFlag = document.getElementById('current-lang-flag');

    if (langDropdownBtn && langDropdownMenu) {
        // Toggle dropdown
        langDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = langDropdownMenu.classList.contains('visible');
            closeAllDropdowns();
            if (!isOpen) {
                langDropdownMenu.classList.add('visible');
            }
        });

        // Language option click
        langDropdownMenu.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', () => {
                const langCode = option.dataset.lang;
                const flagImg = option.querySelector('.lang-flag');

                // Update current flag
                if (currentLangFlag && flagImg) {
                    currentLangFlag.src = flagImg.src;
                }

                // Close dropdown
                langDropdownMenu.classList.remove('visible');

                // Apply language change
                handleLanguageChange(langCode);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            langDropdownMenu.classList.remove('visible');
        });
    }

    // Logo click - go home
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            // Reset header section title
            const headerTitle = document.getElementById('header-section-title');
            if (headerTitle) {
                const homeText = window.i18n?.t('sectionHome') || 'Nerede İzlerim?';
                headerTitle.textContent = homeText;
            }
            // Reset nav items
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector('.nav-item[data-page="home"]')?.classList.add('active');
            state.currentPage = 'home';
            loadHomePage();
        });
    }

    // Slider Scroll Logic (Arrows Visibility)
    document.querySelectorAll('.slider-container').forEach(container => {
        const slider = container.querySelector('.movie-slider');
        const leftArrow = container.querySelector('.slider-arrow-left');
        const rightArrow = container.querySelector('.slider-arrow-right');

        if (slider && leftArrow && rightArrow) {
            // Initial check
            updateArrowVisibility(slider, leftArrow, rightArrow);

            // On scroll
            slider.addEventListener('scroll', () => {
                updateArrowVisibility(slider, leftArrow, rightArrow);
            });
        }
    });

    // Search - NOTE: Autocomplete is now handled in index.html with debounce
    // This listener only handles the clear button visibility
    elements.searchInput.addEventListener('input', (e) => {
        // Show/hide clear button
        if (elements.searchClear) {
            elements.searchClear.style.display = e.target.value ? 'block' : 'none';
        }
    });
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideAutocomplete();
            handleSearch();
            elements.searchInput.blur(); // Hide keyboard on mobile
        }
    });

    // Search clear button
    if (elements.searchClear) {
        elements.searchClear.addEventListener('click', () => {
            // Skip if search restore is active (modal just closed)
            const timeSinceRestore = Date.now() - state.searchRestoreTime;
            if (state.skipNextHomePage || timeSinceRestore < 500) {
                console.log('Skipping searchClear click - search restore active');
                state.skipNextHomePage = false;
                return;
            }
            elements.searchInput.value = '';
            elements.searchClear.style.display = 'none';
            hideAutocomplete();
            loadHomePage();
        });
    }

    // Hide autocomplete on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            hideAutocomplete();
        }
    });

    // Modal - stop propagation to prevent triggering other click handlers
    elements.modalClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            e.stopPropagation();
            closeModal();
        }
    });

    // Modal Dynamic Actions (Delegation)
    elements.modalBody.addEventListener('click', async (e) => {
        // Upgrade Button
        if (e.target.matches('.upgrade-btn')) {
            if (window.AuthService) {
                e.target.textContent = 'Yükseltiliyor...';
                await window.AuthService.upgradeToPremium();
                window.location.reload(); // Reload to reflect changes
            }
        }

        // Notify Button
        if (e.target.closest('.notify-btn')) {
            const btn = e.target.closest('.notify-btn');
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                btn.innerHTML = '🔕 Bildirimi Kapat';
                // Mock add alarm
            } else {
                btn.innerHTML = '🔔 Bildirim Al';
            }
        }
    });

    elements.modalBody.addEventListener('input', (e) => {
        // User Rating Slider
        if (e.target.id === 'user-rating') {
            const valSpan = document.getElementById('user-rating-val');
            if (valSpan) {
                valSpan.textContent = e.target.value;
                valSpan.style.color = 'var(--primary)';
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAutocomplete();
            closeModal();
            closeLoginModal();
        }
    });

    // Login Modal
    const loginModalClose = document.getElementById('login-modal-close');
    if (loginModalClose) {
        loginModalClose.addEventListener('click', closeLoginModal);
    }

    // Social login buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            if (provider) handleSocialLogin(provider);
        });
    });

    // Login modal backdrop click
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLoginModal();
        });
    }

    // View All buttons
    document.querySelectorAll('.view-all-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            showAllSection(section);
        });
    });

    // Bottom Navigation
    setupBottomNav();
}

function setupBottomNav() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const page = item.dataset.page;
            state.currentPage = page;

            // Update header section title
            updateHeaderTitle(page);

            switch (page) {
                case 'home':
                    loadHomePage();
                    break;
                case 'discover':
                    loadDiscoverPage();
                    break;
                case 'wizard':
                    loadWizardPage();
                    break;
                case 'favorites':
                    loadFavoritesPage();
                    break;
                case 'profile':
                    loadProfilePage();
                    break;
            }
        });
    });
}

// ============================================
// PAGE LOADERS
// ============================================

function hideAllSections() {
    elements.trendingSection.style.display = 'none';
    elements.newReleasesSection.style.display = 'none';
    elements.searchResultsSection.style.display = 'none';
    elements.discoverSection.style.display = 'none';
    elements.favoritesSection.style.display = 'none';
    elements.profileSection.style.display = 'none';
    elements.noResults.classList.remove('visible');

    // Also hide classics and suggested on non-home pages
    if (elements.classicsSection) elements.classicsSection.style.display = 'none';
    if (elements.suggestedSection) elements.suggestedSection.style.display = 'none';
}

// ============================================
// SHOW ALL SECTION - Infinite Scroll
// ============================================
let currentViewAllSection = null;
let currentViewAllPage = 1;
let isLoadingMore = false;

async function showAllSection(sectionType) {
    currentViewAllSection = sectionType;
    currentViewAllPage = 1;

    // Switch to search results view
    hideAllSections();
    elements.searchResultsSection.style.display = 'block';

    // Set title with back button
    const titles = {
        'trending': 'Popüler İçerikler',
        'new-releases': 'Yeni Çıkanlar',
        'classics': 'Klasikler',
        'suggested': 'Sizin İçin Önerilenler'
    };

    // Add back button to header
    const sectionHeader = elements.searchResultsSection.querySelector('.section-header');
    if (sectionHeader) {
        sectionHeader.innerHTML = `
            <h2 class="section-title" id="results-title">${titles[sectionType] || 'Tümü'}</h2>
            <span class="results-count" id="results-count"></span>
            <button class="back-btn" id="view-all-back-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Geri
            </button>
        `;

        // Add back button event
        document.getElementById('view-all-back-btn')?.addEventListener('click', () => {
            currentViewAllSection = null;
            window.removeEventListener('scroll', handleInfiniteScroll);
            loadHomePage();
        });
    }

    // Clear and load first page
    elements.resultsGrid.innerHTML = '';
    showLoading();
    await loadMoreViewAll();
    hideLoading();

    // Setup infinite scroll
    setupInfiniteScroll();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadMoreViewAll() {
    if (isLoadingMore || !currentViewAllSection) return;
    isLoadingMore = true;

    try {
        let data;
        const lang = state.currentLanguage;
        const page = currentViewAllPage;

        switch (currentViewAllSection) {
            case 'trending':
                data = await API.fetchTMDB(`/trending/all/week?language=${lang}&page=${page}`);
                break;
            case 'new-releases':
                data = await API.fetchTMDB(`/movie/now_playing?language=${lang}&page=${page}`);
                break;
            case 'classics':
                data = await API.fetchTMDB(`/discover/movie?language=${lang}&primary_release_date.lte=2000-12-31&sort_by=vote_average.desc&vote_count.gte=500&page=${page}`);
                break;
            case 'suggested':
                // For suggested, we'll use the smart algorithm for page 1, then popular for more
                if (page === 1 && state.userTier !== 'guest') {
                    const smartResults = await generateSmartSuggestions();
                    data = { results: smartResults };
                } else {
                    data = await API.fetchTMDB(`/trending/all/week?language=${lang}&page=${page}`);
                }
                break;
        }

        const results = data.results || [];
        results.forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.resultsGrid.appendChild(card);
        });

        elements.resultsCount.textContent = `${elements.resultsGrid.children.length} sonuç`;
        currentViewAllPage++;

    } catch (error) {
        console.error('Load more error:', error);
    }

    isLoadingMore = false;
}

function setupInfiniteScroll() {
    // Remove previous listener if exists
    window.removeEventListener('scroll', handleInfiniteScroll);
    window.addEventListener('scroll', handleInfiniteScroll);
}

function handleInfiniteScroll() {
    if (!currentViewAllSection) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 500;

    if (scrollPosition >= threshold && !isLoadingMore) {
        loadMoreViewAll();
    }
}

// ============================================
// SMART SUGGESTIONS FOR "SIZE ÖZEL"
// ============================================
async function generateSmartSuggestions() {
    try {
        // Get user's favorites and watchlist
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const watchlist = window.NotificationService?.getWatchlist() || [];

        // Analyze genres from favorites and watchlist
        const genreCounts = {};
        const allUserItems = [...favorites, ...watchlist];

        // If user has data, analyze it
        if (allUserItems.length > 0) {
            // Fetch details for a sample of items to get genres
            const sampleSize = Math.min(10, allUserItems.length);
            const sampleItems = allUserItems.slice(0, sampleSize);

            for (const item of sampleItems) {
                try {
                    const details = await API.getDetails(item.id, item.type, state.currentLanguage);
                    if (details.genres) {
                        details.genres.forEach(g => {
                            genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
                        });
                    }
                } catch (err) {
                    console.log('Failed to fetch genre for item:', item.id);
                }
            }
        }

        // Get top 3 genres
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);

        let results = [];

        // If we have genre preferences, use them
        if (topGenres.length > 0) {
            const genreQuery = topGenres.join(',');

            // Get mixed movie + TV recommendations based on user's favorite genres
            const [movieRecs, tvRecs] = await Promise.all([
                API.fetchTMDB(`/discover/movie?language=${state.currentLanguage}&with_genres=${genreQuery}&sort_by=vote_average.desc&vote_count.gte=100`),
                API.fetchTMDB(`/discover/tv?language=${state.currentLanguage}&with_genres=${genreQuery}&sort_by=vote_average.desc&vote_count.gte=50`)
            ]);

            // Mix movies and TV shows
            const movieResults = (movieRecs.results || []).map(m => ({ ...m, media_type: 'movie' }));
            const tvResults = (tvRecs.results || []).map(t => ({ ...t, media_type: 'tv' }));
            results = [...movieResults.slice(0, 15), ...tvResults.slice(0, 15)];

            // Shuffle for variety
            results = results.sort(() => Math.random() - 0.5);
        }
        // If no data, use popular + local content strategy
        else {
            const localLang = state.currentRegion === 'TR' ? 'tr' : (state.currentRegion === 'US' ? 'en' : state.currentLanguageCode);

            const [popular, localContent] = await Promise.all([
                // Popular mixed (movies + tv)
                API.fetchTMDB(`/trending/all/week?language=${state.currentLanguage}`),
                // Local content with high ratings
                API.fetchTMDB(`/discover/movie?language=${state.currentLanguage}&with_original_language=${localLang}&sort_by=vote_average.desc&vote_count.gte=50`)
            ]);

            const popularResults = (popular.results || []).slice(0, 25);
            const localResults = (localContent.results || []).slice(0, 10).map(m => ({ ...m, media_type: 'movie' }));

            // Mix: 70% popular, 30% local
            results = [];
            for (let i = 0; i < 30; i++) {
                if (i % 3 === 2 && localResults.length > 0) {
                    results.push(localResults.shift());
                } else if (popularResults.length > 0) {
                    results.push(popularResults.shift());
                }
            }
        }

        return results.slice(0, 50);

    } catch (error) {
        console.error('Smart suggestions error:', error);
        // Fallback: return top rated
        const fallback = await API.fetchTMDB(`/movie/top_rated?language=${state.currentLanguage}`);
        return (fallback.results || []).map(m => ({ ...m, media_type: 'movie' }));
    }
}

async function loadHomePage() {
    // Check if we should skip this call (after search restore)
    // Use both flag and timestamp for robust protection
    const timeSinceRestore = Date.now() - state.searchRestoreTime;
    if (state.skipNextHomePage || timeSinceRestore < 500) {
        console.log('Skipping loadHomePage - search restore active, time since restore:', timeSinceRestore);
        state.skipNextHomePage = false;
        return;
    }

    hideAllSections();
    elements.searchInput.value = '';
    elements.trendingSection.style.display = 'block';
    elements.newReleasesSection.style.display = 'block';
    elements.classicsSection.style.display = 'block';
    showLoading();

    try {
        // Map region to original language for local content
        // Region is auto-detected, separate from UI language
        const regionToLanguageMap = {
            'TR': 'tr',  // Turkey
            'US': 'en',  // USA
            'GB': 'en',  // UK
            'DE': 'de',  // Germany
            'FR': 'fr',  // France
            'ES': 'es',  // Spain
            'IT': 'it',  // Italy
            'JP': 'ja',  // Japan
            'CN': 'zh',  // China
            'KR': 'ko',  // Korea
            'IN': 'hi',  // India
            'BR': 'pt',  // Brazil
            'MX': 'es',  // Mexico
            'RU': 'ru',  // Russia
            'AR': 'es',  // Argentina
            'NL': 'nl',  // Netherlands
            'SE': 'sv',  // Sweden
            'NO': 'no',  // Norway
            'DK': 'da',  // Denmark
            'PL': 'pl'   // Poland
        };
        const localLang = regionToLanguageMap[state.currentRegion] || 'en';
        console.log('Loading local content for region:', state.currentRegion, '-> language:', localLang);

        const promises = [
            // Fetch 3 pages of trending (60 items total)
            API.fetchTMDB(`/trending/all/week?language=${state.currentLanguage}&page=1`),
            API.fetchTMDB(`/trending/all/week?language=${state.currentLanguage}&page=2`),
            API.fetchTMDB(`/trending/all/week?language=${state.currentLanguage}&page=3`),
            // Fetch 3 pages of new releases (60 items total)
            API.fetchTMDB(`/movie/now_playing?language=${state.currentLanguage}&page=1`),
            API.fetchTMDB(`/movie/now_playing?language=${state.currentLanguage}&page=2`),
            API.fetchTMDB(`/movie/now_playing?language=${state.currentLanguage}&page=3`),
            API.getClassics(state.currentLanguage),
            // Fetch local content based on user's auto-detected REGION
            API.fetchTMDB(`/discover/movie?language=${state.currentLanguage}&with_original_language=${localLang}&sort_by=popularity.desc`),
            API.fetchTMDB(`/discover/tv?language=${state.currentLanguage}&with_original_language=${localLang}&sort_by=popularity.desc`)
        ];

        // Fetch smart suggestions if user is logged in
        let suggestedResults = [];
        if (state.userTier !== 'guest') {
            suggestedResults = await generateSmartSuggestions();
        }

        const results = await Promise.all(promises);

        // Combine trending pages
        const trendingResults = [
            ...(results[0].results || []),
            ...(results[1].results || []),
            ...(results[2].results || [])
        ];

        // Combine new releases pages
        const newReleasesResults = [
            ...(results[3].results || []),
            ...(results[4].results || []),
            ...(results[5].results || [])
        ];

        const classics = results[6];
        const localMovies = results[7];
        const localTv = results[8];

        hideLoading();

        // Mix MORE local content into trending (15 local items total)
        const localMoviesList = (localMovies.results || []).slice(0, 8);
        const localTvList = (localTv.results || []).slice(0, 7);
        const allLocalContent = [...localMoviesList, ...localTvList];

        const mixedTrending = [...trendingResults];
        // Insert local content at every 3rd position for better distribution
        allLocalContent.forEach((item, i) => {
            const insertPos = 3 + (i * 3); // positions 3, 6, 9, 12, 15...
            if (insertPos < mixedTrending.length + allLocalContent.length) {
                mixedTrending.splice(insertPos, 0, { ...item, media_type: item.first_air_date ? 'tv' : 'movie' });
            }
        });

        // Display trending (with local content mixed in) - 20 items
        elements.trendingSlider.innerHTML = '';
        mixedTrending.slice(0, 20).forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.trendingSlider.appendChild(card);
        });

        // Display new releases (with local content mixed in) - 20 items
        elements.newReleasesSlider.innerHTML = '';
        const mixedNewReleases = [...newReleasesResults];
        // Add local movies to new releases at various positions
        localMoviesList.slice(0, 3).forEach((item, i) => {
            const insertPos = 4 + (i * 4);
            if (insertPos < mixedNewReleases.length + 3) {
                mixedNewReleases.splice(insertPos, 0, { ...item, media_type: 'movie' });
            }
        });
        mixedNewReleases.slice(0, 20).forEach(item => {
            const card = createMovieCard({ ...item, media_type: 'movie' }, 'movie');
            elements.newReleasesSlider.appendChild(card);
        });

        // Display classics - 20 items
        if (elements.classicsSlider) {
            elements.classicsSlider.innerHTML = '';
            (classics.results || []).slice(0, 20).forEach(item => {
                const card = createMovieCard({ ...item, media_type: 'movie' }, 'movie');
                elements.classicsSlider.appendChild(card);
            });
        }

        // Display suggested if available (members only) - 20 items
        if (suggestedResults.length > 0 && elements.suggestedSlider) {
            elements.suggestedSlider.innerHTML = '';
            suggestedResults.slice(0, 20).forEach(item => {
                const card = createMovieCard(item, item.media_type || 'movie');
                elements.suggestedSlider.appendChild(card);
            });
        }

        // Update visibility and order based on user tier
        updateSuggestedVisibility();

    } catch (e) {
        hideLoading();
        console.error('Failed to load home page:', e);
    }
}

// Ne İzlesem Filter State
const neIzlesemFilters = {
    type: 'all',
    style: 'popular',
    genres: [],
    platforms: [],
    era: '',
    page: 1
};

async function loadDiscoverPage() {
    hideAllSections();
    elements.discoverSection.style.display = 'block';
    state.currentPage = 'discover';

    // Hide results initially
    const results = document.getElementById('neizlesem-results');
    if (results) results.style.display = 'none';

    // Setup wizard event handlers (only once)
    if (!state.neizlesemSetup) {
        setupNeIzlesemWizard();
        setupNeIzlesemNewUI();
        state.neizlesemSetup = true;
    }

    // Load featured recommendation card
    loadFeaturedRecommendation();
}

// Setup new UI elements (mood prompt, dropdowns, etc.)
function setupNeIzlesemNewUI() {
    // Mood Prompt Card - opens modal
    const moodPromptTrigger = document.getElementById('mood-prompt-trigger');
    const moodModal = document.getElementById('mood-modal');
    const moodModalClose = document.getElementById('mood-modal-close');
    const moodSubmitBtn = document.getElementById('mood-submit-btn');

    if (moodPromptTrigger && moodModal) {
        moodPromptTrigger.addEventListener('click', () => {
            moodModal.classList.add('visible');
        });
    }

    if (moodModalClose && moodModal) {
        moodModalClose.addEventListener('click', () => {
            moodModal.classList.remove('visible');
        });

        // Close on backdrop click
        moodModal.addEventListener('click', (e) => {
            if (e.target === moodModal) {
                moodModal.classList.remove('visible');
            }
        });
    }

    if (moodSubmitBtn) {
        moodSubmitBtn.addEventListener('click', () => {
            const moodText = document.getElementById('mood-textarea')?.value;
            if (moodText && moodText.trim()) {
                // TODO: AI-based recommendation based on mood text
                console.log('Mood text:', moodText);
            }
            moodModal?.classList.remove('visible');
            // Trigger generation with current filters
            neIzlesemFilters.page = 1;
            generateNeIzlesemResults(false);
        });
    }

    // Type Toggle Buttons (new style)
    document.querySelectorAll('.type-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            neIzlesemFilters.type = btn.dataset.value;
        });
    });

    // Filter Dropdowns
    setupFilterDropdowns();

    // Öneride Bulun button
    const recommendBtn = document.getElementById('recommend-btn');
    if (recommendBtn) {
        recommendBtn.addEventListener('click', () => {
            neIzlesemFilters.page = 1;
            generateNeIzlesemResults(false);
        });
    }

    // Sürpriz Yap button (new UI) - always mixed
    const surpriseBtn = document.getElementById('surprise-btn');
    if (surpriseBtn) {
        surpriseBtn.addEventListener('click', () => {
            // Random selection - mixed movies and TV shows
            neIzlesemFilters.style = 'random';
            neIzlesemFilters.type = 'all'; // Karışık - hem film hem dizi
            neIzlesemFilters.genres = [];
            neIzlesemFilters.platforms = [];
            neIzlesemFilters.era = '';
            neIzlesemFilters.page = 1;

            // Activate "Karışık" toggle button
            document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.type-toggle-btn[data-value="all"]')?.classList.add('active');

            generateNeIzlesemResults(false);
        });
    }
}

// Setup filter dropdown toggles and selection
function setupFilterDropdowns() {
    const dropdownWrappers = document.querySelectorAll('.filter-dropdown-wrapper');

    dropdownWrappers.forEach(wrapper => {
        const btn = wrapper.querySelector('.filter-dropdown');
        const menu = wrapper.querySelector('.filter-dropdown-menu');

        if (btn && menu) {
            // Toggle dropdown on click
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close other dropdowns
                document.querySelectorAll('.filter-dropdown-menu.visible').forEach(m => {
                    if (m !== menu) m.classList.remove('visible');
                });
                document.querySelectorAll('.filter-dropdown.open').forEach(b => {
                    if (b !== btn) b.classList.remove('open');
                });

                btn.classList.toggle('open');
                menu.classList.toggle('visible');
            });

            // Option selection
            menu.querySelectorAll('.filter-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const value = option.dataset.value;
                    const filterType = btn.dataset.filter;

                    // Update button label
                    const label = btn.querySelector('.filter-label');
                    if (label) {
                        label.textContent = option.textContent;
                    }

                    // Mark as selected
                    menu.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');

                    // Update filters based on type
                    if (filterType === 'genre' && value) {
                        neIzlesemFilters.genres = [value];
                    } else if (filterType === 'platform') {
                        neIzlesemFilters.platforms = value === 'all' ? [] : [value];
                    } else if (filterType === 'era') {
                        neIzlesemFilters.era = value;
                    } else if (filterType === 'mood') {
                        neIzlesemFilters.style = value;
                    }

                    // Close dropdown
                    btn.classList.remove('open');
                    menu.classList.remove('visible');
                });
            });
        }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.filter-dropdown-menu.visible').forEach(m => m.classList.remove('visible'));
        document.querySelectorAll('.filter-dropdown.open').forEach(b => b.classList.remove('open'));
    });
}

// Load featured recommendation card with trending content - cached for 24 hours
async function loadFeaturedRecommendation() {
    const featuredCard = document.getElementById('featured-recommendation-card');
    if (!featuredCard) return;

    try {
        const lang = state.currentLanguage;

        // Check for cached recommendation (24 hour cache)
        const cached = localStorage.getItem('dailyRecommendation');
        const cacheTimestamp = localStorage.getItem('dailyRecommendationTime');
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;

        let item;

        // Use cache if valid (less than 24 hours old and same day)
        if (cached && cacheTimestamp) {
            const cacheDate = new Date(parseInt(cacheTimestamp));
            const today = new Date();
            const isSameDay = cacheDate.toDateString() === today.toDateString();

            if (isSameDay) {
                item = JSON.parse(cached);
            }
        }

        // Fetch new if no valid cache
        if (!item) {
            const response = await fetch(
                `https://api.themoviedb.org/3/trending/all/day?api_key=${CONFIG.TMDB_API_KEY}&language=${lang}`
            );

            if (!response.ok) throw new Error('Failed to fetch trending');

            const data = await response.json();
            const items = data.results || [];

            if (items.length === 0) {
                featuredCard.innerHTML = '<div class="featured-loading"><p>İçerik bulunamadı</p></div>';
                return;
            }

            // Pick a random item from top 10 and cache it
            item = items[Math.floor(Math.random() * Math.min(10, items.length))];
            localStorage.setItem('dailyRecommendation', JSON.stringify(item));
            localStorage.setItem('dailyRecommendationTime', now.toString());
        }

        const title = item.title || item.name || 'Bilinmeyen';
        const overview = item.overview || '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const backdropUrl = item.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
            : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null);
        const mediaType = item.media_type || 'movie';
        const itemId = item.id;

        featuredCard.innerHTML = `
            <div class="featured-card-image" style="background-image: url('${backdropUrl || ''}')"></div>
            <div class="featured-card-overlay"></div>
            <div class="featured-card-content">
                <div class="featured-badges">
                    <span class="featured-badge-new">GÜNÜN SEÇİMİ</span>
                    <div class="featured-rating">
                        <span class="featured-rating-star">⭐</span>
                        <span>${rating}</span>
                    </div>
                </div>
                <h3 class="featured-card-title">${title}</h3>
                <p class="featured-card-desc">${overview}</p>
                <div class="featured-card-actions">
                    <button class="featured-watch-btn" data-id="${itemId}" data-type="${mediaType}">
                        <span>▶</span>
                        <span>Detayları Gör</span>
                    </button>
                    <button class="featured-fav-btn" data-id="${itemId}" data-type="${mediaType}" data-title="${title}">
                        <span>♡</span>
                    </button>
                    <button class="featured-add-btn" data-id="${itemId}" data-type="${mediaType}" data-title="${title}">
                        <span>+</span>
                    </button>
                </div>
            </div>
        `;

        // Watch button clicks
        const watchBtn = featuredCard.querySelector('.featured-watch-btn');
        if (watchBtn) {
            watchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDetail(watchBtn.dataset.id, watchBtn.dataset.type);
            });
        }

        // Fav button (heart) - add to liked items
        const favBtn = featuredCard.querySelector('.featured-fav-btn');
        if (favBtn) {
            // Check initial state
            const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
            const isLiked = likedItems.some(i => i.id === itemId);
            if (isLiked) {
                favBtn.querySelector('span').textContent = '♥';
                favBtn.classList.add('active');
            }

            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let items = JSON.parse(localStorage.getItem('liked_items') || '[]');
                const existingIdx = items.findIndex(i => i.id === itemId);
                const heartSpan = favBtn.querySelector('span');

                if (existingIdx >= 0) {
                    items.splice(existingIdx, 1);
                    heartSpan.textContent = '♡';
                    favBtn.classList.remove('active');
                } else {
                    items.push({ id: itemId, type: mediaType, title, poster_path: item.poster_path, addedAt: Date.now() });
                    heartSpan.textContent = '♥';
                    favBtn.classList.add('active');
                }
                localStorage.setItem('liked_items', JSON.stringify(items));
            });
        }

        // Add to watchlist button (+)
        const addBtn = featuredCard.querySelector('.featured-add-btn');
        if (addBtn) {
            // Check initial state
            const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
            const isInWatchlist = watchlistItems.some(i => i.id === itemId);
            if (isInWatchlist) {
                addBtn.querySelector('span').textContent = '✓';
                addBtn.classList.add('active');
            }

            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let items = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
                const existingIdx = items.findIndex(i => i.id === itemId);
                const plusSpan = addBtn.querySelector('span');

                if (existingIdx >= 0) {
                    items.splice(existingIdx, 1);
                    plusSpan.textContent = '+';
                    addBtn.classList.remove('active');
                } else {
                    items.push({ id: itemId, type: mediaType, title, poster_path: item.poster_path, addedAt: Date.now() });
                    plusSpan.textContent = '✓';
                    addBtn.classList.add('active');
                }
                localStorage.setItem('watchlist_items', JSON.stringify(items));
            });
        }

        // Make whole card clickable
        featuredCard.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openDetail(itemId, mediaType);
            }
        });

    } catch (error) {
        console.error('Failed to load featured recommendation:', error);
        featuredCard.innerHTML = '<div class="featured-loading"><p>Yüklenirken hata oluştu</p></div>';
    }
}

function setupNeIzlesemWizard() {
    const wizard = document.getElementById('neizlesem-wizard');
    if (!wizard) return;

    // Type buttons (Film/Dizi)
    wizard.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            wizard.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            neIzlesemFilters.type = btn.dataset.value;
        });
    });

    // Sürpriz Yap button (surprise random)
    const surpriseBtn = document.getElementById('surprise-btn');
    if (surpriseBtn) {
        surpriseBtn.addEventListener('click', () => {
            neIzlesemFilters.style = 'random';
            neIzlesemFilters.type = 'all';
            neIzlesemFilters.genres = [];
            neIzlesemFilters.platforms = [];
            // Deselect everything
            wizard.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            wizard.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            wizard.querySelectorAll('.genre-pill').forEach(c => c.classList.remove('selected'));
            wizard.querySelectorAll('.platform-pill').forEach(c => c.classList.remove('selected'));
            // Trigger generation immediately
            generateNeIzlesemResults(false);
        });
    }

    // Mood buttons (single select for main category/style)
    wizard.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            wizard.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            neIzlesemFilters.style = btn.dataset.value;
        });
    });

    // Genre pills (multi-select)
    wizard.querySelectorAll('.genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('selected');
            const value = pill.dataset.value;
            if (pill.classList.contains('selected')) {
                if (!neIzlesemFilters.genres.includes(value)) {
                    neIzlesemFilters.genres.push(value);
                }
            } else {
                neIzlesemFilters.genres = neIzlesemFilters.genres.filter(g => g !== value);
            }
        });
    });

    // Platform pills (multi-select for specific platforms, or 'all' for any)
    wizard.querySelectorAll('.platform-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const value = pill.dataset.value;

            // If "Fark Etmez" (all) is clicked, deselect others and clear platforms
            if (value === 'all') {
                wizard.querySelectorAll('.platform-pill').forEach(c => {
                    c.classList.remove('selected');
                });
                pill.classList.add('selected');
                neIzlesemFilters.platforms = [];
                return;
            }

            // Deselect "Fark Etmez" when selecting specific platform
            const allPill = wizard.querySelector('.platform-pill[data-value="all"]');
            if (allPill) allPill.classList.remove('selected');

            pill.classList.toggle('selected');
            if (pill.classList.contains('selected')) {
                if (!neIzlesemFilters.platforms.includes(value)) {
                    neIzlesemFilters.platforms.push(value);
                }
            } else {
                neIzlesemFilters.platforms = neIzlesemFilters.platforms.filter(p => p !== value);
            }
        });
    });

    // Legacy handlers for old elements (backward compatibility + V2 fallback)
    wizard.querySelectorAll('.type-btn-v2').forEach(btn => {
        btn.addEventListener('click', () => {
            wizard.querySelectorAll('.type-btn-v2').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            neIzlesemFilters.type = btn.dataset.value;
        });
    });

    wizard.querySelectorAll('.category-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            wizard.querySelectorAll('.category-icon-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            neIzlesemFilters.style = btn.dataset.value;
        });
    });

    wizard.querySelectorAll('.filter-pill-v2').forEach(pill => {
        pill.addEventListener('click', () => {
            const filter = pill.dataset.filter;
            const value = pill.dataset.value;

            if (filter === 'genre') {
                pill.classList.toggle('selected');
                if (pill.classList.contains('selected')) {
                    if (!neIzlesemFilters.genres.includes(value)) neIzlesemFilters.genres.push(value);
                } else {
                    neIzlesemFilters.genres = neIzlesemFilters.genres.filter(g => g !== value);
                }
            } else if (filter === 'platform') {
                if (value === 'all') {
                    wizard.querySelectorAll('.filter-pill-v2[data-filter="platform"]').forEach(p => p.classList.remove('selected'));
                    pill.classList.add('selected');
                    neIzlesemFilters.platforms = [];
                } else {
                    const allPill = wizard.querySelector('.filter-pill-v2[data-filter="platform"][data-value="all"]');
                    if (allPill) allPill.classList.remove('selected');
                    pill.classList.toggle('selected');
                    if (pill.classList.contains('selected')) {
                        if (!neIzlesemFilters.platforms.includes(value)) neIzlesemFilters.platforms.push(value);
                    } else {
                        neIzlesemFilters.platforms = neIzlesemFilters.platforms.filter(p => p !== value);
                    }
                }
            }
        });
    });

    // Legacy handlers for old elements (backward compatibility)
    wizard.querySelectorAll('.type-card').forEach(card => {
        card.addEventListener('click', () => {
            wizard.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            neIzlesemFilters.type = card.dataset.value;
        });
    });

    wizard.querySelectorAll('.mood-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            wizard.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            neIzlesemFilters.style = pill.dataset.value;
        });
    });

    wizard.querySelectorAll('.genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('selected');
            const value = pill.dataset.value;
            if (pill.classList.contains('selected')) {
                if (!neIzlesemFilters.genres.includes(value)) {
                    neIzlesemFilters.genres.push(value);
                }
            } else {
                neIzlesemFilters.genres = neIzlesemFilters.genres.filter(g => g !== value);
            }
        });
    });

    wizard.querySelectorAll('.platform-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('selected');
            const value = chip.dataset.value;
            if (chip.classList.contains('selected')) {
                if (!neIzlesemFilters.platforms.includes(value)) {
                    neIzlesemFilters.platforms.push(value);
                }
            } else {
                neIzlesemFilters.platforms = neIzlesemFilters.platforms.filter(p => p !== value);
            }
        });
    });

    // Generate button
    const generateBtn = document.getElementById('neizlesem-generate');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            neIzlesemFilters.page = 1;
            generateNeIzlesemResults(false);
        });
    }

    // Reset button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetNeIzlesemFilters);
    }

    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            neIzlesemFilters.page++;
            generateNeIzlesemResults(true);
        });
    }
}

async function generateNeIzlesemResults(append = false) {
    const wizard = document.getElementById('neizlesem-wizard');
    const results = document.getElementById('neizlesem-results');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!append) showLoading();

    try {
        const lang = state.currentLanguage;
        let page = neIzlesemFilters.page;
        let allResults = [];

        // For random mode, pick a random page (1-10)
        const isRandom = neIzlesemFilters.style === 'random';
        if (isRandom && !append) {
            page = Math.floor(Math.random() * 10) + 1;
        }

        // Build query based on style
        const styleQueries = {
            'popular': 'sort_by=popularity.desc&vote_count.gte=100',
            'random': 'sort_by=popularity.desc&vote_count.gte=50', // Will shuffle results
            'hollywood': 'with_original_language=en&sort_by=vote_average.desc&vote_count.gte=500',
            'festival': 'with_keywords=10714|293509|16154&sort_by=vote_average.desc&vote_count.gte=50', // Cannes, Sundance, Berlin
            'awarded': 'sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=7.5',
            'classic': `primary_release_date.lte=2000-12-31&sort_by=vote_average.desc&vote_count.gte=500`,
            'local': 'with_original_language=tr&sort_by=vote_average.desc&vote_count.gte=30',
            'nostalgia': 'primary_release_date.gte=1990-01-01&primary_release_date.lte=2010-12-31&sort_by=popularity.desc&vote_count.gte=200',
            'hidden': 'vote_average.gte=7.0&vote_count.gte=50&vote_count.lte=500&sort_by=vote_average.desc'
        };

        const baseQuery = styleQueries[neIzlesemFilters.style] || styleQueries['popular'];
        const genreStr = neIzlesemFilters.genres.join(',') || '';
        const platformStr = neIzlesemFilters.platforms.join('|') || '';

        // Build era (date range) filter
        let eraFilter = '';
        if (neIzlesemFilters.era) {
            const era = neIzlesemFilters.era;
            if (era === '2020') {
                eraFilter = 'primary_release_date.gte=2020-01-01';
            } else if (era === '2010') {
                eraFilter = 'primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31';
            } else if (era === '2000') {
                eraFilter = 'primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31';
            } else if (era === '1990') {
                eraFilter = 'primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31';
            } else if (era === '1980') {
                eraFilter = 'primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31';
            } else if (era === 'classic') {
                eraFilter = 'primary_release_date.lte=1979-12-31';
            }
        }

        // Fetch movies
        if (neIzlesemFilters.type !== 'tv') {
            let movieUrl = `/discover/movie?language=${lang}&${baseQuery}&page=${page}`;
            if (genreStr) movieUrl += `&with_genres=${genreStr}`;
            if (platformStr) movieUrl += `&with_watch_providers=${platformStr}&watch_region=TR`;
            if (eraFilter) movieUrl += `&${eraFilter}`;

            const movieData = await API.fetchTMDB(movieUrl);
            allResults.push(...(movieData.results || []).map(m => ({ ...m, media_type: 'movie' })));
        }

        // Fetch TV shows
        if (neIzlesemFilters.type !== 'movie') {
            let tvQuery = baseQuery.replace('primary_release_date', 'first_air_date');
            let tvEraFilter = eraFilter.replace(/primary_release_date/g, 'first_air_date');
            let tvUrl = `/discover/tv?language=${lang}&${tvQuery}&page=${page}`;
            if (genreStr) tvUrl += `&with_genres=${genreStr}`;
            if (platformStr) tvUrl += `&with_watch_providers=${platformStr}&watch_region=TR`;
            if (tvEraFilter) tvUrl += `&${tvEraFilter}`;

            const tvData = await API.fetchTMDB(tvUrl);
            allResults.push(...(tvData.results || []).map(t => ({ ...t, media_type: 'tv' })));
        }

        // Shuffle results for random mode
        if (isRandom) {
            allResults = allResults.sort(() => Math.random() - 0.5);
        }

        hideLoading();

        // Switch to search results section (like main search)
        hideAllSections();
        elements.searchResultsSection.style.display = 'block';

        // Build title based on filters
        let filterDesc = 'Ne İzlesem Önerileri';
        const filterParts = [];
        if (neIzlesemFilters.era) {
            const eraLabels = { '2020': '2020+', '2010': '2010\'lar', '2000': '2000\'ler', '1990': '90\'lar', '1980': '80\'ler', 'classic': 'Klasik' };
            filterParts.push(eraLabels[neIzlesemFilters.era] || neIzlesemFilters.era);
        }
        if (neIzlesemFilters.type === 'movie') filterParts.push('Filmler');
        else if (neIzlesemFilters.type === 'tv') filterParts.push('Diziler');

        if (filterParts.length > 0) {
            filterDesc = filterParts.join(' - ');
        }

        elements.resultsTitle.textContent = filterDesc;

        // Scroll to top when showing results
        if (!append) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (allResults.length === 0 && !append) {
            elements.resultsGrid.innerHTML = `
                <div class="empty-state visible" style="grid-column: 1/-1;">
                    <span class="empty-icon">🎭</span>
                    <p>Bu kriterlere uygun içerik bulunamadı</p>
                </div>
            `;
            elements.resultsCount.textContent = '';
            return;
        }

        // Render results using createMovieCard (same as main search)
        if (!append) {
            elements.resultsGrid.innerHTML = '';
        }

        allResults.forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.resultsGrid.appendChild(card);
        });

        elements.resultsCount.textContent = `${elements.resultsGrid.children.length} sonuç`;

    } catch (e) {
        hideLoading();
        console.error('Ne İzlesem error:', e);
    }
}

function resetNeIzlesemFilters() {
    // Reset state
    neIzlesemFilters.type = 'all';
    neIzlesemFilters.style = 'popular';
    neIzlesemFilters.genres = [];
    neIzlesemFilters.platforms = [];
    neIzlesemFilters.era = '';
    neIzlesemFilters.page = 1;

    // Reset UI - wizard buttons
    document.querySelectorAll('.wizard-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === 'all' || btn.dataset.value === 'popular') {
            btn.classList.add('active');
        }
    });
    document.querySelectorAll('.wizard-chip').forEach(chip => {
        chip.classList.remove('selected');
    });

    // Reset filter dropdown labels
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        const label = dropdown.querySelector('.filter-label');
        const filter = dropdown.dataset.filter;
        if (label) {
            if (filter === 'genre') label.textContent = 'Tür';
            else if (filter === 'era') label.textContent = 'Dönem';
            else if (filter === 'platform') label.textContent = 'Platform';
            else if (filter === 'mood') label.textContent = 'Ruh Hali';
        }
    });
    document.querySelectorAll('.filter-option.selected').forEach(opt => opt.classList.remove('selected'));

    // Show wizard, hide results
    const wizard = document.getElementById('neizlesem-wizard');
    const results = document.getElementById('neizlesem-results');
    if (wizard) wizard.style.display = 'flex';
    if (results) results.style.display = 'none';
}

// Helper function to create movie card HTML string
function createMovieCardHTML(item, mediaType) {
    const title = item.title || item.name;
    const rating = item.vote_average?.toFixed(1) || '?';
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const poster = item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : null;

    return `
        <div class="movie-card" data-id="${item.id}" data-type="${mediaType}">
            <div class="movie-poster">
                ${poster
            ? `<img src="${poster}" alt="${title}" loading="lazy">`
            : '<div class="no-poster">🎬</div>'
        }
                <div class="movie-rating"><span>⭐</span> ${rating}</div>
            </div>
            <div class="movie-info">
                <h4 class="movie-title">${title}</h4>
                <p class="movie-year">${year}</p>
            </div>
        </div>
    `;
}

// ============================================
// NE İZLESEM WIZARD
// ============================================
function loadWizardPage() {
    hideAllSections();

    // Show wizard section
    const wizardSection = document.getElementById('view-wizard');
    if (wizardSection) {
        wizardSection.classList.add('active');
        wizardSection.style.display = 'block';
    }

    // Hide home feed
    document.getElementById('view-home')?.classList.remove('active');

    // Setup event handlers
    setupWizardHandlers();
}

function setupWizardHandlers() {
    // Surprise button - random movie
    const surpriseBtn = document.getElementById('surprise-btn');
    if (surpriseBtn && !surpriseBtn._hasHandler) {
        surpriseBtn._hasHandler = true;
        surpriseBtn.addEventListener('click', async () => {
            surpriseBtn.disabled = true;
            surpriseBtn.innerHTML = '<span class="spinner"></span> Seçiliyor...';

            try {
                // Random page from popular movies
                const randomPage = Math.floor(Math.random() * 20) + 1;
                const response = await fetch(
                    `${API_URLS.TMDB_BASE}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&language=tr-TR&page=${randomPage}`
                );
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.results.length);
                    const movie = data.results[randomIndex];

                    // Open detail modal
                    openDetail(movie.id, 'movie', movie.title, movie.release_date?.split('-')[0], movie.original_title);
                }
            } catch (error) {
                console.error('Surprise error:', error);
                alert('Bir hata oluştu, tekrar deneyin.');
            }

            surpriseBtn.disabled = false;
            surpriseBtn.innerHTML = '<span class="material-symbols-outlined">casino</span><span>Sürpriz Yap!</span>';
        });
    }

    // Category chips
    const categoryChips = document.querySelectorAll('.category-chip');
    categoryChips.forEach(chip => {
        if (!chip._hasHandler) {
            chip._hasHandler = true;
            chip.addEventListener('click', async () => {
                const genreId = chip.dataset.genre;

                // Mark active
                categoryChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                // Fetch random movie from genre
                try {
                    const randomPage = Math.floor(Math.random() * 5) + 1;
                    const response = await fetch(
                        `${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=tr-TR&with_genres=${genreId}&page=${randomPage}`
                    );
                    const data = await response.json();

                    if (data.results && data.results.length > 0) {
                        const randomIndex = Math.floor(Math.random() * data.results.length);
                        const movie = data.results[randomIndex];
                        openDetail(movie.id, 'movie', movie.title, movie.release_date?.split('-')[0], movie.original_title);
                    }
                } catch (error) {
                    console.error('Genre fetch error:', error);
                }
            });
        }
    });

    // Mood submit
    const moodSubmitBtn = document.getElementById('mood-submit-btn');
    const moodInput = document.getElementById('mood-input');
    if (moodSubmitBtn && moodInput && !moodSubmitBtn._hasHandler) {
        moodSubmitBtn._hasHandler = true;
        moodSubmitBtn.addEventListener('click', async () => {
            const mood = moodInput.value.trim();
            if (!mood) return;

            // Map mood to genre
            const moodGenreMap = {
                'heyecanlı': 28, 'aksiyon': 28, 'adrenalin': 28,
                'komik': 35, 'eğlenceli': 35, 'neşeli': 35,
                'romantik': 10749, 'aşk': 10749,
                'korku': 27, 'korkunç': 27, 'gerilim': 53,
                'üzgün': 18, 'duygusal': 18, 'hüzünlü': 18,
                'bilimkurgu': 878, 'uzay': 878, 'gelecek': 878
            };

            const moodLower = mood.toLowerCase();
            let genreId = 28; // Default action

            for (const [keyword, genre] of Object.entries(moodGenreMap)) {
                if (moodLower.includes(keyword)) {
                    genreId = genre;
                    break;
                }
            }

            // Fetch movie from mapped genre
            try {
                const randomPage = Math.floor(Math.random() * 5) + 1;
                const response = await fetch(
                    `${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=tr-TR&with_genres=${genreId}&page=${randomPage}`
                );
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.results.length);
                    const movie = data.results[randomIndex];
                    openDetail(movie.id, 'movie', movie.title, movie.release_date?.split('-')[0], movie.original_title);
                }
            } catch (error) {
                console.error('Mood fetch error:', error);
            }
        });
    }
}

function loadFavoritesPage(listType = 'liked') {
    hideAllSections();
    elements.favoritesSection.style.display = 'block';

    // Get items from correct localStorage based on tab
    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
    const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');

    let items = listType === 'liked' ? likedItems : watchlistItems;

    // Sort by addedAt (most recent first)
    items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    // Update count
    const totalCount = likedItems.length + watchlistItems.length;
    elements.favoritesCount.textContent = `${totalCount} kayıtlı`;

    // Setup tabs
    const tabs = document.querySelectorAll('.fav-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.list === listType) {
            tab.classList.add('active');
        }
        tab.onclick = () => loadFavoritesPage(tab.dataset.list);
    });

    // Show empty message
    const emptyListMessage = document.getElementById('empty-list-message');

    if (items.length === 0) {
        const message = listType === 'liked'
            ? 'Henüz beğendiğiniz içerik yok'
            : 'Henüz izleyeceğiniz içerik yok';
        const hint = listType === 'liked'
            ? 'Film veya dizi detayında ❤️ butonuna tıklayarak beğenebilirsiniz'
            : 'Film veya dizi detayında + butonuna tıklayarak listeye ekleyebilirsiniz';

        elements.favoritesGrid.innerHTML = '';
        if (emptyListMessage) {
            emptyListMessage.style.display = 'flex';
            emptyListMessage.querySelector('p').textContent = message;
            emptyListMessage.querySelector('small').textContent = hint;
        }
        return;
    }

    // Hide empty message
    if (emptyListMessage) {
        emptyListMessage.style.display = 'none';
    }

    elements.favoritesGrid.innerHTML = '';
    items.forEach(item => {
        const card = createMovieCard(item, item.type || 'movie');
        elements.favoritesGrid.appendChild(card);
    });
}

function loadProfilePage() {
    hideAllSections();
    elements.profileSection.style.display = 'block';

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
    const ratingsCount = Object.keys(userRatings).length;
    const theme = state.currentTheme === 'dark' ? 'Koyu' : 'Açık';
    const tierLabel = state.userTier === 'premium' ? '👑 Premium' : state.userTier === 'free' ? '👤 Üye' : '👤 Misafir';

    // Build ratings list HTML
    let ratingsHtml = '';
    if (ratingsCount > 0) {
        const ratingItems = Object.entries(userRatings).map(([key, ratingData]) => {
            const [type, id] = key.split('_');
            // Support both old format (number) and new format ({value, title})
            const rating = typeof ratingData === 'object' ? ratingData.value : ratingData;
            const title = typeof ratingData === 'object' ? ratingData.title : 'Film/Dizi';
            return `
                <div class="rating-item" data-key="${key}" data-id="${id}" data-type="${type}">
                    <span class="rating-title">${title}</span>
                    <span class="rating-stars">${'★'.repeat(Math.floor(rating))}${rating % 1 >= 0.5 ? '½' : ''}</span>
                    <span class="rating-value">${rating}/10</span>
                </div>
            `;
        }).join('');

        ratingsHtml = `
            <div class="profile-section">
                <h4>⭐ Puanlarım (${ratingsCount})</h4>
                <div class="ratings-list">${ratingItems}</div>
            </div>
        `;
    }

    elements.profileContent.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <div class="avatar">👤</div>
                <h3>Kullanıcı</h3>
                <span class="tier-badge">${tierLabel}</span>
            </div>
            <div class="profile-stats">
                <div class="stat">
                    <span class="stat-value">${favorites.length}</span>
                    <span class="stat-label">Favori</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${ratingsCount}</span>
                    <span class="stat-label">Puan</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${theme}</span>
                    <span class="stat-label">Tema</span>
                </div>
                <div class="stat">
                    <span class="stat-value">v${APP_VERSION}</span>
                    <span class="stat-label">Versiyon</span>
                </div>
            </div>
            ${ratingsHtml}
            ${state.userTier !== 'premium' ? `
            <div class="premium-cta">
                <h4>💎 Premium'a Geç</h4>
                <p>Bildirimler, trivia ve daha fazlası için Premium üye olun!</p>
                <button class="upgrade-btn" onclick="showPremiumModal()">Premium'a Yükselt</button>
            </div>
            ` : ''}
            
            <!-- About & Legal Section -->
            <div class="profile-legal-section">
                <h4>📋 Hakkında & Yasal</h4>
                
                <div class="attribution-box">
                    <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" class="tmdb-logo">
                    <p class="attribution-text">Bu uygulama TMDB API'sini kullanmaktadır ancak TMDB tarafından onaylanmış, sertifikalandırılmış veya desteklenmemektedir.</p>
                </div>
                
                <p class="youtube-attr">YouTube is a trademark of Google Inc.</p>
                
                <div class="legal-links">
                    <a href="#" onclick="showLegalPage('privacy'); return false;">📄 Gizlilik Politikası</a>
                    <a href="#" onclick="showLegalPage('terms'); return false;">📜 Kullanım Şartları</a>
                    <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">▶️ YouTube Şartları</a>
                </div>
                
                <div class="dmca-contact">
                    <span>📧 Telif bildirimi:</span>
                    <a href="mailto:copyright@wtw-app.com">copyright@wtw-app.com</a>
                </div>
            </div>
        </div>
    `;

    // Add click handlers to rating items
    elements.profileContent.querySelectorAll('.rating-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const type = item.dataset.type;
            const title = item.querySelector('.rating-title')?.textContent;
            openDetail(id, type, title);
        });
    });
}

// ============================================
// SEARCH & AUTOCOMPLETE (app.js version - backup, index.html has primary)
// NOTE: These functions are prefixed with _ to avoid conflict with index.html's showAutocomplete
// ============================================

async function _appHandleAutocomplete() {
    const query = elements.searchInput.value.trim();

    if (state.autocompleteTimeout) {
        clearTimeout(state.autocompleteTimeout);
    }

    if (query.length < 2) {
        _appHideAutocomplete();
        return;
    }

    state.autocompleteTimeout = setTimeout(async () => {
        const data = await API.search(query, state.currentType, state.currentLanguage);

        if (data.results?.length > 0) {
            _appShowAutocomplete(data.results.slice(0, 6));
        } else {
            _appHideAutocomplete();
        }
    }, 300);
}

function _appShowAutocomplete(results) {
    const dropdown = elements.autocompleteDropdown;

    dropdown.innerHTML = results.map(item => {
        const mediaType = item.media_type || state.currentType;
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date;
        const year = date ? new Date(date).getFullYear() : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
        const posterUrl = API.getPosterUrl(item.poster_path, 'w92');
        const typeLabel = mediaType === 'movie' ? 'Film' : 'Dizi';

        return `
            <div class="autocomplete-item" data-id="${item.id}" data-type="${mediaType}" data-title="${title}" data-year="${year}" data-original="${item.original_title || item.original_name || ''}">
                <div class="autocomplete-poster">
                    ${posterUrl
                ? `<img src="${posterUrl}" alt="${title}" loading="lazy">`
                : `<div class="no-img">🎬</div>`
            }
                </div>
                <div class="autocomplete-info">
                    <div class="autocomplete-title">${title}</div>
                    <div class="autocomplete-meta">
                        <span>${typeLabel}</span>
                        ${year ? `<span>${year}</span>` : ''}
                        ${rating ? `<span class="autocomplete-rating">⭐ ${rating}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const type = item.dataset.type;
            const title = item.dataset.title;
            const year = item.dataset.year;
            const original = item.dataset.original;

            // Mark that user came from autocomplete (not search results)
            state.cameFromAutocomplete = true;
            state.cameFromSearch = false;
            state.searchQuery = '';
            state.searchResults = [];

            _appHideAutocomplete();
            openDetail(id, type, title, year, original);
        });
    });

    dropdown.classList.add('visible');
}

function _appHideAutocomplete() {
    elements.autocompleteDropdown.classList.remove('visible');
}

async function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    hideAutocomplete();
    hideAllSections();
    elements.searchResultsSection.style.display = 'block';
    showLoading();

    elements.resultsTitle.textContent = `"${query}"`;

    const data = await API.search(query, state.currentType, state.currentLanguage);

    hideLoading();

    if (data.results?.length > 0) {
        // Sort by popularity (descending)
        const sortedResults = data.results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        // Save search state for persistence
        state.searchQuery = query;
        state.searchResults = sortedResults;
        state.searchResultsVisible = true;

        elements.resultsGrid.innerHTML = '';
        sortedResults.forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.resultsGrid.appendChild(card);
        });
        elements.resultsCount.textContent = `${sortedResults.length} sonuç`;
    } else {
        state.searchResultsVisible = false;
        showNoResults();
    }
}

// ============================================
// MOVIE CARD
// ============================================

function createMovieCard(item, mediaType) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date;
    const year = date ? new Date(date).getFullYear() : '';
    const tmdbRating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterUrl = API.getPosterUrl(item.poster_path);

    // Unique ID for rating badge update
    const ratingBadgeId = `rating-${item.id}-${mediaType}`;

    card.innerHTML = `
        <div class="movie-poster">
            ${posterUrl
            ? `<img src="${posterUrl}" alt="${title}" loading="lazy">`
            : `<div class="no-image">🎬</div>`
        }
            <span class="card-badge">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
            ${tmdbRating ? `<span class="rating-badge" id="${ratingBadgeId}">⭐ ${tmdbRating}</span>` : ''}
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <span class="movie-year">${year}</span>
        </div>
    `;

    card.addEventListener('click', () => {
        openDetail(item.id, mediaType, title, year, item.original_title || item.original_name);
    });

    // Fetch IMDB rating asynchronously using movies-ratings2 API
    if (tmdbRating) {
        fetchIMDBRatingForCard(item.id, mediaType, ratingBadgeId);
    }

    return card;
}

// IMDB Rating Cache to avoid duplicate API calls
const imdbRatingCache = new Map();

// Fetch IMDB rating using movies-ratings2 API (commercially allowed)
async function fetchIMDBRatingForCard(tmdbId, mediaType, badgeId) {
    const cacheKey = `${mediaType}_${tmdbId}`;

    // Check cache first
    if (imdbRatingCache.has(cacheKey)) {
        const cachedRating = imdbRatingCache.get(cacheKey);
        if (cachedRating) {
            updateRatingBadge(badgeId, cachedRating);
        }
        return;
    }

    try {
        // Get IMDB ID from TMDB first
        const imdbId = await API.getIMDBId(tmdbId, mediaType);
        if (!imdbId) {
            imdbRatingCache.set(cacheKey, null);
            return;
        }

        // Fetch rating from movies-ratings2 API
        const response = await fetch(
            `https://movies-ratings2.p.rapidapi.com/ratings?id=${imdbId}`,
            {
                headers: {
                    'X-RapidAPI-Key': CONFIG.MOVIEDB_API_KEY,
                    'X-RapidAPI-Host': 'movies-ratings2.p.rapidapi.com'
                }
            }
        );

        if (!response.ok) {
            imdbRatingCache.set(cacheKey, null);
            return;
        }

        const data = await response.json();
        const ratings = data.ratings || data;
        const imdbRating = ratings.imdb?.score || ratings.imdb?.rating;

        if (imdbRating) {
            imdbRatingCache.set(cacheKey, imdbRating);
            updateRatingBadge(badgeId, imdbRating);
        } else {
            imdbRatingCache.set(cacheKey, null);
        }
    } catch (error) {
        // Silently fail - keep TMDB rating
        imdbRatingCache.set(cacheKey, null);
    }
}

function updateRatingBadge(badgeId, rating) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : rating;
        badge.textContent = `⭐ ${formattedRating}`;
        badge.classList.add('imdb-loaded');
        badge.title = 'IMDB Rating';
    }
}

// ============================================
// DETAIL MODAL
// ============================================

async function openDetail(id, type, title, year, originalTitle) {
    // Track if user came from search (autocomplete or full search)
    // Check both: 1) full search results visible, or 2) search input has value (autocomplete)
    const searchInputValue = elements.searchInput?.value?.trim() || '';
    const hasSearchContext = state.searchResultsVisible || searchInputValue.length > 0;

    if (hasSearchContext) {
        state.cameFromSearch = true;
        // Save search query from input if not already saved (autocomplete case)
        if (!state.searchQuery || state.searchQuery !== searchInputValue) {
            state.searchQuery = searchInputValue;
        }
        // Save scroll position for restoration
        state.searchScrollPosition = window.scrollY;
        console.log('Opening detail from search context:', state.searchQuery, 'Scroll:', state.searchScrollPosition);
    } else {
        state.cameFromSearch = false;
    }

    // Store current item for premium re-render
    state.currentItemId = id;
    state.currentItemType = type;

    elements.modal.classList.add('visible');
    const loadingText = i18n.t('loading') || 'Yükleniyor...';
    elements.modalBody.innerHTML = `<div class="loading-state visible"><div class="spinner"></div><p>${loadingText}</p></div>`;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');


    // Hide bottom nav when modal is open
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';

    // Current Region for providers
    const region = state.currentRegion || 'TR';

    try {
        const [details, providers, credits, tmdbVideos, youtubeVideos] = await Promise.all([
            API.getDetails(id, type, state.currentLanguage),
            API.getWatchProviders(id, type, region),
            API.getCredits(id, type),
            API.getTMDBVideos(id, type),
            API.getMovieVideos(title, year, originalTitle)
        ]);

        if (!details) {
            elements.modalBody.innerHTML = '<p style="padding: 40px; text-align: center;">Detaylar yüklenemedi.</p>';
            return;
        }

        // IMDB ID ve Trivia çek (arka planda)
        let imdbData = null;
        let triviaData = [];
        let allRatings = null;
        let turkishReleaseDate = null;

        // Fetch Turkish theatrical release date for movies
        if (type === 'movie') {
            turkishReleaseDate = await API.getReleaseDates(id, 'TR');
        }

        const imdbId = await API.getIMDBId(id, type);
        console.log('IMDB ID:', imdbId);
        if (imdbId) {
            try {
                [imdbData, triviaData, allRatings] = await Promise.all([
                    API.getMovieFromIMDB(imdbId),
                    API.getMovieTrivia(imdbId),
                    API.getAllRatings(imdbId)
                ]);
            } catch (innerErr) {
                console.warn('IMDB/Trivia/Ratings fetch error:', innerErr);
            }
        }

        // State'e kaydet
        state.currentImdbData = imdbData;
        state.currentTrivia = triviaData;
        state.currentCredits = credits;
        state.currentAllRatings = allRatings;
        state.currentTurkishReleaseDate = turkishReleaseDate;

        // Debug: Log all ratings
        console.log('All Ratings API Response:', allRatings);

        const trailers = tmdbVideos.filter(v => v.type === 'Trailer' || v.type === 'Teaser');
        const btsVideos = tmdbVideos.filter(v => v.type === 'Behind the Scenes' || v.type === 'Featurette');

        state.currentVideos = {
            trailer: mergeVideos(trailers, youtubeVideos.trailer),
            behindTheScenes: mergeVideos(btsVideos, youtubeVideos.behindTheScenes),
            reviews: [...(youtubeVideos.reviews || []), ...(youtubeVideos.interview || [])]
        };

        state.currentVideoCategory = 'trailer';
        state.currentTitle = title;

        renderDetail(details, providers, type, id);
    } catch (error) {
        console.error('openDetail error:', error);
        elements.modalBody.innerHTML = `<div class="error-state">
            <p>Bir hata oluştu: ${error.message}</p>
            <button onclick="closeModal()">Kapat</button>
        </div>`;
    }
}

function mergeVideos(tmdbVideos, youtubeVideos) {
    const merged = [];
    const seenIds = new Set();

    tmdbVideos.forEach(v => {
        if (!seenIds.has(v.key)) {
            seenIds.add(v.key);
            merged.push({
                id: { videoId: v.key },
                snippet: {
                    title: v.name,
                    thumbnails: { medium: { url: API.getYouTubeThumbnail(v.key) } }
                },
                isOfficial: true
            });
        }
    });

    if (youtubeVideos) {
        youtubeVideos.forEach(v => {
            const videoId = v.id.videoId;
            if (!seenIds.has(videoId)) {
                seenIds.add(videoId);
                merged.push(v);
            }
        });
    }

    return merged;
}

function renderDetail(details, providers, type, itemId) {
    const title = details.title || details.name;
    const date = details.release_date || details.first_air_date;

    // Vizyon tarihi kontrolü
    const dateObj = date ? new Date(date) : null;
    const now = new Date();
    const isUpcoming = dateObj && dateObj > now;
    const dateDisplay = isUpcoming
        ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : (dateObj ? dateObj.getFullYear() : '');
    const dateLabel = isUpcoming ? '<span class="tag upcoming">Yakında</span>' : '';

    // Turkish theatrical premiere (if available and different from global)
    let turkishPremiereHtml = '';
    if (type === 'movie' && state.currentTurkishReleaseDate) {
        const trDate = new Date(state.currentTurkishReleaseDate.date);
        if (!isNaN(trDate.getTime())) {
            const trDateStr = trDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            turkishPremiereHtml = `<span class="tr-premiere">🎭 Türkiye Vizyonu: ${trDateStr}</span>`;
        }
    }

    const year = dateDisplay;
    const runtime = details.runtime || (details.episode_run_time?.[0]);

    // Ratings from unified API
    const allRatings = state.currentAllRatings;
    console.log('Rendering ratings:', allRatings);

    // IMDB rating - now comes as direct value from API
    const imdbRating = allRatings?.imdb || state.currentImdbData?.ratingsSummary?.aggregateRating;
    const tmdbRating = details.vote_average;

    // RT rating - comes as object with tomatometer
    const rtData = allRatings?.rottenTomatoes;
    const rtRating = rtData?.tomatometer || null;
    // Generate RT search URL with movie title
    const rtSlug = (details.original_title || details.original_name || title).toLowerCase()
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
    const rtUrl = rtRating ? `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}` : '#';

    // Letterboxd and Metacritic - now come as direct values
    const letterboxdRating = allRatings?.letterboxd || null;
    const letterboxdUrl = `https://letterboxd.com/search/${encodeURIComponent(title)}/`;
    const metacriticRating = allRatings?.metacritic || null;
    const metacriticUrl = `https://www.metacritic.com/search/${type === 'movie' ? 'movie' : 'tv'}/${encodeURIComponent(title)}/`;

    // Check if liked or in watchlist
    const likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
    const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
    const isLiked = likedItems.some(f => f.id === parseInt(itemId));
    const isInWatchlist = watchlistItems.some(f => f.id === parseInt(itemId));

    // Legacy favorites check (for backward compatibility)
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const isFavorite = favorites.some(f => f.id === parseInt(itemId));
    const favBtnText = isFavorite ? '❤️ Çıkar' : '🤍 Ekle';

    // Premium Check
    const isPremium = state.userTier === 'premium';
    const isMember = state.userTier !== 'guest';

    // Trivia HTML (Restricted)
    let triviaHtml = '';
    if (state.currentTrivia && state.currentTrivia.length > 0) {
        const triviaContent = state.currentTrivia.slice(0, 3).map(t =>
            `<div class="trivia-item">
                <span class="trivia-icon">💡</span>
                <p class="trivia-text">${t.text || t}</p>
            </div>`
        ).join('');

        if (isPremium) {
            triviaHtml = `
            <div class="modal-section trivia-section">
                <h3 class="section-heading">🤓 İlginç Bilgiler (Premium)</h3>
                <div class="trivia-list">${triviaContent}</div>
            </div>`;
        } else {
            triviaHtml = `
            <div class="modal-section trivia-section restricted">
                <h3 class="section-heading">🤓 İlginç Bilgiler</h3>
                <div class="premium-overlay">
                    <span class="lock-icon">🔒</span>
                    <p>Bu içeriği görmek için <strong>Premium</strong> üye olun.</p>
                    <button class="upgrade-btn">Premium'a Geç</button>
                </div>
                <div class="trivia-list blur">${triviaContent}</div>
            </div>`;
        }
    }

    // Cast HTML
    const cast = state.currentCredits?.cast?.slice(0, 10) || [];
    const castHtml = cast.length > 0 ? `
        <div class="modal-section">
            <h3 class="section-heading">🎭 Oyuncular</h3>
            <div class="cast-list">
                ${cast.map(c => `
                    <div class="cast-item">
                        <img src="${c.profile_path ? API.getPosterUrl(c.profile_path, 'w185') : 'https://placehold.co/100x150?text=No+Image'}" alt="${c.name}">
                        <span class="cast-name">${c.name}</span>
                        <span class="cast-role">${c.character}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Crew HTML (Directors/Writers)
    const crew = state.currentCredits?.crew || [];
    const directors = crew.filter(c => c.job === 'Director').map(c => c.name).join(', ');
    const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story').map(c => c.name).slice(0, 3).join(', ');

    const crewHtml = (directors || writers) ? `
        <div class="modal-meta-row">
            ${directors ? `<div><strong>Yönetmen:</strong> ${directors}</div>` : ''}
            ${writers ? `<div><strong>Senaryo:</strong> ${writers}</div>` : ''}
        </div>
    ` : '';

    elements.modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-poster">
                ${details.poster_path
            ? `<img src="${API.getPosterUrl(details.poster_path)}" alt="${title}">`
            : '<div style="aspect-ratio:2/3;background:var(--glass);display:flex;align-items:center;justify-content:center;font-size:4rem;">🎬</div>'
        }
            </div>
            <div class="modal-details">
                <h2 class="modal-title">${title}</h2>
                
                <div class="genres">
                    ${details.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || ''}
                </div>

                <div class="modal-meta">
                    <span>📅 ${year} ${dateLabel}</span>
                    ${runtime ? `<span>⏱️ ${runtime} dk</span>` : ''}
                    <span>${type === 'movie' ? '🎬 Film' : '📺 Dizi'}</span>
                </div>
                ${turkishPremiereHtml}
                
                <div class="ratings-container">
                    <a href="https://www.imdb.com/title/${state.currentImdbData?.id || ''}" target="_blank" rel="noopener" class="rating-box imdb" title="IMDB'de görüntüle">
                        <span class="source">IMDB</span>
                        <span class="score">⭐ ${imdbRating ? (typeof imdbRating === 'number' ? imdbRating.toFixed(1) : imdbRating) : '-'}</span>
                    </a>
                    <a href="https://www.themoviedb.org/${type}/${itemId}" target="_blank" rel="noopener" class="rating-box tmdb" title="TMDB'de görüntüle">
                        <span class="source">TMDB</span>
                        <span class="score">📈 ${tmdbRating ? Math.round(tmdbRating * 10) + '%' : '-'}</span>
                    </a>
                    ${rtRating ? `
                    <a href="${rtUrl}" target="_blank" rel="noopener" class="rating-box rt" title="Rotten Tomatoes'da görüntüle">
                        <span class="source">RT</span>
                        <span class="score">🍅 ${rtRating}%</span>
                    </a>
                    ` : ''}
                    ${letterboxdRating ? `
                    <a href="${letterboxdUrl}" target="_blank" rel="noopener" class="rating-box letterboxd" title="Letterboxd'da ara">
                        <span class="source">LB</span>
                        <span class="score">🎬 ${letterboxdRating}</span>
                    </a>
                    ` : ''}
                    ${metacriticRating ? `
                    <a href="${metacriticUrl}" target="_blank" rel="noopener" class="rating-box metacritic" title="Metacritic'te ara">
                        <span class="source">MC</span>
                        <span class="score">📊 ${metacriticRating}</span>
                    </a>
                    ` : ''}
                </div>

                ${crewHtml}

                <div class="modal-actions-container">
                    <div class="modal-actions modal-actions-compact">
                        <button class="action-btn-icon like-btn ${isLiked ? 'active' : ''}" id="like-btn" data-id="${itemId}" data-type="${type}" data-title="${title}" title="Beğen">
                            <span>${isLiked ? '♥' : '♡'}</span>
                        </button>
                        <button class="action-btn-icon watchlist-btn ${isInWatchlist ? 'active' : ''}" id="watchlist-btn" data-id="${itemId}" data-type="${type}" data-title="${title}" title="İzleyeceğim">
                            <span>${isInWatchlist ? '✓' : '+'}</span>
                        </button>
                    </div>
                    ${isMember ? `
                    <div class="user-star-rating" data-item-id="${itemId}" data-item-type="${type}" data-item-title="${title}">
                        <label>Puanın:</label>
                        <div class="stars-container" id="stars-container">
                            ${[...Array(10)].map((_, i) => `
                                <span class="star empty" data-value="${i + 1}" data-half-left="${i + 0.5}">
                                    <span class="star-half left"></span>
                                    <span class="star-half right"></span>
                                </span>
                            `).join('')}
                        </div>
                        <span class="star-value" id="star-value"></span>
                        <button class="rate-confirm-btn" id="rate-confirm-btn">Oy Ver</button>
                    </div>
                    ` : `
                    <div class="user-star-rating guest-prompt">
                        <span class="lock-icon">🔒</span>
                        <span>Puanlamak için <a href="#" class="login-link" onclick="openLoginModal()">giriş yapın</a></span>
                    </div>
                    `}
                </div>
        </div>
        
        <div class="modal-content-body">
            <div class="modal-section">
                <h3 class="section-heading">📺 Nerede İzlenir?</h3>
                ${renderProviders(providers, details.networks, type, title, details)}
            </div>

            <div class="modal-section">
                <h3 class="section-heading">📝 Özet</h3>
                <p class="overview-text">${details.overview || 'Özet bulunamadı.'}</p>
            </div>

            ${castHtml}

            ${state.currentImdbData ? `
            <div class="modal-section imdb-section">
                <a href="https://www.imdb.com/title/${state.currentImdbData.id || ''}" target="_blank" rel="noopener" class="imdb-profile-btn">
                    ⭐ IMDB'de Detaylı Bilgi ve Yorumları Gör
                </a>
            </div>
            ` : ''}
            
            ${triviaHtml}
            
            <div class="modal-section">
                <h3 class="section-heading">🎬 Videolar</h3>
                <div class="video-tabs">
                    <button class="video-tab active" data-category="trailer">🎥 Fragmanlar</button>
                    <button class="video-tab" data-category="behindTheScenes">🎬 Kamera Arkası</button>
                    <button class="video-tab" data-category="reviews">💬 İçerikler</button>
                </div>
                <div id="youtube-player"></div>
                <div class="videos-grid" id="videos-grid"></div>
            </div>
        </div>
    `;

    // Event Listeners - Like Button
    document.getElementById('like-btn')?.addEventListener('click', function () {
        const id = parseInt(this.dataset.id);
        const type = this.dataset.type;
        const title = this.dataset.title;

        let likedItems = JSON.parse(localStorage.getItem('liked_items') || '[]');
        const existingIndex = likedItems.findIndex(item => item.id === id);
        const iconSpan = this.querySelector('span');

        if (existingIndex >= 0) {
            likedItems.splice(existingIndex, 1);
            this.classList.remove('active');
            iconSpan.textContent = '♡';
        } else {
            likedItems.push({ id, type, title, poster_path: details.poster_path, addedAt: Date.now() });
            this.classList.add('active');
            iconSpan.textContent = '♥';
        }

        localStorage.setItem('liked_items', JSON.stringify(likedItems));
    });

    // Event Listeners - Watchlist Button
    document.getElementById('watchlist-btn')?.addEventListener('click', function () {
        const id = parseInt(this.dataset.id);
        const type = this.dataset.type;
        const title = this.dataset.title;

        let watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');
        const existingIndex = watchlistItems.findIndex(item => item.id === id);
        const iconSpan = this.querySelector('span');

        if (existingIndex >= 0) {
            watchlistItems.splice(existingIndex, 1);
            this.classList.remove('active');
            iconSpan.textContent = '+';
        } else {
            watchlistItems.push({ id, type, title, poster_path: details.poster_path, addedAt: Date.now() });
            this.classList.add('active');
            iconSpan.textContent = '✓';
        }

        localStorage.setItem('watchlist_items', JSON.stringify(watchlistItems));
    });

    if (isMember) {
        const notifyBtn = document.getElementById('notify-btn');
        if (notifyBtn) {
            notifyBtn.addEventListener('click', () => {
                if (state.userTier === 'premium') {
                    notifyBtn.classList.toggle('active');
                    notifyBtn.textContent = notifyBtn.classList.contains('active') ? '🔕 Bildirimi Kapat' : '🔔 Bildirim Al';
                    alert('Bildirim ayarlandı! (Simülasyon)');
                } else {
                    alert('Bu özellik sadece Premium üyeler içindir.');
                }
            });
        }

        // Star Rating System with Drag Support
        const starsContainer = document.getElementById('stars-container');
        const starValue = document.getElementById('star-value');
        if (starsContainer) {
            const itemId = starsContainer.closest('.user-star-rating').dataset.itemId;
            const itemType = starsContainer.closest('.user-star-rating').dataset.itemType;
            let isDragging = false;

            // Load existing rating
            const userRatings = JSON.parse(localStorage.getItem('userRatings') || '{}');
            const existingRatingData = userRatings[`${itemType}_${itemId}`];
            // Support both old format (number) and new format ({value, title})
            const existingRating = typeof existingRatingData === 'object' ? existingRatingData?.value : existingRatingData;
            if (existingRating) {
                starValue.textContent = existingRating;
                updateStarDisplay(starsContainer, existingRating);
            }

            // Calculate rating from mouse/touch position
            function getRatingFromPosition(e) {
                const containerRect = starsContainer.getBoundingClientRect();
                const stars = starsContainer.querySelectorAll('.star');
                const starWidth = containerRect.width / stars.length;

                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const relativeX = clientX - containerRect.left;
                const starIndex = Math.floor(relativeX / starWidth);
                const isLeftHalf = (relativeX % starWidth) < (starWidth / 2);

                let value = starIndex + (isLeftHalf ? 0.5 : 1);
                value = Math.max(0, Math.min(10, value)); // Allow 0 to delete
                return value;
            }

            // Update display during drag
            function handleDragMove(e) {
                if (!isDragging) return;
                e.preventDefault();
                const value = getRatingFromPosition(e);
                updateStarDisplay(starsContainer, value);
                starValue.textContent = value;
            }

            // Show confirm button on drag end (0 = delete rating immediately)
            function handleDragEnd(e) {
                if (!isDragging) return;
                isDragging = false;

                const value = parseFloat(starValue.textContent) || 0;
                const confirmBtn = document.getElementById('rate-confirm-btn');

                if (value > 0) {
                    // Show "Oy Ver" button
                    if (confirmBtn) {
                        confirmBtn.style.display = 'inline-block';
                    }
                } else {
                    // Delete rating when dragged to 0
                    const ratings = JSON.parse(localStorage.getItem('userRatings') || '{}');
                    const key = `${itemType}_${itemId}`;
                    if (ratings[key]) {
                        delete ratings[key];
                        localStorage.setItem('userRatings', JSON.stringify(ratings));
                        if (confirmBtn) confirmBtn.style.display = 'none';
                        // Reactive update: refresh profile if profile section is visible
                        if (elements.profileSection?.style.display === 'block') {
                            loadProfilePage();
                        }
                    }
                }
            }

            // Save rating on confirm button click
            const confirmBtn = document.getElementById('rate-confirm-btn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const value = parseFloat(starValue.textContent) || 0;
                    if (value > 0) {
                        const ratings = JSON.parse(localStorage.getItem('userRatings') || '{}');
                        const key = `${itemType}_${itemId}`;
                        const itemTitle = starsContainer.closest('.user-star-rating').dataset.itemTitle;
                        ratings[key] = {
                            value: value,
                            title: itemTitle || state.currentTitle || 'Bilinmeyen'
                        };
                        localStorage.setItem('userRatings', JSON.stringify(ratings));
                        confirmBtn.textContent = '✓ Kaydedildi';
                        setTimeout(() => {
                            confirmBtn.style.display = 'none';
                            confirmBtn.textContent = 'Oy Ver';
                        }, 1500);
                    }
                });
            }

            // Mouse events
            starsContainer.addEventListener('mousedown', (e) => {
                isDragging = true;
                handleDragMove(e);
            });

            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);

            // Touch events for mobile
            starsContainer.addEventListener('touchstart', (e) => {
                isDragging = true;
                handleDragMove(e);
            });

            starsContainer.addEventListener('touchmove', handleDragMove);
            starsContainer.addEventListener('touchend', handleDragEnd);

            // Hover effect (non-drag)
            starsContainer.addEventListener('mousemove', (e) => {
                if (isDragging) return;
                const star = e.target.closest('.star');
                if (!star) return;

                const rect = star.getBoundingClientRect();
                const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
                const value = isLeftHalf ? parseFloat(star.dataset.halfLeft) : parseFloat(star.dataset.value);
                updateStarDisplay(starsContainer, value);
            });

            starsContainer.addEventListener('mouseleave', () => {
                if (isDragging) return;
                const currentRating = parseFloat(starValue.textContent) || 0;
                updateStarDisplay(starsContainer, currentRating);
            });
        }
    }

    // Video tabs logic
    document.querySelectorAll('.video-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.video-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentVideoCategory = tab.dataset.category;
            document.getElementById('youtube-player').innerHTML = '';
            renderVideos();
        });
    });

    renderVideos();

    // Notify button (watchlist for platform availability)
    const notifyBtn = document.getElementById('notify-btn');
    if (notifyBtn && window.NotificationService) {
        const isInWatchlist = window.NotificationService.isInWatchlist(itemId, type);

        // Update button state if already watching
        if (isInWatchlist && state.userTier === 'premium') {
            notifyBtn.innerHTML = '✓ Takipte';
            notifyBtn.classList.add('watching');
        }

        notifyBtn.addEventListener('click', () => {
            if (state.userTier !== 'premium') {
                showPremiumModal();
                return;
            }

            const isWatching = window.NotificationService.isInWatchlist(itemId, type);

            if (isWatching) {
                // Remove from watchlist
                window.NotificationService.removeFromWatchlist(itemId, type);
                notifyBtn.innerHTML = '<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/></svg> Haber Ver';
                notifyBtn.classList.remove('watching');
            } else {
                // Add to watchlist
                const added = window.NotificationService.addToWatchlist({
                    id: itemId,
                    type: type,
                    title: details.title || details.name,
                    poster: details.poster_path
                });

                if (added) {
                    notifyBtn.innerHTML = '<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><polyline points=\"20 6 9 17 4 12\"/></svg> Takipte';
                    notifyBtn.classList.add('watching');
                }
            }
        });
    }
}

// Star Rating Display Helper
function updateStarDisplay(container, rating) {
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        const fullValue = index + 1;
        const halfValue = index + 0.5;

        star.classList.remove('full', 'half', 'empty');

        if (rating >= fullValue) {
            star.classList.add('full');
        } else if (rating >= halfValue) {
            star.classList.add('half');
        } else {
            star.classList.add('empty');
        }
    });
}

function toggleFavorite(details, type) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.findIndex(f => f.id === details.id);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({
            id: details.id,
            title: details.title || details.name,
            poster_path: details.poster_path,
            vote_average: details.vote_average,
            release_date: details.release_date || details.first_air_date,
            media_type: type
        });
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function renderProviders(providers, networks, type, title, details) {
    let html = '<div class="providers-grid">';
    let hasProviders = false;
    const encodedTitle = encodeURIComponent(title);

    if (providers) {
        if (providers.flatrate) {
            hasProviders = true;
            providers.flatrate.forEach(p => {
                html += createProviderCard(p, 'Abonelik', 'subscription', encodedTitle);
            });
        }
        if (providers.rent) {
            hasProviders = true;
            providers.rent.forEach(p => {
                html += createProviderCard(p, 'Kiralık', 'rent', encodedTitle);
            });
        }
        if (providers.buy) {
            hasProviders = true;
            providers.buy.forEach(p => {
                html += createProviderCard(p, 'Satın Al', 'buy', encodedTitle);
            });
        }
    }

    html += '</div>';

    // TV için orijinal yayıncı
    if (type === 'tv' && networks?.length > 0) {
        html += `
            <div class="networks-section">
                <h4 class="networks-title">📡 Orijinal Yayıncı</h4>
                <div class="networks-grid">
                    ${networks.map(n => `
                        <div class="network-item">
                            ${n.logo_path
                ? `<img src="${API.getPosterUrl(n.logo_path, 'w92')}" alt="${n.name}" class="network-logo">`
                : `<div class="network-logo-placeholder">📺</div>`
            }
                            <span class="network-name">${n.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Platform yoksa gösterim durumunu kontrol et
    if (!hasProviders && (!networks || networks.length === 0)) {
        const releaseDate = details?.release_date || details?.first_air_date;
        const status = details?.status;
        const dateObj = releaseDate ? new Date(releaseDate) : null;
        const now = new Date();

        let statusMessage = '';

        if (type === 'movie') {
            if (dateObj && dateObj > now) {
                // Vizyona girecek film
                const formattedDate = dateObj.toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });
                statusMessage = `
                    <div class="release-status upcoming">
                        <span class="status-icon">🎬</span>
                        <span class="status-text"><strong>${formattedDate}</strong> tarihinde vizyonda</span>
                    </div>
                `;
            } else if (status === 'Released' && dateObj) {
                // Gösterimdeydi/gösterimde olabilir
                const daysSinceRelease = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
                if (daysSinceRelease < 90) {
                    statusMessage = `
                        <div class="release-status theatrical">
                            <span class="status-icon">🎭</span>
                            <span class="status-text">Sinemalarda gösterimde olabilir</span>
                        </div>
                        <a href="https://www.google.com/maps/search/sinema+yakınımda" target="_blank" rel="noopener" class="cinema-search-btn">
                            <span class="cinema-icon">🎬</span> Yakındaki Sinemalar
                        </a>
                    `;
                } else {
                    statusMessage = `
                        <p class="no-providers">Bu içerik için ${state.currentRegion === 'TR' ? 'Türkiye\'de' : 'seçili ülkede'} platform bilgisi bulunamadı.</p>
                        <a href="https://www.youtube.com/results?search_query=${encodedTitle}+full+movie" target="_blank" rel="noopener" class="youtube-search-btn">
                            <span class="yt-icon">▶️</span> YouTube'da Ara
                        </a>
                    `;
                }
            } else if (status === 'In Production' || status === 'Post Production' || status === 'Planned') {
                statusMessage = `
                    <div class="release-status production">
                        <span class="status-icon">🎥</span>
                        <span class="status-text">Yapım aşamasında</span>
                    </div>
                `;
            } else {
                statusMessage = `
                    <p class="no-providers">Bu içerik için ${state.currentRegion === 'TR' ? 'Türkiye\'de' : 'seçili ülkede'} platform bilgisi bulunamadı.</p>
                    <a href="https://www.youtube.com/results?search_query=${encodedTitle}+full+movie" target="_blank" rel="noopener" class="youtube-search-btn">
                        <span class="yt-icon">▶️</span> YouTube'da Ara
                    </a>
                `;
            }
        } else {
            // TV - sadece mesaj göster + YouTube
            statusMessage = `
                <p class="no-providers">Bu içerik için ${state.currentRegion === 'TR' ? 'Türkiye\'de' : 'seçili ülkede'} platform bilgisi bulunamadı.</p>
                <a href="https://www.youtube.com/results?search_query=${encodedTitle}+full+episode" target="_blank" rel="noopener" class="youtube-search-btn">
                    <span class="yt-icon">▶️</span> YouTube'da Ara
                </a>
            `;
        }

        return statusMessage;
    }

    return html;
}

function createProviderCard(provider, typeText, typeClass, encodedTitle) {
    const platformUrl = PLATFORM_URLS[provider.provider_name] || PLATFORM_URLS['default'];
    const href = platformUrl + encodedTitle;

    return `
        <a href="${href}" target="_blank" rel="noopener" class="provider-card">
            <img src="${API.getPosterUrl(provider.logo_path, 'w92')}" alt="${provider.provider_name}" class="provider-logo">
            <span class="provider-name">${provider.provider_name}</span>
            <span class="provider-type ${typeClass}">${typeText}</span>
        </a>
    `;
}

function renderVideos() {
    const videosGrid = document.getElementById('videos-grid');
    const videos = state.currentVideos[state.currentVideoCategory] || [];

    videosGrid.innerHTML = '';

    if (videos.length === 0) {
        videosGrid.innerHTML = `
            <div class="no-videos">
                <div class="icon">🎬</div>
                <p>Bu kategoride video bulunamadı</p>
            </div>
        `;
        return;
    }

    videos.forEach(video => {
        const videoId = video.id.videoId || video.id;
        const title = video.snippet.title;
        const thumbnail = video.snippet.thumbnails?.medium?.url || API.getYouTubeThumbnail(videoId);

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${thumbnail}" alt="${title}" loading="lazy">
                <div class="video-play-btn">▶</div>
            </div>
            <div class="video-info">
                <p class="video-title">${title}</p>
                <div class="video-actions">
                    <button class="video-action-btn primary play-here">▶ Oynat</button>
                    <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener" class="video-action-btn secondary">YouTube</a>
                </div>
            </div>
        `;

        card.querySelector('.video-thumbnail').addEventListener('click', () => playVideo(videoId));
        card.querySelector('.play-here').addEventListener('click', (e) => {
            e.stopPropagation();
            playVideo(videoId);
        });

        videosGrid.appendChild(card);
    });
}

function playVideo(videoId) {
    const player = document.getElementById('youtube-player');

    player.innerHTML = `
        <div class="youtube-player">
            <iframe 
                src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>
    `;

    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeModal() {
    elements.modal.classList.remove('visible');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    elements.modalBody.innerHTML = '';

    const player = document.getElementById('youtube-player');
    if (player) player.innerHTML = '';

    // Show bottom nav when modal closes
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';

    // If came from autocomplete, reset and go to home page
    if (state.cameFromAutocomplete) {
        state.cameFromAutocomplete = false;
        elements.searchInput.value = '';
        document.getElementById('search-clear').style.display = 'none';
        loadHomePage();
        return;
    }

    // Restore search state if user came from search
    if (state.cameFromSearch && state.searchQuery) {
        console.log('closeModal: Restoring search state:', state.searchQuery, 'Results:', state.searchResults?.length);

        // Store scroll position before any DOM changes
        const savedScrollPosition = state.searchScrollPosition;

        // Get elements directly from DOM to avoid stale references
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        const searchResultsSection = document.getElementById('search-results-section');
        const resultsGrid = document.getElementById('results-grid');
        const resultsTitle = document.getElementById('results-title');
        const resultsCount = document.getElementById('results-count');

        // Show search clear button
        if (searchClear) {
            searchClear.style.display = 'block';
        }

        // Restore search input value
        if (searchInput) {
            searchInput.value = state.searchQuery;
            console.log('closeModal: Input value set to:', searchInput.value);
        }

        // Check if we have search results
        if (state.searchResults && state.searchResults.length > 0 && searchResultsSection && resultsGrid) {
            console.log('closeModal: Showing results section with', state.searchResults.length, 'items');

            // Hide all sections first
            hideAllSections();

            // Show search results section
            searchResultsSection.style.display = 'block';

            if (resultsTitle) {
                resultsTitle.textContent = `"${state.searchQuery}"`;
            }

            resultsGrid.innerHTML = '';
            state.searchResults.forEach(item => {
                const card = createMovieCard(item, item.media_type || 'movie');
                resultsGrid.appendChild(card);
            });

            if (resultsCount) {
                resultsCount.textContent = `${state.searchResults.length} sonuç`;
            }

            // Restore scroll position after DOM is fully updated
            if (savedScrollPosition) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        window.scrollTo(0, savedScrollPosition);
                    });
                });
            }
        } else {
            console.log('closeModal: No results, triggering autocomplete');
            // Autocomplete click - trigger autocomplete dropdown
            setTimeout(() => {
                handleAutocomplete();
            }, 100);
        }

        // Prevent any subsequent loadHomePage from overriding restore
        state.skipNextHomePage = true;
        state.searchRestoreTime = Date.now();

        // Reset flag AFTER restoring
        state.cameFromSearch = false;
        return;
    }

    // Reset cameFromSearch flag
    state.cameFromSearch = false;
}

// ============================================
// UI HELPERS
// ============================================

function showLoading() {
    elements.loading.classList.add('visible');
}

function hideLoading() {
    elements.loading.classList.remove('visible');
}

function showNoResults() {
    elements.noResults.classList.add('visible');
}

function updateArrowVisibility(slider, leftArrow, rightArrow) {
    if (slider.scrollLeft > 0) {
        leftArrow.style.opacity = '1';
        leftArrow.style.pointerEvents = 'auto';
    } else {
        leftArrow.style.opacity = '0';
        leftArrow.style.pointerEvents = 'none';
    }

    // Check if scrolled to end (with small buffer)
    if (Math.ceil(slider.scrollLeft + slider.clientWidth) >= slider.scrollWidth - 10) {
        rightArrow.style.opacity = '0';
        rightArrow.style.pointerEvents = 'none';
    } else {
        rightArrow.style.opacity = '1';
        rightArrow.style.pointerEvents = 'auto';
    }
}

function updateSuggestedVisibility() {
    // Suggested section is only for Logged In users
    if (state.userTier !== 'guest') {
        elements.suggestedSection.style.display = 'block';

        // Move Suggested Section to top if user is logged in
        if (elements.newReleasesSection.parentNode) {
            elements.mainContent.insertBefore(elements.suggestedSection, elements.trendingSection);
        }
    } else {
        elements.suggestedSection.style.display = 'none';
        // Ensure it's in the DOM but hidden
        if (!elements.suggestedSection.parentNode) {
            elements.mainContent.appendChild(elements.suggestedSection);
        }
    }
}

// Expose functions to window for inline onclick handlers
window.showPremiumModal = showPremiumModal;
window.closePremiumModal = closePremiumModal;
window.handleSocialLogin = handleSocialLogin;
window.closeLoginModal = closeLoginModal;
window.openLoginModal = openLoginModal;
window.loadHomePage = loadHomePage;
window.loadWizardPage = loadWizardPage;
window.loadFavoritesPage = loadFavoritesPage;
window.loadProfilePage = loadProfilePage;
window.toggleTheme = toggleTheme;
window.openDetail = openDetail;
window.closeModal = closeModal;

// End of app.js
