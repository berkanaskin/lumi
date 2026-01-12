/**
 * LUMI - Loading & UI Feedback
 * v1.1.0
 * 
 * Loading indicators and UI feedback components.
 */

/**
 * Show loading indicator
 * @param {string} message - Optional loading message
 */
export function showLoading(message = '') {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.classList.add('active');
        const text = loader.querySelector('.loading-text');
        if (text && message) {
            text.textContent = message;
        }
    }
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.classList.remove('active');
    }
}

/**
 * Show no results message
 * @param {string} message - Optional custom message
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
 * Show skeleton loading cards
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton cards
 */
export function showSkeletons(container, count = 6) {
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-year"></div>
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
