// ============================================
// LUMI - Person Page Feature Module
// v1.0.0
// Dedicated actor/director page with bio, filmography, collaborators, awards
// ============================================

import { state } from '../lib/state.js';
import { TMDBService, RatingsService } from '../services/api.js';
import { navigateTo } from '../lib/navigation.js';

// ============================================
// MODULE STATE
// ============================================

let currentPersonId = null;
let currentCredits = null;
let currentFilter = 'all'; // all | movie | tv | director
let currentSort = 'date'; // date | rating

// ============================================
// INIT
// ============================================

/**
 * Initialize person page event delegation.
 * Call once on app startup.
 */
export function initPersonPage() {
    const container = document.getElementById('view-person');
    if (!container) return;

    // Event delegation for filter chips
    container.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (chip) {
            currentFilter = chip.dataset.filter;
            container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderFilmographyGrid(currentCredits);
            return;
        }

        // Sort select handled via change event — but also support sort buttons
        const sortBtn = e.target.closest('[data-sort]');
        if (sortBtn) {
            currentSort = sortBtn.dataset.sort;
            container.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
            sortBtn.classList.add('active');
            renderFilmographyGrid(currentCredits);
            return;
        }

        // Back button
        if (e.target.closest('.person-back-btn')) {
            handlePersonBack();
            return;
        }

        // Show more biography
        if (e.target.closest('.person-show-more')) {
            const bio = container.querySelector('.person-biography');
            const btn = container.querySelector('.person-show-more');
            if (bio) {
                bio.classList.toggle('expanded');
                btn.textContent = bio.classList.contains('expanded') ? 'Show less' : 'Show more';
            }
            return;
        }

        // Collaborator chip click
        const collabChip = e.target.closest('.collaborator-chip[data-person-id]');
        if (collabChip) {
            const personId = parseInt(collabChip.dataset.personId);
            loadPersonPage(personId);
            return;
        }

        // Filmography card click
        const filmCard = e.target.closest('.filmography-card[data-id]');
        if (filmCard) {
            const id = parseInt(filmCard.dataset.id);
            const mediaType = filmCard.dataset.mediaType;
            navigateTo('home');
            if (window.openDetail) {
                window.openDetail(id, mediaType);
            }
            return;
        }
    });

    // Sort select change
    container.addEventListener('change', (e) => {
        if (e.target.id === 'filmography-sort-select') {
            currentSort = e.target.value;
            renderFilmographyGrid(currentCredits);
        }
    });

    // Keyboard support for filter chips
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const chip = e.target.closest('.filter-chip');
            if (chip) {
                e.preventDefault();
                chip.click();
            }
        }
    });
}

// ============================================
// LOAD PERSON PAGE
// ============================================

/**
 * Load and render the person page for a given TMDB person ID.
 * @param {number} personId - TMDB person ID
 */
export async function loadPersonPage(personId) {
    currentPersonId = personId;
    currentFilter = 'all';
    currentSort = 'date';

    // Navigate to person view
    navigateTo('person');

    const container = document.querySelector('#view-person .person-page');
    if (!container) return;

    // Show loading skeleton
    container.innerHTML = buildPersonSkeleton();

    try {
        const langParam = state.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';

        // Fetch person details, credits, and external_ids in parallel
        const [person, credits, externalIds] = await Promise.all([
            TMDBService.fetch(`/person/${personId}?language=${langParam}`),
            TMDBService.fetch(`/person/${personId}/combined_credits?language=${langParam}`),
            TMDBService.fetch(`/person/${personId}/external_ids`),
        ]);

        currentCredits = credits;

        // Fetch awards via OMDb if IMDB ID available (non-critical, fail silently)
        let awards = null;
        if (externalIds && externalIds.imdb_id) {
            try {
                const ratingsData = await RatingsService.getAllRatings(externalIds.imdb_id);
                awards = ratingsData?.awards || null;
                // Normalize "N/A" to null
                if (awards === 'N/A' || awards === '' ) awards = null;
            } catch {
                // awards are non-critical
            }
        }

        // Render full page
        container.innerHTML = buildPersonPage(person, credits, awards);

        // Attach sort select listener (re-render grid on change)
        // (handled by delegated listener in initPersonPage)

        // Load collaborators async (non-blocking)
        loadCollaborators(credits);

        // Watchlist monitoring: store streaming snapshot for STRM-03
        storeWatchlistStreamingSnapshot(person.id);

    } catch (error) {
        console.error('[Person] Load error:', error);
        container.innerHTML = buildPersonError();
    }
}

// ============================================
// BACK NAVIGATION
// ============================================

function handlePersonBack() {
    const returnTo = state.returnToDetail;
    if (returnTo && returnTo.id) {
        navigateTo(state.lastPage || 'home');
        if (window.openDetail) {
            window.openDetail(returnTo.id, returnTo.type);
        }
    } else {
        navigateTo(state.lastPage || 'home');
    }
}

// ============================================
// PAGE BUILDERS
// ============================================

function buildPersonSkeleton() {
    return `
        <div class="person-back-btn" role="button" tabindex="0" aria-label="Go back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
        </div>
        <div class="person-bio skeleton-bio">
            <div class="skeleton person-photo" style="width:160px;height:240px;border-radius:var(--radius-md)"></div>
            <div class="skeleton-bio-lines">
                <div class="skeleton" style="height:32px;width:60%;border-radius:4px;margin-bottom:12px"></div>
                <div class="skeleton" style="height:16px;width:80%;border-radius:4px;margin-bottom:8px"></div>
                <div class="skeleton" style="height:16px;width:70%;border-radius:4px;margin-bottom:8px"></div>
                <div class="skeleton" style="height:16px;width:50%;border-radius:4px"></div>
            </div>
        </div>
        <div class="skeleton" style="height:200px;border-radius:var(--radius-md);margin-top:var(--space-xl)"></div>
    `;
}

function buildPersonPage(person, credits, awards) {
    const bioHTML = buildPersonBioHTML(person);
    const awardsHTML = buildPersonAwardsHTML(awards);
    const filmographyHTML = buildFilmographySection(credits);

    return `
        <button class="person-back-btn" aria-label="Go back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
        </button>

        ${bioHTML}
        ${awardsHTML}
        ${filmographyHTML}

        <div class="collaborators-section" id="collaborators-section">
            <h4>Frequently Works With</h4>
            <div class="collaborators-scroll" id="collaborators-scroll">
                <p class="label" style="color:var(--text-muted)">Loading collaborators...</p>
            </div>
        </div>
    `;
}

function buildPersonBioHTML(person) {
    const locale = state.currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
    const photoUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
        : '';

    const birthDate = person.birthday
        ? new Date(person.birthday).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    const metaParts = [];
    if (birthDate) metaParts.push(`<span>${birthDate}</span>`);
    if (person.place_of_birth) metaParts.push(`<span>${person.place_of_birth}</span>`);
    if (person.known_for_department) metaParts.push(`<span>${person.known_for_department}</span>`);

    const biography = person.biography || '';
    const hasBio = biography.length > 0;

    return `
        <div class="person-bio">
            <div class="person-photo-wrap">
                ${photoUrl
        ? `<img src="${photoUrl}" alt="${escapeHtml(person.name)}" class="person-photo" loading="lazy">`
        : '<div class="person-photo person-photo-placeholder"><span class="material-symbols-outlined" style="font-size:48px;color:var(--text-muted)">person</span></div>'
}
            </div>
            <div class="person-bio-content">
                <h2 class="person-name">${escapeHtml(person.name)}</h2>
                ${metaParts.length ? `<div class="person-meta label">${metaParts.join('<span class="person-meta-sep">·</span>')}</div>` : ''}
                ${hasBio ? `
                    <p class="person-biography body-text">${escapeHtml(biography)}</p>
                    ${biography.length > 300 ? '<button class="person-show-more">Show more</button>' : ''}
                ` : ''}
            </div>
        </div>
    `;
}

function buildPersonAwardsHTML(awards) {
    if (!awards || awards === 'N/A') return '';
    return `
        <div class="person-awards">
            <span class="material-symbols-outlined person-awards__icon">emoji_events</span>
            <span class="person-awards__text">${escapeHtml(awards)}</span>
        </div>
    `;
}

function buildFilmographySection(credits) {
    const isLang = state.currentLanguage === 'tr';
    const filmographyLabel = isLang ? 'Filmografi' : 'Filmography';
    const allLabel = isLang ? 'Tümü' : 'All';
    const moviesLabel = isLang ? 'Filmler' : 'Movies';
    const tvLabel = isLang ? 'Diziler' : 'TV Shows';
    const directorLabel = isLang ? 'Yönetmen olarak' : 'As Director';
    const newestLabel = isLang ? 'En yeniden' : 'Newest first';
    const ratingLabel = isLang ? 'Puana göre' : 'By rating';

    const gridHTML = buildFilmographyGridHTML(credits, 'all', 'date');

    return `
        <div class="filmography-section">
            <div class="filmography-header">
                <h4>${filmographyLabel}</h4>
                <div class="filmography-sort">
                    <select id="filmography-sort-select" class="filmography-sort-select" aria-label="Sort filmography">
                        <option value="date">${newestLabel}</option>
                        <option value="rating">${ratingLabel}</option>
                    </select>
                </div>
            </div>
            <div class="filmography-filters" role="group" aria-label="Filter filmography">
                <button class="filter-chip active" data-filter="all" tabindex="0">${allLabel}</button>
                <button class="filter-chip" data-filter="movie" tabindex="0">${moviesLabel}</button>
                <button class="filter-chip" data-filter="tv" tabindex="0">${tvLabel}</button>
                <button class="filter-chip" data-filter="director" tabindex="0">${directorLabel}</button>
            </div>
            <div class="filmography-grid" id="filmography-grid">
                ${gridHTML}
            </div>
        </div>
    `;
}

function buildFilmographyGridHTML(credits, filter, sort) {
    if (!credits) {
        return '<p class="label" style="color:var(--text-muted)">No filmography found.</p>';
    }

    let items = [];

    if (filter === 'all') {
        // Deduplicated union of cast + crew by TMDB ID
        const seen = new Set();
        const all = [...(credits.cast || []), ...(credits.crew || [])];
        for (const item of all) {
            const key = `${item.id}_${item.media_type}`;
            if (!seen.has(key)) {
                seen.add(key);
                items.push(item);
            }
        }
    } else if (filter === 'movie') {
        items = (credits.cast || []).filter(c => c.media_type === 'movie');
    } else if (filter === 'tv') {
        items = (credits.cast || []).filter(c => c.media_type === 'tv');
    } else if (filter === 'director') {
        items = (credits.crew || []).filter(c => c.job === 'Director');
    }

    // Sort by vote_count desc first, then apply user sort (limit at 80 for perf)
    items = items
        .filter(item => item.poster_path) // only items with poster
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        .slice(0, 80);

    if (sort === 'date') {
        items.sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
            const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
            return dateB - dateA;
        });
    } else if (sort === 'rating') {
        items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }

    if (items.length === 0) {
        return '<p class="label" style="color:var(--text-muted)">No filmography found.</p>';
    }

    return items.map(item => {
        const title = item.title || item.name || '';
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const posterUrl = `https://image.tmdb.org/t/p/w300${item.poster_path}`;
        const score = item.vote_average ? item.vote_average.toFixed(1) : '';

        return `
            <div class="filmography-card" data-id="${item.id}" data-media-type="${item.media_type}"
                role="button" tabindex="0" aria-label="${escapeHtml(title)}">
                <img src="${posterUrl}" alt="${escapeHtml(title)}" class="filmography-card__poster" loading="lazy">
                <div class="filmography-card__title">${escapeHtml(title)}</div>
                <div class="filmography-card__year">${year}${score ? ` · ★${score}` : ''}</div>
            </div>
        `;
    }).join('');
}

/**
 * Re-render just the filmography grid (used by filter/sort changes)
 */
function renderFilmographyGrid(credits) {
    const grid = document.getElementById('filmography-grid');
    if (!grid) return;
    grid.innerHTML = buildFilmographyGridHTML(credits, currentFilter, currentSort);
}

// ============================================
// COLLABORATORS (Frequently Works With)
// ============================================

async function loadCollaborators(credits) {
    const section = document.getElementById('collaborators-section');
    const scroll = document.getElementById('collaborators-scroll');
    if (!section || !scroll) return;

    try {
        // Take top 10 cast titles by vote_count to limit API calls (N+1 fix)
        const castItems = (credits?.cast || [])
            .filter(item => item.vote_count > 0)
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
            .slice(0, 10);

        if (castItems.length === 0) {
            section.style.display = 'none';
            return;
        }

        // Fetch credits for top 10 titles in parallel (max 10 API calls)
        const creditsFetches = castItems.map(item =>
            TMDBService.fetch(`/${item.media_type}/${item.id}/credits`)
                .catch(() => null)
        );
        const allCreditsResults = await Promise.all(creditsFetches);

        // Count co-occurrence of other person IDs
        const collaboratorCount = new Map();
        const collaboratorInfo = new Map();

        for (const result of allCreditsResults) {
            if (!result?.cast) continue;
            for (const person of result.cast) {
                if (person.id === currentPersonId) continue;
                const count = (collaboratorCount.get(person.id) || 0) + 1;
                collaboratorCount.set(person.id, count);
                if (!collaboratorInfo.has(person.id)) {
                    collaboratorInfo.set(person.id, person);
                }
            }
        }

        // Filter collaborators appearing in 2+ shared titles, take top 8
        const collaborators = Array.from(collaboratorCount.entries())
            .filter(([, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id]) => collaboratorInfo.get(id))
            .filter(Boolean);

        if (collaborators.length === 0) {
            section.style.display = 'none';
            return;
        }

        const chips = collaborators.map(person => {
            const avatarUrl = person.profile_path
                ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                : '';
            const safeName = escapeHtml(person.name || '');

            return `
                <div class="collaborator-chip" data-person-id="${person.id}"
                    role="button" tabindex="0" aria-label="${safeName}">
                    ${avatarUrl
        ? `<img src="${avatarUrl}" alt="${safeName}" class="collaborator-chip__avatar" loading="lazy">`
        : '<div class="collaborator-chip__avatar collaborator-chip__avatar--placeholder"><span class="material-symbols-outlined" style="font-size:24px;color:var(--text-muted)">person</span></div>'
}
                    <span class="collaborator-chip__name label">${safeName}</span>
                </div>
            `;
        }).join('');

        scroll.innerHTML = chips;
    } catch (error) {
        console.warn('[Person] Collaborators load error:', error);
        section.style.display = 'none';
    }
}

// ============================================
// STRM-03: Watchlist Streaming Snapshot
// ============================================

/**
 * Store streaming snapshot for watchlist items (STRM-03 data infrastructure).
 * This enables Phase 4 to compare snapshots and detect new platform availability.
 * No notification UI — this is data infrastructure only.
 */
async function storeWatchlistStreamingSnapshot(_personId) {
    try {
        // Only run if user is authenticated and firebase is available
        const { firebase } = window;
        if (!firebase) return;

        const auth = firebase.auth();
        const user = auth.currentUser;
        if (!user) return;

        const db = firebase.firestore();
        const watchlistItems = JSON.parse(localStorage.getItem('watchlist_items') || '[]');

        if (watchlistItems.length === 0) return;

        // For each watchlist item, check if we have streaming data in state
        // This is opportunistic — we don't fetch new data here, just record what we have
        const country = state.currentRegion || 'TR';

        for (const item of watchlistItems.slice(0, 5)) { // limit to 5 to avoid hammering
            const streamingData = state.currentStreamingData;
            if (!streamingData || state.currentItemId !== item.id) continue;

            const docId = `${user.uid}_${item.id}`;
            const docData = {
                userId: user.uid,
                tmdbId: item.id,
                country,
                providers: (streamingData.providers || []).map(p => ({
                    serviceId: p.serviceId,
                    serviceName: p.serviceName,
                })),
                checkedAt: firebase.firestore.Timestamp.now(),
            };

            await db.collection('watchlistStreaming').doc(docId).set(docData, { merge: true });
        }
    } catch (err) {
        // Non-critical infrastructure — fail silently
        console.warn('[STRM-03] Snapshot store error:', err);
    }
}

// ============================================
// ERROR STATE
// ============================================

function buildPersonError() {
    const isLang = state.currentLanguage === 'tr';
    const msg = isLang
        ? 'Bu kişinin bilgisi yüklenemedi. Tekrar dene.'
        : "Couldn't load this person's info. Try again.";

    return `
        <button class="person-back-btn" aria-label="Go back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back</span>
        </button>
        <div class="person-error">
            <span class="material-symbols-outlined" style="font-size:48px;color:var(--text-muted)">error_outline</span>
            <p class="body-text">${msg}</p>
        </div>
    `;
}

// ============================================
// UTILITY
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// WINDOW EXPORTS (Legacy Compatibility)
// ============================================

if (typeof window !== 'undefined') {
    window.loadPersonPage = loadPersonPage;
}
