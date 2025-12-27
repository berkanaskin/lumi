// ============================================
// NEREDE İZLERİM? v5.0 ALPHA
// Clean Mockup Design - Full Features
// ============================================

const APP_VERSION = '5.0.0';

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
    'zh': { lang: 'zh-CN', region: 'CN' }
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

    // Auth State
    currentUser: null,
    userTier: 'guest' // 'guest', 'free', 'premium'
};

// Platform URLs for deep linking
const PLATFORM_URLS = {
    // Global Platforms
    'Netflix': 'https://www.netflix.com/search?q=',
    'Amazon Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Amazon Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
    'Disney Plus': 'https://www.disneyplus.com/tr-tr/search?q=',
    'Disney+': 'https://www.disneyplus.com/tr-tr/search?q=',
    'Apple TV': 'https://tv.apple.com/tr/search?term=',
    'Apple TV Plus': 'https://tv.apple.com/tr/search?term=',
    'Apple TV+': 'https://tv.apple.com/tr/search?term=',
    'HBO Max': 'https://play.max.com/search?q=',
    'Max': 'https://play.max.com/search?q=',
    'Hulu': 'https://www.hulu.com/search?q=',
    'Paramount Plus': 'https://www.paramountplus.com/search/?q=',
    'Paramount+': 'https://www.paramountplus.com/search/?q=',
    'Mubi': 'https://mubi.com/tr/search?query=',
    'YouTube': 'https://www.youtube.com/results?search_query=',
    'YouTube Premium': 'https://www.youtube.com/results?search_query=',

    // Turkey Platforms
    'Gain': 'https://www.gain.tv/arama?q=',
    'Exxen': 'https://www.exxen.com/tr/arama?q=',
    'BluTV': 'https://www.blutv.com/ara?q=',
    'TOD': 'https://www.tod.tv/arama?query=',
    'Tabii': 'https://www.tabii.com/arama?q=',
    'beIN CONNECT': 'https://www.beinconnect.com.tr/arama?query=',
    'Puhu TV': 'https://puhutv.com/arama?q=',
    'puhutv': 'https://puhutv.com/arama?q=',

    // Rent/Buy Platforms
    'Google Play Movies': 'https://play.google.com/store/search?q=',
    'Google Play Movies & TV': 'https://play.google.com/store/search?q=',
    'Microsoft Store': 'https://www.microsoft.com/tr-tr/search/shop/movies-tv?q=',
    'Apple iTunes': 'https://tv.apple.com/tr/search?term='
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
    loadTheme();
    loadAuth(); // Check user session
    loadLanguage();
    setupEventListeners();
    await loadHomePage();

    // Initial sync for Suggested section visibility
    updateSuggestedVisibility();
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
        // User is logged in - show avatar and name
        const initial = state.currentUser.name?.charAt(0).toUpperCase() || '👤';
        authArea.innerHTML = `
            <button class="user-avatar-btn" id="user-menu-btn">
                <span class="user-avatar">${initial}</span>
                <span>${state.currentUser.name?.split(' ')[0] || 'Kullanıcı'}</span>
            </button>
        `;
        // Add logout listener
        document.getElementById('user-menu-btn')?.addEventListener('click', handleLogout);
    } else {
        // Guest - show login button
        authArea.innerHTML = `<button class="login-btn" id="login-btn">👤 Giriş</button>`;
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
        await window.AuthService.logout();
        state.currentUser = null;
        state.userTier = 'guest';
        localStorage.removeItem('userTier'); // Clear premium tier
        updateAuthUI();
        updateSuggestedVisibility();
        await loadHomePage();
    }
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
    if (elements.themeIcon) {
        elements.themeIcon.textContent = state.currentTheme === 'dark' ? '☀️' : '🌙';
    }
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
    closePremiumModal();
    alert('Tebrikler! Artık Premium üyesiniz! 🎉');

    // Reload current view to reflect changes
    if (state.currentPage === 'profile') {
        loadProfilePage();
    }

    // If in detail modal, close and re-open to update features
    if (elements.modal.classList.contains('visible') && state.currentItemId) {
        const id = state.currentItemId;
        const type = state.currentItemType;
        closeModal();
        setTimeout(() => openDetail(id, type), 100);
    }
}

// ============================================
// LANGUAGE & REGION MANAGEMENT
// ============================================

function loadLanguage() {
    // Try to get from local storage, otherwise default to 'tr'
    const saved = localStorage.getItem('language') || 'tr';
    changeLanguageState(saved);
}

function changeLanguageState(langCode) {
    const config = LANGUAGE_REGIONS[langCode] || LANGUAGE_REGIONS['tr'];

    state.currentLanguageCode = langCode;
    state.currentLanguage = config.lang;
    state.currentRegion = config.region;

    localStorage.setItem('language', langCode);

    if (elements.languageSelect) {
        elements.languageSelect.value = langCode;
    }
}

function handleLanguageChange(langCode) {
    changeLanguageState(langCode);

    // Reload current page with new language
    if (state.currentPage === 'home') {
        loadHomePage();
    } else if (state.currentPage === 'discover') {
        loadDiscoverPage();
    } else if (state.currentPage === 'favorites') {
        // Favorites are stored with specific data, might need re-fetching or just keeping as is
        // For now, keep as is as they are static data in localstorage
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Language select
    if (elements.languageSelect) {
        elements.languageSelect.addEventListener('change', (e) => {
            handleLanguageChange(e.target.value);
        });
    }

    // Logo click - go home
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
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

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        handleAutocomplete();
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

    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
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

            switch (page) {
                case 'home':
                    loadHomePage();
                    break;
                case 'discover':
                    loadDiscoverPage();
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

async function loadHomePage() {
    hideAllSections();
    elements.searchInput.value = '';
    elements.trendingSection.style.display = 'block';
    elements.newReleasesSection.style.display = 'block';
    elements.classicsSection.style.display = 'block';
    showLoading();

    try {
        const promises = [
            API.fetchTMDB(`/trending/all/week?language=${state.currentLanguage}`),
            API.fetchTMDB(`/movie/now_playing?language=${state.currentLanguage}`),
            API.getClassics(state.currentLanguage)
        ];

        // Fetch suggested content if user is logged in
        if (state.userTier !== 'guest') {
            promises.push(API.fetchTMDB(`/movie/top_rated?language=${state.currentLanguage}&page=2`));
        }

        const results = await Promise.all(promises);
        const trending = results[0];
        const newReleases = results[1];
        const classics = results[2];
        const suggested = results.length > 3 ? results[3] : null;

        hideLoading();

        // Display trending
        elements.trendingSlider.innerHTML = '';
        trending.results.slice(0, 15).forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.trendingSlider.appendChild(card);
        });

        // Display new releases
        elements.newReleasesSlider.innerHTML = '';
        newReleases.results.slice(0, 15).forEach(item => {
            const card = createMovieCard({ ...item, media_type: 'movie' }, 'movie');
            elements.newReleasesSlider.appendChild(card);
        });

        // Display classics
        if (elements.classicsSlider) {
            elements.classicsSlider.innerHTML = '';
            classics.results.slice(0, 15).forEach(item => {
                const card = createMovieCard({ ...item, media_type: 'movie' }, 'movie');
                elements.classicsSlider.appendChild(card);
            });
        }

        // Display suggested if available (members only)
        if (suggested && elements.suggestedSlider) {
            elements.suggestedSlider.innerHTML = '';
            suggested.results.slice(0, 15).forEach(item => {
                const card = createMovieCard({ ...item, media_type: 'movie' }, 'movie');
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

async function loadDiscoverPage() {
    hideAllSections();
    elements.discoverSection.style.display = 'block';
    showLoading();

    try {
        const [movies, tvShows] = await Promise.all([
            API.fetchTMDB(`/movie/top_rated?language=${state.currentLanguage}`),
            API.fetchTMDB(`/tv/top_rated?language=${state.currentLanguage}`)
        ]);

        const combined = [
            ...movies.results.slice(0, 10).map(m => ({ ...m, media_type: 'movie' })),
            ...tvShows.results.slice(0, 10).map(t => ({ ...t, media_type: 'tv' }))
        ].sort((a, b) => b.vote_average - a.vote_average);

        hideLoading();

        elements.discoverGrid.innerHTML = '';
        combined.forEach(item => {
            const card = createMovieCard(item, item.media_type);
            elements.discoverGrid.appendChild(card);
        });
    } catch (e) {
        hideLoading();
        console.error('Failed to load discover page:', e);
    }
}

function loadFavoritesPage(filterType = 'all') {
    hideAllSections();
    elements.favoritesSection.style.display = 'block';

    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    // Sort by rating (highest first)
    favorites.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    // Filter by type
    if (filterType === 'movie') {
        favorites = favorites.filter(f => f.media_type === 'movie');
    } else if (filterType === 'tv') {
        favorites = favorites.filter(f => f.media_type === 'tv');
    }

    const allFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    elements.favoritesCount.textContent = `${allFavorites.length} kayıtlı`;

    // Setup tabs
    const tabs = document.querySelectorAll('.fav-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === filterType) {
            tab.classList.add('active');
        }
        tab.onclick = () => loadFavoritesPage(tab.dataset.type);
    });

    if (favorites.length === 0) {
        const message = filterType === 'all'
            ? 'Henüz favori eklemediniz'
            : filterType === 'movie'
                ? 'Favori filminiz yok'
                : 'Favori diziniz yok';
        elements.favoritesGrid.innerHTML = `
            <div class="empty-favorites" style="grid-column: 1/-1;">
                <div class="icon">❤️</div>
                <p>${message}</p>
                <p class="hint">Film veya dizi detayında ❤️ butonuna tıklayarak favorilere ekleyebilirsiniz</p>
            </div>
        `;
        return;
    }

    elements.favoritesGrid.innerHTML = '';
    favorites.forEach(item => {
        const card = createMovieCard(item, item.media_type || 'movie');
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
                <div class="rating-item" data-id="${id}" data-type="${type}">
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
        </div>
    `;
}

// ============================================
// SEARCH & AUTOCOMPLETE
// ============================================

async function handleAutocomplete() {
    const query = elements.searchInput.value.trim();

    if (state.autocompleteTimeout) {
        clearTimeout(state.autocompleteTimeout);
    }

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    state.autocompleteTimeout = setTimeout(async () => {
        const data = await API.search(query, state.currentType, state.currentLanguage);

        if (data.results?.length > 0) {
            showAutocomplete(data.results.slice(0, 6));
        } else {
            hideAutocomplete();
        }
    }, 300);
}

function showAutocomplete(results) {
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

            hideAutocomplete();
            elements.searchInput.value = title;
            openDetail(id, type, title, year, original);
        });
    });

    dropdown.classList.add('visible');
}

function hideAutocomplete() {
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
        elements.resultsGrid.innerHTML = '';
        data.results.forEach(item => {
            const card = createMovieCard(item, item.media_type || 'movie');
            elements.resultsGrid.appendChild(card);
        });
        elements.resultsCount.textContent = `${data.results.length} sonuç`;
    } else {
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
    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterUrl = API.getPosterUrl(item.poster_path);

    card.innerHTML = `
        <div class="movie-poster">
            ${posterUrl
            ? `<img src="${posterUrl}" alt="${title}" loading="lazy">`
            : `<div class="no-image">🎬</div>`
        }
            <span class="card-badge">${mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
            ${rating ? `<span class="rating-badge">⭐ ${rating}</span>` : ''}
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            <span class="movie-year">${year}</span>
        </div>
    `;

    card.addEventListener('click', () => {
        openDetail(item.id, mediaType, title, year, item.original_title || item.original_name);
    });

    return card;
}

// ============================================
// DETAIL MODAL
// ============================================

async function openDetail(id, type, title, year, originalTitle) {
    // Store current item for premium re-render
    state.currentItemId = id;
    state.currentItemType = type;

    elements.modal.classList.add('visible');
    elements.modalBody.innerHTML = '<div class="loading-state visible"><div class="spinner"></div><p>Yükleniyor...</p></div>';
    document.body.style.overflow = 'hidden';

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
        let rtData = null;

        const imdbId = await API.getIMDBId(id, type);
        if (imdbId) {
            try {
                [imdbData, triviaData] = await Promise.all([
                    API.getMovieFromIMDB(imdbId),
                    API.getMovieTrivia(imdbId)
                ]);
            } catch (innerErr) {
                console.warn('IMDB/Trivia fetch error:', innerErr);
            }
        }

        // Rotten Tomatoes puanı çek (paralel olarak)
        try {
            rtData = await API.getRottenTomatoesRating(title, year);
        } catch (rtErr) {
            console.warn('RT fetch error:', rtErr);
        }

        // State'e kaydet
        state.currentImdbData = imdbData;
        state.currentTrivia = triviaData;
        state.currentCredits = credits;
        state.currentRTData = rtData;

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

    const year = dateDisplay;
    const runtime = details.runtime || (details.episode_run_time?.[0]);

    // Ratings
    const imdbRating = state.currentImdbData?.ratingsSummary?.aggregateRating;
    const tmdbRating = details.vote_average;
    const rtRating = state.currentRTData;

    // Check if in favorites
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
            ${writers ? `<div><strong>Yazar:</strong> ${writers}</div>` : ''}
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
                
                <div class="ratings-container">
                    <a href="https://www.imdb.com/title/${state.currentImdbData?.id || ''}" target="_blank" rel="noopener" class="rating-box imdb" title="IMDB'de görüntüle">
                        <span class="source">IMDB</span>
                        <span class="score">⭐ ${imdbRating ? imdbRating.toFixed(1) : '-'}</span>
                    </a>
                    <a href="https://www.themoviedb.org/${type}/${itemId}" target="_blank" rel="noopener" class="rating-box tmdb" title="TMDB'de görüntüle">
                        <span class="source">TMDB</span>
                        <span class="score">📈 ${tmdbRating ? tmdbRating.toFixed(1) : '-'}</span>
                    </a>
                    ${rtRating ? `
                    <a href="${rtRating.url || 'https://www.rottentomatoes.com'}" target="_blank" rel="noopener" class="rating-box rt" title="Rotten Tomatoes'da görüntüle">
                        <span class="source">RT</span>
                        <span class="score">🍅 ${rtRating.tomatometer || '-'}%</span>
                    </a>
                    ` : ''}
                </div>

                ${crewHtml}

                <div class="modal-actions">
                    <button class="action-btn fav-btn" id="fav-btn" data-id="${itemId}" data-type="${type}">
                        ${favBtnText}
                    </button>
                    <button class="action-btn notify-btn ${!isPremium ? 'locked' : ''}" id="notify-btn" ${!isMember ? 'disabled' : ''}>
                        ${isPremium ? '🔔 Bildirim' : '🔒 Bildirim (Premium)'}
                    </button>
                </div>
                
                ${isPremium ? `
                <div class="user-star-rating" data-item-id="${itemId}" data-item-type="${type}">
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
                </div>
                ` : `
                <div class="user-star-rating guest-prompt">
                    <span class="lock-icon">🔒</span>
                    <span>Puanlamak için ${isMember ? '<a href="#" class="upgrade-link" onclick="showPremiumModal()">Premium\'a geçin</a>' : '<a href="#" class="login-link">giriş yapın</a>'}</span>
                </div>
                `}
            </div>
        </div>
        
        <div class="modal-content-body">
            <div class="modal-section">
                <h3 class="section-heading">📺 Nerede İzlenir?</h3>
                ${renderProviders(providers, details.networks, type, title)}
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

    // Event Listeners
    document.getElementById('fav-btn').addEventListener('click', (e) => {
        toggleFavorite(details, type);
        const isFav = JSON.parse(localStorage.getItem('favorites') || '[]').some(f => f.id === details.id);
        e.target.textContent = isFav ? '❤️ Çıkar' : '🤍 Ekle';
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
            const existingRating = userRatings[`${itemType}_${itemId}`];
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
                value = Math.max(0.5, Math.min(10, value));
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

            // Save rating on drag end
            function handleDragEnd(e) {
                if (!isDragging) return;
                isDragging = false;

                const value = parseFloat(starValue.textContent) || 0;
                if (value > 0) {
                    const ratings = JSON.parse(localStorage.getItem('userRatings') || '{}');
                    ratings[`${itemType}_${itemId}`] = {
                        value: value,
                        title: state.currentTitle || 'Bilinmeyen'
                    };
                    localStorage.setItem('userRatings', JSON.stringify(ratings));
                }
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

function renderProviders(providers, networks, type, title) {
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

    if (!hasProviders && (!networks || networks.length === 0)) {
        return `<p class="no-providers">Bu içerik için ${state.currentCountry === 'TR' ? 'Türkiye\'de' : 'seçili ülkede'} platform bilgisi bulunamadı.</p>`;
    }

    return html;
}

function createProviderCard(provider, typeText, typeClass, encodedTitle) {
    const platformUrl = PLATFORM_URLS[provider.provider_name];
    const href = platformUrl ? platformUrl + encodedTitle : '#';
    const target = platformUrl ? '_blank' : '_self';

    return `
        <a href="${href}" target="${target}" rel="noopener" class="provider-card">
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
    elements.modalBody.innerHTML = '';

    const player = document.getElementById('youtube-player');
    if (player) player.innerHTML = '';

    // Show bottom nav when modal closes
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'flex';
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

// End of app.js
