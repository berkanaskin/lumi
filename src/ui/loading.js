/**
 * LUMI - Loading & UI Feedback
 * v2.0.0
 *
 * Loading indicators, spinners, and UI feedback components
 * with Lumi-branded CSS-based spinner.
 */

/**
 * Show CSS-based loading spinner
 * @param {HTMLElement} target - Target element (default: document.body)
 * @returns {HTMLElement} Spinner element
 */
export function showLoading(target = document.body) {
    // Remove existing spinner if any
    hideLoading();

    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-label', 'Loading...');

    loader.innerHTML = `
        <div class="spinner">
            <div class="spinner-ring"></div>
        </div>
    `;

    target.appendChild(loader);
    return loader;
}

/**
 * Hide loading spinner
 * @param {HTMLElement} loader - Spinner element (or removes all if not provided)
 */
export function hideLoading(loader = null) {
    if (loader && loader.parentNode) {
        loader.remove();
    } else {
        // Remove all spinners
        document.querySelectorAll('.loading-spinner').forEach(el => el.remove());
    }
}

/**
 * Show no results message
 * @param {string} message - Custom message
 */
export function showNoResults(message = 'Sonuç bulunamadı') {
    const noResults = document.getElementById('no-results');
    if (noResults) {
        noResults.classList.add('active');
        const text = noResults.querySelector('.no-results-text');
        if (text) {
            text.textContent = message;
        }
    }
}

/**
 * Hide no results message
 */
export function hideNoResults() {
    const noResults = document.getElementById('no-results');
    if (noResults) {
        noResults.classList.remove('active');
    }
}

/**
 * Show skeleton loading cards (placeholder animation)
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton cards
 */
export function showSkeletons(container, count = 6) {
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-poster skeleton"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title skeleton"></div>
                    <div class="skeleton-year skeleton"></div>
                </div>
            </div>
        `;
    }
}

/**
 * Update slider arrow visibility based on scroll position
 * @param {HTMLElement} slider - Slider element
 * @param {HTMLElement} leftArrow - Left arrow button
 * @param {HTMLElement} rightArrow - Right arrow button
 */
export function updateArrowVisibility(slider, leftArrow, rightArrow) {
    if (!slider) return;

    const scrollLeft = slider.scrollLeft;
    const maxScroll = slider.scrollWidth - slider.clientWidth;

    if (leftArrow) {
        leftArrow.style.display = scrollLeft > 10 ? 'flex' : 'none';
    }
    if (rightArrow) {
        rightArrow.style.display = scrollLeft < maxScroll - 10 ? 'flex' : 'none';
    }
}

/**
 * Scroll slider by amount
 * @param {HTMLElement} slider - Slider element
 * @param {number} direction - Scroll direction (-1 or 1)
 * @param {number} amount - Scroll amount in pixels
 */
export function scrollSlider(slider, direction, amount = 300) {
    if (!slider) return;

    slider.scrollBy({
        left: direction * amount,
        behavior: 'smooth'
    });
}

/**
 * Close all open dropdowns
 */
export function closeAllDropdowns() {
    // Header dropdowns
    document.querySelectorAll('.header-dropdown').forEach(d => {
        d.classList.remove('active');
    });

    // Autocomplete
    const autocomplete = document.getElementById('autocomplete-dropdown');
    if (autocomplete) {
        autocomplete.classList.remove('active');
    }

    // Trend chips
    const trendChips = document.getElementById('trend-chips-container');
    if (trendChips) {
        trendChips.classList.remove('active');
    }

    // Filter dropdowns
    document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('active');
    });
}

// Legacy compatibility
if (typeof window !== 'undefined') {
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showNoResults = showNoResults;
    window.hideNoResults = hideNoResults;
    window.updateArrowVisibility = updateArrowVisibility;
    window.closeAllDropdowns = closeAllDropdowns;
}
