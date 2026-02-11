// ============================================
// LUMI - Discover Feature Module
// v0.12.0
// ============================================

import { CONFIG, API_URLS } from '../config.js';
import { showToast } from '../ui/toast.js';
import { DAILY_REC_KEY, DAILY_REC_CATEGORIES, getGenreName } from '../lib/constants.js';

// ============================================
// POETIC PLACEHOLDERS
// ============================================

export const POETIC_PLACEHOLDERS = [
    'Sonu ağzımı açık bırakacak ama izlerken de içimi yumuşatacak bir film arıyorum...',
    'Uyumadan önce iç huzuru bulacağım bir dizi lazım...',
    'Beni hem güldürecek hem ağlatacak duygusal bir hikaye...',
    'Beynimin sınırlarını zorlayacak zihin bükücü bir film...',
    'Gerilim dolu ama sonunda rahatlatıcı bir son istiyorum...',
    'Saatlerce konuşacak bir hikaye ve unutulmaz karakterler...',
    "90'ların nostaljisini hissedeceğim klasik bir yapım...",
    'İzlerken zaman durmuş gibi hissedeceğim sinematik bir şaheser...',
    'Aşkı ve kaybı anlamlandıran derin bir anlatı arıyorum...',
    'Finali beni günlerce düşündürecek felsefi bir film...',
];

/**
 * Set random placeholder for AI input
 */
export function setRandomPlaceholder() {
    const input = document.getElementById('ai-movie-input');
    if (input) {
        const randomIndex = Math.floor(Math.random() * POETIC_PLACEHOLDERS.length);
        input.placeholder = POETIC_PLACEHOLDERS[randomIndex];
    }
}

// ============================================
// MOOD & ERA MAPPINGS
// ============================================

export const MOOD_GENRES = {
    chill: '35,10751',
    adrenaline: '28,53',
    tearjerker: '18,10749',
    mindbending: '878,9648',
    funny: '35,16',
};

export const ERA_RANGES = {
    'classic': { gte: '1920-01-01', lte: '1969-12-31' },
    '80s': { gte: '1980-01-01', lte: '1989-12-31' },
    '90s': { gte: '1990-01-01', lte: '1999-12-31' },
    '2000s': { gte: '2000-01-01', lte: '2009-12-31' },
    '2010s': { gte: '2010-01-01', lte: '2019-12-31' },
    '2020s': { gte: '2020-01-01', lte: '2029-12-31' },
};

// ============================================
// KEYWORD EXTRACTION
// ============================================

/**
 * Extract movie keywords from natural language query
 */
export function extractMovieKeywords(query) {
    const lowerQuery = query.toLowerCase();
    const keywords = [];

    if (lowerQuery.includes('komik') || lowerQuery.includes('güle') || lowerQuery.includes('eğlen')) {
        keywords.push('comedy');
    }
    if (lowerQuery.includes('korku') || lowerQuery.includes('geril') || lowerQuery.includes('korkun')) {
        keywords.push('horror', 'thriller');
    }
    if (lowerQuery.includes('aksiyon') || lowerQuery.includes('heyecan')) {
        keywords.push('action');
    }
    if (lowerQuery.includes('romantik') || lowerQuery.includes('aşk') || lowerQuery.includes('sevgi')) {
        keywords.push('romance');
    }
    if (lowerQuery.includes('dram') || lowerQuery.includes('ağla') || lowerQuery.includes('duygu')) {
        keywords.push('drama');
    }
    if (lowerQuery.includes('bilim') || lowerQuery.includes('uzay') || lowerQuery.includes('gelecek')) {
        keywords.push('science fiction');
    }
    if (lowerQuery.includes('animasyon') || lowerQuery.includes('çizgi')) {
        keywords.push('animation');
    }

    return keywords;
}

// ============================================
// DISCOVER HANDLERS
// ============================================

/**
 * Handle AI-powered search
 */
export async function handleAISearch() {
    const input = document.getElementById('ai-movie-input');
    const query = input?.value?.trim();

    if (!query || query.length < 3) {
        showToast('Lütfen ne tür bir film izlemek istediğini yaz.');
        return;
    }

    showToast('🤖 Gemini düşünüyor...');

    try {
        // Check if AIService is available
        if (window.AIService && typeof window.AIService.getRecommendations === 'function') {
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
                keywords: keywords,
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
            keywords: keywords,
        });
    }
}

/**
 * Handle wizard-based search
 */
export async function handleWizardSearch() {
    const activeChip = document.querySelector('.mood-chip.active');
    const mood = activeChip?.dataset.mood || '';
    const genre = activeChip?.dataset.genre || '';

    const activeEra = document.querySelector('.era-chip.active');
    const era = activeEra?.dataset.era || '';

    showToast('Öneriler yükleniyor...');

    await showDiscoverResults({
        source: 'wizard',
        mood: mood,
        genre: genre,
        era: era,
    });
}

/**
 * Handle surprise me
 */
export async function handleSurpriseMe() {
    showToast('Sürpriz hazırlanıyor! 🎲');

    await showDiscoverResults({
        source: 'surprise',
        random: true,
    });
}

// ============================================
// DISCOVER RESULTS
// ============================================

/**
 * Show discover results
 */
export async function showDiscoverResults(params) {
    let url = `${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${CONFIG.LANGUAGE}&sort_by=popularity.desc&vote_count.gte=100`;

    // Add genre filter
    if (params.genre) {
        url += `&with_genres=${params.genre}`;
    } else if (params.mood && MOOD_GENRES[params.mood]) {
        url += `&with_genres=${MOOD_GENRES[params.mood]}`;
    }

    // Add era filter
    if (params.era && ERA_RANGES[params.era]) {
        url += `&primary_release_date.gte=${ERA_RANGES[params.era].gte}&primary_release_date.lte=${ERA_RANGES[params.era].lte}`;
    }

    // For surprise, add randomness
    if (params.random) {
        url += `&page=${Math.floor(Math.random() * 5) + 1}&vote_average.gte=7`;
    }

    try {
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results && data.results.length > 0) {
            let movies = data.results;
            if (params.random) {
                movies = movies.sort(() => Math.random() - 0.5);
            }
            displayDiscoverResultsView(movies, params.source);
        } else {
            showToast('Bu kriterlere uygun film bulunamadı.');
        }
    } catch (error) {
        console.error('Discover results error:', error);
        showToast('Öneriler yüklenirken hata oluştu.');
    }
}

/**
 * Display discover results in wizard view
 */
export function displayDiscoverResultsView(movies, source) {
    const sourceLabels = {
        'ai': '🤖 Senin İçin Öneriler',
        'wizard': '✨ Seçimlerine Göre',
        'surprise': '🎲 Sürpriz Seçimler',
    };

    const label = sourceLabels[source] || 'Öneriler';

    const resultsContainer = document.getElementById('wizard-results');
    const resultsTitle = document.getElementById('wizard-results-title');
    const resultsGrid = document.getElementById('wizard-results-grid');

    if (!resultsContainer || !resultsGrid) {
        console.error('Wizard results container not found');
        return;
    }

    resultsTitle.textContent = label;
    resultsContainer.classList.add('active');
    resultsGrid.innerHTML = '';

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
            if (window.openDetailModal) {
                window.openDetailModal(movie.id, 'movie');
            } else if (window.openDetail) {
                window.openDetail(movie.id, 'movie');
            }
        };
        resultsGrid.appendChild(card);
    });

    resultsContainer.scrollTop = 0;
}

/**
 * Close wizard results
 */
export function closeWizardResults() {
    const resultsContainer = document.getElementById('wizard-results');
    if (resultsContainer) {
        resultsContainer.classList.remove('active');
    }
}

// ============================================
// DAILY RECOMMENDATION
// ============================================

/**
 * Load daily recommendation
 */
export async function loadDailyRecommendation() {
    const stored = localStorage.getItem(DAILY_REC_KEY);
    const today = new Date().toDateString();

    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today && data.movie) {
            renderDailyCard(data.movie, data.category);
            return;
        }
    }

    try {
        const dayOfWeek = new Date().getDay();
        const categoryIndex = dayOfWeek % DAILY_REC_CATEGORIES.length;
        const category = DAILY_REC_CATEGORIES[categoryIndex];

        let movies = [];
        if (category.list) {
            const resp = await fetch(`${API_URLS.TMDB_BASE}/movie/${category.list}?api_key=${CONFIG.TMDB_API_KEY}&language=${CONFIG.LANGUAGE}&page=1`);
            const data = await resp.json();
            movies = data.results || [];
        } else if (category.genres) {
            const genreStr = category.genres.join(',');
            const resp = await fetch(`${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${CONFIG.LANGUAGE}&with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await resp.json();
            movies = data.results || [];
        }

        if (movies.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(movies.length, 10));
            const selected = movies[randomIndex];

            localStorage.setItem(DAILY_REC_KEY, JSON.stringify({
                date: today,
                movie: selected,
                category: category.label,
            }));

            renderDailyCard(selected, category.label);
        }
    } catch (error) {
        console.error('Daily recommendation error:', error);
    }
}

/**
 * Render daily recommendation card
 */
export function renderDailyCard(movie, categoryLabel) {
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
    const discoverTopInfo = document.getElementById('discover-top-info');

    if (!movie) return;

    // Save movie ID for clicking
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

    // Update legacy banner elements
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
        dailyCard.onclick = () => {
            if (window.openDetailModal) {
                window.openDetailModal(movie.id, 'movie');
            } else if (window.openDetail) {
                window.openDetail(movie.id, 'movie');
            }
        };
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

    updateDiscoverHeroTimer();
}

/**
 * Update timer for discover hero
 */
export function updateDiscoverHeroTimer() {
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

/**
 * Update daily timer (legacy)
 */
export function updateDailyTimer() {
    updateDiscoverHeroTimer();
}

/**
 * Open daily recommendation
 */
export function openDailyRecommendation() {
    const discoverTopInfo = document.getElementById('discover-top-info');
    const movieId = discoverTopInfo?.dataset?.movieId;
    if (movieId) {
        if (window.openDetailModal) {
            window.openDetailModal(parseInt(movieId), 'movie');
        } else if (window.openDetail) {
            window.openDetail(parseInt(movieId), 'movie');
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize discover module
 */
export function initDiscoverModule() {
    // Load Daily Recommendation
    loadDailyRecommendation();

    // Update timer every minute
    setInterval(updateDailyTimer, 60000);
    updateDailyTimer();

    // Set random poetic placeholder
    setRandomPlaceholder();

    // Mood chips toggle
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
}

// ============================================
// WINDOW EXPORTS (Legacy Compatibility)
// ============================================

if (typeof window !== 'undefined') {
    window.handleAISearch = handleAISearch;
    window.handleWizardSearch = handleWizardSearch;
    window.handleSurpriseMe = handleSurpriseMe;
    window.closeWizardResults = closeWizardResults;
    window.openDailyRecommendation = openDailyRecommendation;
    window.initDiscoverModule = initDiscoverModule;
    window.loadDailyRecommendation = loadDailyRecommendation;
    window.setRandomPlaceholder = setRandomPlaceholder;
}
