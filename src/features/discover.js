// ============================================
// LUMI - Discover Feature Module
// v0.12.0
// ============================================

import { CONFIG } from '../config.js';
import { TMDBService, SearchService, EmbeddingService } from '../services/api.js';
import { showToast } from '../ui/toast.js';
import { showLoading, hideLoading } from '../ui/loading.js';
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
// EXAMPLE PROMPTS (Round 10 — replace mood/era chips)
// ============================================
//
// Tappable list of varied example queries. Tap → fills textarea + focuses
// (does NOT auto-submit — user can edit). Demonstrates the breadth of natural-
// language requests the AI search supports (mood + era + media type + occasion).
export const EXAMPLE_PROMPTS = [
    'Pazar akşamı izlenecek nostaljik bir film',
    'Beni gerçekten korkutacak modern bir korku dizisi',
    "90'lar romantik komedileri, mutlu sonla bitenler",
    'Aksiyon dolu, hızlı tempolu bir Kore dizisi',
    'Bilim kurgu sevenlere düşündürücü bir film',
    'Çocuklarla izlenecek macera filmi',
    'Soğuk bir kış akşamı için sıcak bir hikaye',
];

/**
 * Round 12: rotating placeholder INSIDE the textarea + a small "use this"
 * icon at top-right. No external bar/list anymore.
 *
 * Behavior:
 * - When textarea is empty AND unfocused, the `placeholder` attribute rotates
 *   through EXAMPLE_PROMPTS every 4 seconds.
 * - Rotation pauses on focus or any input.
 * - A small ⏎ icon (top-right corner of the textarea) is visible only while
 *   empty. Click → fills textarea with the current placeholder, focuses,
 *   places cursor at end, hides icon. Same effect on Tab key while empty.
 * - When textarea is cleared, icon reappears and rotation resumes.
 *
 * Replaces the Round 11 hint bar (rejected: user wanted the placeholder
 * itself to be usable, not a separate UI element).
 */
let _currentPlaceholder = '';
let _rotationTimer = null;

function _pickRandomPrompt(exclude = '') {
    const pool = EXAMPLE_PROMPTS.filter(p => p !== exclude);
    const list = pool.length > 0 ? pool : EXAMPLE_PROMPTS;
    return list[Math.floor(Math.random() * list.length)];
}

function _setPlaceholder(input, prompt) {
    _currentPlaceholder = prompt;
    if (input) input.setAttribute('placeholder', prompt);
}

function _startRotation(input) {
    _stopRotation();
    _rotationTimer = setInterval(() => {
        // Guard: only rotate while empty AND unfocused
        if (!input) return;
        const isEmpty = (input.value || '').length === 0;
        const isFocused = document.activeElement === input;
        if (!isEmpty || isFocused) return;
        _setPlaceholder(input, _pickRandomPrompt(_currentPlaceholder));
    }, 4000);
}

function _stopRotation() {
    if (_rotationTimer) {
        clearInterval(_rotationTimer);
        _rotationTimer = null;
    }
}

function _showFillBtn() {
    const btn = document.getElementById('console-prompt-fill-btn');
    if (btn) btn.classList.remove('is-hidden');
}

function _hideFillBtn() {
    const btn = document.getElementById('console-prompt-fill-btn');
    if (btn) btn.classList.add('is-hidden');
}

function _fillFromPlaceholder(input) {
    if (!input || !_currentPlaceholder) return;
    input.value = _currentPlaceholder;
    input.focus();
    try { input.setSelectionRange(input.value.length, input.value.length); } catch { /* noop */ }
    _hideFillBtn();
    _stopRotation();
}

export function renderExamplePrompts() {
    const input = document.getElementById('ai-movie-input');
    const fillBtn = document.getElementById('console-prompt-fill-btn');
    if (!input) return;

    // Initial random placeholder
    _setPlaceholder(input, _pickRandomPrompt());
    _showFillBtn();
    _startRotation(input);

    // Click the in-textarea icon → fill textarea with current placeholder
    fillBtn?.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        _fillFromPlaceholder(input);
    });

    // Tab key while focused on empty textarea → fill (prevents tab navigation)
    input.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Tab' || ev.shiftKey) return;
        if ((input.value || '').length > 0) return;
        ev.preventDefault();
        _fillFromPlaceholder(input);
    });

    // Resume rotation + show icon when textarea is cleared; hide when typing.
    input.addEventListener('input', () => {
        const hasText = (input.value || '').length > 0;
        if (hasText) {
            _hideFillBtn();
            _stopRotation();
        } else {
            _showFillBtn();
            _setPlaceholder(input, _pickRandomPrompt(_currentPlaceholder));
            _startRotation(input);
        }
    });

    // Pause rotation on focus (so the placeholder doesn't change under the user).
    input.addEventListener('focus', () => {
        _stopRotation();
    });
    input.addEventListener('blur', () => {
        if ((input.value || '').length === 0) _startRotation(input);
    });

    // Cleanup hook: clear interval when discover view unmounts/hides to avoid leaks.
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', _stopRotation, { once: true });
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
 * Handle AI-powered search using hybrid search endpoint
 */
export async function handleAISearch() {
    const input = document.getElementById('ai-movie-input');
    const query = input?.value?.trim();
    const primaryBtn = document.getElementById('console-primary-btn');

    if (!query || query.length < 3) {
        showToast('Lütfen ne tür bir film izlemek istediğini yaz.');
        return;
    }

    // Loading state on primary button
    if (primaryBtn) {
        primaryBtn.disabled = true;
        primaryBtn.classList.add('is-loading');
    }

    showToast('🤖 Aranıyor...');
    const spinner = showLoading();

    try {
        // Get userId for personalization
        const userId = window.AuthService?.currentUser?.uid || 'anonymous';

        // Call hybrid search endpoint (single attempt — no silent retry)
        const response = await SearchService.hybridSearch(query, userId);

        hideLoading(spinner);

        // Round 11: ALWAYS log the response so we can diagnose "öneri bulunamadı"
        // reports without users opening F12 mid-conversation. Cheap (one console line).
        console.warn('[AI Search] response:', response);

        if (response && Array.isArray(response.results) && response.results.length > 0) {
            displayDiscoverResultsView(response.results, 'ai');
            showToast(`✨ ${response.results.length} film önerisi bulundu!`);

            // Log metric (silent failure OK — non-critical telemetry)
            EmbeddingService.logMetric({
                type: 'search',
                query: query,
                resultsCount: response.results.length,
                source: response.source || 'hybrid',
                confidence: response.confidence || 0.8,
                timestamp: new Date().toISOString(),
            }).catch(() => {});

            EmbeddingService.logSearchQuery(query, userId, response.results.length).catch(() => {});
        } else {
            // Round 11: hardened empty-state classification.
            //   1. response missing entirely    → parse/network fail
            //   2. response.results undefined   → backend shape mismatch
            //   3. response.empty === true      → backend explicit empty (with reason)
            //   4. response.results.length === 0 → no matches (no explicit reason)
            const reason = response?.reason;
            let title = 'Öneri bulunamadı';
            let msg = 'Farklı bir şey dene.';

            if (!response) {
                title = 'Beklenmeyen bir hata oluştu';
                msg = 'Sunucudan boş yanıt geldi. Lütfen tekrar dene.';
            } else if (!Array.isArray(response.results)) {
                title = 'Beklenmeyen bir hata oluştu';
                msg = 'Yanıt biçimi tanınmadı. Lütfen tekrar dene.';
            } else if (response.empty === true) {
                if (reason === 'tmdb_lookup_failed') {
                    title = 'TMDB\'de bulunamadı';
                    msg = 'AI öneri verdi ama TMDB\'de eşleşme yok. Daha spesifik bir arama dene.';
                } else if (reason === 'gemini_empty') {
                    title = 'AI öneri üretemedi';
                    msg = 'Bu arama için öneri çıkmadı. Farklı kelimelerle dene.';
                } else if (reason === 'llm_timeout') {
                    title = 'AI servisi yanıt vermedi';
                    msg = 'Şu an AI servisi yanıt vermedi. Lütfen tekrar dene.';
                } else if (reason === 'llm_error') {
                    title = 'AI servisi hata verdi';
                    msg = 'AI servisinde geçici bir sorun var. Lütfen tekrar dene.';
                }
            } else {
                // results is array with length 0, no empty flag
                title = 'Sonuç bulunamadı';
                msg = 'Bu arama için sonuç çıkmadı. Farklı kelimelerle dene.';
            }
            renderSearchEmptyState(title, msg, query);
            showToast(title);
        }
    } catch (error) {
        console.error('[handleAISearch] Error:', error);
        hideLoading(spinner);

        // Round 4: classify error → render visible empty-state in results grid,
        // not just a toast. Users said toast UX is bad and they don't open F12.
        const msg = String(error?.message || '');
        const isTimeout = error?.code === 'TIMEOUT' || /timeout|timed out|abort/i.test(msg);
        let title;
        let body;
        if (isTimeout) {
            title = 'AI servisi yanıt vermedi';
            body = 'Şu an AI servisi yanıt vermedi. Lütfen tekrar dene.';
        } else if (/yapılandırma|not configured|GEMINI|GOOGLE_GENERATIVE/i.test(msg)) {
            title = 'Yapılandırma eksik';
            body = 'Yapılandırma eksik — sistem yöneticisine bildirin.';
        } else if (/404|not found|kullan/i.test(msg)) {
            title = 'Servis kullanılamıyor';
            body = 'Servis şu an kullanılamıyor. Lütfen biraz sonra tekrar dene.';
        } else if (/429|rate|fazla/i.test(msg)) {
            title = 'Çok fazla arama';
            body = 'Bir dakika bekleyip tekrar dene.';
        } else {
            title = 'Arama başarısız';
            const short = msg.length > 100 ? msg.slice(0, 100) + '…' : msg;
            body = short || 'Arama başarısız oldu. Tekrar deneyin.';
        }
        renderSearchEmptyState(title, body, query);
        showToast(title);
    } finally {
        if (primaryBtn) {
            primaryBtn.disabled = false;
            primaryBtn.classList.remove('is-loading');
        }
    }
}

/**
 * Single primary action handler for "Öner Bana" button.
 * Empty input → show hint toast (Sürpriz Yap is a separate button — don't conflate).
 * Non-empty input → AI hybrid search.
 */
export async function handleConsoleSubmit() {
    const input = document.getElementById('ai-movie-input');
    const value = (input?.value || '').trim();
    if (value.length === 0) {
        // Inline feedback — flash the input red + show hint placeholder.
        // Cleaner than a floating toast which appears in awkward positions.
        const lang = (window.i18n?.getLanguage?.() || document.documentElement.lang || 'tr').toLowerCase();
        const hint = lang.startsWith('en')
            ? 'Type what you want or hit Surprise Me'
            : "Önce ne aradığını yaz veya Sürpriz Yap'a bas";
        if (input) {
            const originalPlaceholder = input.placeholder;
            const originalBoxShadow = input.style.boxShadow;
            const originalBorderColor = input.style.borderColor;
            input.placeholder = hint;
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.18)';
            input.style.transition = 'border-color 200ms ease, box-shadow 200ms ease';
            input.classList.add('shake');
            // Remove shake class after animation; restore styles after 1.6s.
            setTimeout(() => input.classList.remove('shake'), 450);
            setTimeout(() => {
                input.style.borderColor = originalBorderColor;
                input.style.boxShadow = originalBoxShadow;
                input.placeholder = originalPlaceholder;
            }, 1800);
            input.focus();
        }
        return;
    }
    return handleAISearch();
}

/**
 * Round 4 fix: render a visible empty-state card in the wizard-results grid
 * when search fails or times out. Replaces toast-only feedback (users said
 * they miss toasts and don't open the dev console).
 *
 * Activates the wizard-results panel so the message is visible even if the
 * grid was previously hidden. Includes a retry button that re-runs the search.
 */
function renderSearchEmptyState(title, body, lastQuery = '') {
    const resultsContainer = document.getElementById('wizard-results');
    const resultsTitle = document.getElementById('wizard-results-title');
    const resultsGrid = document.getElementById('wizard-results-grid');
    if (!resultsContainer || !resultsGrid) return;

    if (resultsTitle) resultsTitle.textContent = title || 'Sonuç yok';

    const safeTitle = String(title || '').replace(/[<>&]/g, '');
    const safeBody = String(body || '').replace(/[<>&]/g, '');
    resultsGrid.innerHTML = `
        <div class="search-empty-state" style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 48px 24px;
            color: rgba(255,255,255,0.85);
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            max-width: 480px;
            margin: 0 auto;
        ">
            <div style="font-size: 40px; margin-bottom: 12px;">🤖</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${safeTitle}</div>
            <div style="font-size: 14px; line-height: 1.5; opacity: 0.75; margin-bottom: 20px;">${safeBody}</div>
            <button id="search-retry-btn" type="button" style="
                padding: 10px 24px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: none;
                border-radius: 999px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
            ">Tekrar dene</button>
        </div>
    `;
    resultsContainer.classList.add('active');

    const retryBtn = document.getElementById('search-retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const input = document.getElementById('ai-movie-input');
            if (input && lastQuery) input.value = lastQuery;
            handleAISearch();
        }, { once: true });
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
    // Build discover endpoint using TMDBService (routes through Edge Function)
    let endpoint = `/discover/movie?language=${CONFIG.LANGUAGE}&sort_by=popularity.desc&vote_count.gte=100`;

    // Add genre filter
    if (params.genre) {
        endpoint += `&with_genres=${params.genre}`;
    } else if (params.mood && MOOD_GENRES[params.mood]) {
        endpoint += `&with_genres=${MOOD_GENRES[params.mood]}`;
    }

    // Add era filter
    if (params.era && ERA_RANGES[params.era]) {
        endpoint += `&primary_release_date.gte=${ERA_RANGES[params.era].gte}&primary_release_date.lte=${ERA_RANGES[params.era].lte}`;
    }

    // For surprise, add randomness
    if (params.random) {
        endpoint += `&page=${Math.floor(Math.random() * 5) + 1}&vote_average.gte=7`;
    }

    try {
        const data = await TMDBService.fetch(endpoint);

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
 * Close wizard results.
 *
 * Round 13 (TASK A): also reset the AI search input state so reopening
 * "Öner Bana" feels fresh — empty textarea, rotating placeholder, ⏎ icon
 * back. Previously the textarea retained the last query.
 */
export function closeWizardResults() {
    const resultsContainer = document.getElementById('wizard-results');
    if (resultsContainer) {
        resultsContainer.classList.remove('active');
    }

    // Reset Öner Bana input state
    const input = document.getElementById('ai-movie-input');
    if (input) {
        input.value = '';
        input.blur();
    }
    // Restart placeholder rotation + show ⏎ icon. Same path used on first mount.
    _showFillBtn();
    if (input) {
        _setPlaceholder(input, _pickRandomPrompt(_currentPlaceholder));
        _startRotation(input);
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
            const data = await TMDBService.fetch(`/movie/${category.list}?language=${CONFIG.LANGUAGE}&page=1`);
            movies = data.results || [];
        } else if (category.genres) {
            const genreStr = category.genres.join(',');
            const data = await TMDBService.fetch(`/discover/movie?language=${CONFIG.LANGUAGE}&with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
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

    // Round 11: single rotating example-prompt hint (replaces Round 10 7-card list)
    renderExamplePrompts();

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
    window.handleConsoleSubmit = handleConsoleSubmit;
    window.handleSurpriseMe = handleSurpriseMe;
    window.closeWizardResults = closeWizardResults;
    window.openDailyRecommendation = openDailyRecommendation;
    window.initDiscoverModule = initDiscoverModule;
    window.loadDailyRecommendation = loadDailyRecommendation;
    window.setRandomPlaceholder = setRandomPlaceholder;
    window.renderExamplePrompts = renderExamplePrompts;
}
