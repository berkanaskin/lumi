// ============================================
// LUMI - API Service (Modern ESM)
// v1.2.0
// ============================================

import { CONFIG, API_URLS } from '../config.js';

/**
 * TMDB Service - Movie and TV data
 * Routes through Vercel Edge Function for security
 */
export const TMDBService = {
    /**
     * Generic TMDB API request (via Edge Function)
     */
    async fetch(endpoint, options = {}) {
        // Route through Edge Function instead of direct API call
        // Parse endpoint to separate path from query params
        const endpointUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
        const path = endpoint.split('?')[0];

        // Build Edge Function URL with endpoint and all query params
        const proxyUrl = new URL('/api/tmdb', window.location.origin);
        proxyUrl.searchParams.set('endpoint', path);

        // Forward all query parameters
        for (const [key, value] of endpointUrl.searchParams.entries()) {
            proxyUrl.searchParams.set(key, value);
        }

        try {
            const response = await fetch(proxyUrl.toString(), options);
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[TMDB] Fetch error:', error);
            return { results: [] };
        }
    },

    /**
     * Search for movies/TV shows
     */
    async search(query, type = 'multi', language = 'tr-TR') {
        const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
        const data = await this.fetch(
            `${endpoint}?language=${language}&query=${encodeURIComponent(query)}&page=1`
        );

        // Filter to only movies and TV shows for multi search
        if (type === 'multi' && data.results) {
            data.results = data.results.filter(
                item => item.media_type === 'movie' || item.media_type === 'tv'
            );
        }

        // Check for franchise/collection
        if (data.results?.length > 0) {
            const first = data.results[0];
            if (first.media_type === 'movie' && first.id) {
                try {
                    const details = await this.getDetails(first.id, 'movie', language);
                    if (details?.belongs_to_collection) {
                        const collection = await this.getCollection(
                            details.belongs_to_collection.id,
                            language
                        );
                        if (collection?.parts?.length > 1) {
                            const existingIds = new Set(data.results.map(r => r.id));
                            const newParts = collection.parts
                                .filter(p => !existingIds.has(p.id))
                                .map(p => ({ ...p, media_type: 'movie' }));
                            data.results.push(...newParts);
                        }
                    }
                } catch (e) {
                    console.log('[TMDB] Collection fetch failed:', e);
                }
            }
        }

        // Sort by relevance
        data.results = this.sortByRelevance(data.results || [], query);
        return data;
    },

    /**
     * Sort search results by relevance
     */
    sortByRelevance(results, query) {
        const queryLower = query.toLowerCase().trim();
        const queryNorm = this.normalizeTitle(queryLower);
        const now = new Date();

        return results.sort((a, b) => {
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            const originalA = (a.original_title || a.original_name || '').toLowerCase();
            const originalB = (b.original_title || b.original_name || '').toLowerCase();

            const titleANorm = this.normalizeTitle(titleA);
            const titleBNorm = this.normalizeTitle(titleB);
            const originalANorm = this.normalizeTitle(originalA);
            const originalBNorm = this.normalizeTitle(originalB);

            // Exact match (highest priority)
            const exactMatchA = titleANorm === queryNorm || originalANorm === queryNorm;
            const exactMatchB = titleBNorm === queryNorm || originalBNorm === queryNorm;

            if (exactMatchA && !exactMatchB) return -1;
            if (!exactMatchA && exactMatchB) return 1;

            // Starts with match
            const startsWithA = titleANorm.startsWith(queryNorm) || originalANorm.startsWith(queryNorm);
            const startsWithB = titleBNorm.startsWith(queryNorm) || originalBNorm.startsWith(queryNorm);

            if (startsWithA && !startsWithB) return -1;
            if (!startsWithA && startsWithB) return 1;

            // Contains match
            const containsA = titleANorm.includes(queryNorm) || originalANorm.includes(queryNorm);
            const containsB = titleBNorm.includes(queryNorm) || originalBNorm.includes(queryNorm);

            if (containsA && !containsB) return -1;
            if (!containsA && containsB) return 1;

            // Calculate score
            const franchiseMatchA = titleANorm.startsWith(queryNorm) ? 100 : (titleANorm.includes(queryNorm) ? 50 : 0);
            const franchiseMatchB = titleBNorm.startsWith(queryNorm) ? 100 : (titleBNorm.includes(queryNorm) ? 50 : 0);

            const popularityA = a.popularity || 0;
            const popularityB = b.popularity || 0;

            const voteCountBonusA = Math.min((a.vote_count || 0) / 100, 100);
            const voteCountBonusB = Math.min((b.vote_count || 0) / 100, 100);

            const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
            const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
            const recencyBonusA = dateA > new Date(now.getFullYear() - 3, 0, 1) ? 30 : 0;
            const recencyBonusB = dateB > new Date(now.getFullYear() - 3, 0, 1) ? 30 : 0;

            const scoreA = franchiseMatchA + popularityA + voteCountBonusA + recencyBonusA + (a.vote_average || 0) * 10;
            const scoreB = franchiseMatchB + popularityB + voteCountBonusB + recencyBonusB + (b.vote_average || 0) * 10;

            return scoreB - scoreA;
        });
    },

    /**
     * Normalize title for comparison
     */
    normalizeTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\sğüşıöçа-яё]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Get popular content
     */
    async getPopular(type = 'movie', language = 'tr-TR', page = 1) {
        return this.fetch(`/${type}/popular?language=${language}&page=${page}`);
    },

    /**
     * Get top rated content
     */
    async getTopRated(type = 'movie', language = 'tr-TR', page = 1) {
        return this.fetch(`/${type}/top_rated?language=${language}&page=${page}`);
    },

    /**
     * Get now playing (movies) or on the air (TV)
     */
    async getNowPlaying(type = 'movie', language = 'tr-TR') {
        const endpoint = type === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
        return this.fetch(`${endpoint}?language=${language}`);
    },

    /**
     * Get upcoming movies
     */
    async getUpcoming(language = 'tr-TR') {
        return this.fetch(`/movie/upcoming?language=${language}`);
    },

    /**
     * Get trending content
     */
    async getTrending(mediaType = 'all', timeWindow = 'week', language = 'tr-TR') {
        return this.fetch(`/trending/${mediaType}/${timeWindow}?language=${language}`);
    },

    /**
     * Get classic films (before 2000, high ratings)
     */
    async getClassics(language = 'tr-TR') {
        return this.fetch(
            `/discover/movie?language=${language}&sort_by=vote_average.desc&vote_count.gte=5000&primary_release_date.lte=2000-12-31&page=1`
        );
    },

    /**
     * Discover movies/TV with filters
     */
    async discover(type = 'movie', options = {}) {
        const {
            language = 'tr-TR',
            sortBy = 'popularity.desc',
            genres = [],
            year = null,
            minVoteCount = 100,
            page = 1,
        } = options;

        let endpoint = `/discover/${type}?language=${language}&sort_by=${sortBy}&vote_count.gte=${minVoteCount}&page=${page}`;

        if (genres.length > 0) {
            endpoint += `&with_genres=${genres.join(',')}`;
        }
        if (year) {
            const dateField = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
            endpoint += `&${dateField}=${year}`;
        }

        return this.fetch(endpoint);
    },

    /**
     * Get movie/TV details
     */
    async getDetails(id, type, language = 'tr-TR') {
        return this.fetch(`/${type}/${id}?language=${language}`);
    },

    /**
     * Get collection details
     */
    async getCollection(id, language = 'tr-TR') {
        return this.fetch(`/collection/${id}?language=${language}`);
    },

    /**
     * Get watch providers for a specific country
     */
    async getWatchProviders(id, type, country = 'TR') {
        const data = await this.fetch(`/${type}/${id}/watch/providers`);
        return data.results?.[country] || null;
    },

    /**
     * Get release dates
     */
    async getReleaseDates(movieId, country = 'TR') {
        const data = await this.fetch(`/movie/${movieId}/release_dates`);

        const countryRelease = data.results?.find(r => r.iso_3166_1 === country);
        if (!countryRelease) return null;

        const releases = countryRelease.release_dates || [];
        const theatrical = releases.find(r => r.type === 3) ||
            releases.find(r => r.type === 1) ||
            releases.find(r => r.type === 2);

        if (theatrical) {
            return {
                date: theatrical.release_date,
                type: theatrical.type,
                certification: theatrical.certification,
                note: theatrical.note,
            };
        }

        return null;
    },

    /**
     * Get cast and crew
     */
    async getCredits(id, type) {
        const data = await this.fetch(`/${type}/${id}/credits`);

        const cast = data.cast?.slice(0, 10) || [];
        const keyJobs = ['Director', 'Director of Photography', 'Editor', 'Writer', 'Screenplay', 'Original Music Composer'];
        const crew = (data.crew || [])
            .filter(person => keyJobs.includes(person.job))
            .filter((person, index, self) =>
                index === self.findIndex(p => p.id === person.id && p.job === person.job)
            );

        return { cast, crew };
    },

    /**
     * Get videos (trailers, etc.)
     */
    async getVideos(id, type) {
        const [trData, enData] = await Promise.all([
            this.fetch(`/${type}/${id}/videos?language=tr-TR`),
            this.fetch(`/${type}/${id}/videos?language=en-US`),
        ]);

        const allVideos = [...(trData.results || []), ...(enData.results || [])]
            .filter(video => video.site === 'YouTube');

        // Remove duplicates
        return allVideos.filter((video, index, self) =>
            index === self.findIndex(v => v.key === video.key)
        );
    },

    /**
     * Get external IDs (IMDB ID, etc.)
     */
    async getExternalIds(id, type) {
        return this.fetch(`/${type}/${id}/external_ids`);
    },

    /**
     * Get IMDB ID
     */
    async getIMDBId(tmdbId, mediaType) {
        const data = await this.getExternalIds(tmdbId, mediaType);
        return data?.imdb_id || null;
    },

    /**
     * Get poster URL
     */
    getPosterUrl(path, size = 'w500') {
        if (!path) return null;
        return `${API_URLS.TMDB_IMAGE}/${size}${path}`;
    },

    /**
     * Get backdrop URL
     */
    getBackdropUrl(path, size = 'w1280') {
        if (!path) return null;
        return `${API_URLS.TMDB_IMAGE}/${size}${path}`;
    },

    /**
     * Hybrid AI search - natural language movie/TV discovery
     * Implements embedding-first with LLM fallback
     */
    async hybridSearch(query, userId) {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Search query must be a non-empty string');
        }

        if (!userId) {
            throw new Error('userId is required for search');
        }

        try {
            // Round 4 fix: client-side 35s hard timeout. Backend has a 25s LLM ceiling
            // + ~5s TMDB enrichment, so 35s gives a small grace margin. If exceeded,
            // we throw a recognizable timeout error and the caller renders an empty-state.
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query.trim(),
                    userId: userId,
                    limit: 20,
                }),
                signal: AbortSignal.timeout(35_000),
            });

            if (!response.ok) {
                // Try to surface server-side error message for better diagnostics.
                let serverMsg = response.statusText;
                try {
                    const errBody = await response.json();
                    if (errBody?.error) serverMsg = errBody.error + (errBody.details ? ` (${errBody.details})` : '');
                } catch { /* non-JSON body — keep statusText */ }
                throw new Error(`Hybrid search failed: ${serverMsg}`);
            }

            return await response.json();
        } catch (error) {
            // Tag timeout/abort errors so the UI layer can show a specific message.
            if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
                const e = new Error('Search request timed out after 35s');
                e.code = 'TIMEOUT';
                e.cause = error;
                console.error('[TMDB] Hybrid search timeout:', error.name);
                throw e;
            }
            console.error('[TMDB] Hybrid search error:', error);
            throw error;
        }
    },

    /**
     * Get cost dashboard metrics (admin only)
     * Returns API usage, costs, alerts, and trends
     */
    async getCostDashboard(authToken) {
        if (!authToken || typeof authToken !== 'string') {
            throw new Error('Valid authentication token required');
        }

        try {
            const response = await fetch('/api/cost-dashboard', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized: Invalid or expired token');
                }
                if (response.status === 403) {
                    throw new Error('Forbidden: Admin access required');
                }
                throw new Error(`Cost dashboard failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[TMDB] Cost dashboard error:', error);
            throw error;
        }
    },
};

/**
 * YouTube Service - Trailers and videos
 */
export const YouTubeService = {
    /**
     * Search YouTube (via Edge Function)
     */
    async search(query, maxResults = 8) {
        // Route through Edge Function instead of direct API call
        const proxyUrl = new URL('/api/youtube', window.location.origin);
        proxyUrl.searchParams.set('endpoint', '/search');
        proxyUrl.searchParams.set('part', 'snippet');
        proxyUrl.searchParams.set('q', query);
        proxyUrl.searchParams.set('type', 'video');
        proxyUrl.searchParams.set('maxResults', maxResults);
        proxyUrl.searchParams.set('relevanceLanguage', 'tr');
        proxyUrl.searchParams.set('videoDuration', 'medium');

        try {
            const response = await fetch(proxyUrl.toString());
            const data = await response.json();

            if (data.error) {
                console.error('[YouTube] API error:', data.error.message);
                return [];
            }

            return data.items || [];
        } catch (error) {
            console.error('[YouTube] Search error:', error);
            return [];
        }
    },

    /**
     * Get movie videos (trailers, behind the scenes, etc.)
     */
    async getMovieVideos(movieTitle, year, originalTitle = null) {
        const searchTitle = originalTitle || movieTitle;
        const yearStr = year ? ` ${year}` : '';

        const categories = {
            trailer: {
                queries: [
                    `${searchTitle}${yearStr} official trailer`,
                    `${searchTitle}${yearStr} trailer HD`,
                    `${movieTitle}${yearStr} resmi fragman`,
                ],
                mustInclude: ['trailer', 'fragman', 'teaser'],
                maxResults: 6,
            },
            behindTheScenes: {
                queries: [
                    `${searchTitle}${yearStr} behind the scenes`,
                    `${searchTitle}${yearStr} making of featurette`,
                ],
                mustInclude: ['behind', 'making', 'set', 'kamera', 'featurette', 'bts'],
                maxResults: 4,
            },
            interview: {
                queries: [
                    `${searchTitle}${yearStr} cast interview`,
                    `${searchTitle}${yearStr} actors interview press`,
                ],
                mustInclude: ['interview', 'röportaj', 'press', 'talk', 'cast'],
                maxResults: 4,
            },
        };

        const results = {};

        for (const [key, config] of Object.entries(categories)) {
            let videos = [];
            for (const query of config.queries) {
                if (videos.length >= config.maxResults) break;
                const searchResults = await this.search(query, config.maxResults);
                videos = [...videos, ...searchResults];
            }
            videos = this.filterVideos(videos, config.mustInclude, movieTitle, searchTitle);
            results[key] = videos.slice(0, config.maxResults);
        }

        return results;
    },

    /**
     * Filter videos
     */
    filterVideos(videos, mustIncludeKeywords, movieTitle, originalTitle) {
        if (!movieTitle && !originalTitle) return videos;

        const seen = new Set();
        const movieTitleLower = (movieTitle || '').toLowerCase();
        const originalTitleLower = (originalTitle || movieTitleLower).toLowerCase();

        return videos.filter(video => {
            const title = video.snippet?.title?.toLowerCase() || '';
            const channel = video.snippet?.channelTitle?.toLowerCase() || '';
            const videoId = video.id?.videoId;

            if (!videoId || seen.has(videoId)) return false;
            seen.add(videoId);

            const hasMovieTitle = title.includes(movieTitleLower) ||
                title.includes(originalTitleLower);

            if (!hasMovieTitle) return false;

            const excludeKeywords = ['fan made', 'fanmade', 'parody', 'gameplay', 'game'];
            if (excludeKeywords.some(kw => title.includes(kw))) return false;

            const hasKeyword = mustIncludeKeywords.some(kw =>
                title.includes(kw) || channel.includes(kw)
            );

            const officialChannels = ['official', 'warner', 'sony', 'disney', 'universal', 'marvel'];
            const isOfficial = officialChannels.some(kw => channel.includes(kw));

            return hasKeyword || isOfficial;
        });
    },

    /**
     * Get YouTube thumbnail URL
     */
    getThumbnailUrl(videoId, quality = 'mqdefault') {
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    },
};

/**
 * Ratings Service - IMDB, Rotten Tomatoes, Metacritic
 * Routes through /api/omdb proxy — OMDB_API_KEY is server-side only.
 */
export const RatingsService = {
    /**
     * Get all ratings from OMDb via server-side proxy.
     * Returns imdb, rottenTomatoes, metacritic, and awards.
     */
    async getAllRatings(imdbId) {
        if (!imdbId) return null;

        try {
            const response = await fetch('/api/omdb?imdbId=' + encodeURIComponent(imdbId));

            if (!response.ok) return null;

            const data = await response.json();
            if (data.Response !== 'True') return null;

            const ratings = data.Ratings || [];
            const findRating = (source) => {
                const r = ratings.find(r => r.Source.includes(source));
                return r ? r.Value : null;
            };

            return {
                imdb: data.imdbRating ? parseFloat(data.imdbRating) : null,
                rottenTomatoes: {
                    tomatometer: findRating('Rotten') ? parseInt(findRating('Rotten')) : null,
                    audienceScore: null,
                    url: 'https://www.rottentomatoes.com',
                },
                metacritic: findRating('Metacritic') ? parseInt(findRating('Metacritic')) : null,
                awards: data.Awards || null,
            };
        } catch (error) {
            console.error('[Ratings] Error:', error);
            return null;
        }
    },
};

/**
 * Streaming Availability Service
 * Routes through /api/streaming-availability proxy — RapidAPI key is server-side only.
 */
export const StreamingAvailabilityService = {
    /**
     * Get streaming providers for a title by IMDb ID and country.
     * @param {string} imdbId - IMDb ID (tt-prefixed)
     * @param {string} country - ISO 3166-1 alpha-2 country code (lowercase, e.g. 'tr')
     * @returns {Promise<{ options: Array, fetchedAt: number } | null>}
     */
    async getProviders(imdbId, country) {
        try {
            const response = await fetch(
                `/api/streaming-availability?imdbId=${encodeURIComponent(imdbId)}&country=${country.toLowerCase()}`
            );
            if (!response.ok) return null;
            return response.json();
        } catch (error) {
            console.error('[StreamingAvailability] Error:', error);
            return null;
        }
    },
};

/**
 * GeoIP Service - Auto-detect user's country via server-side proxy.
 * Falls back to Türkiye (TR) on any error.
 */
export const GeoIPService = {
    /**
     * Detect the current user's country.
     * @returns {Promise<{ countryCode: string, countryName: string }>}
     */
    async detectCountry() {
        try {
            const response = await fetch('/api/geoip');
            if (!response.ok) return { countryCode: 'TR', countryName: 'Türkiye' };
            const data = await response.json();
            // Convert English country name to locale-appropriate display name (Turkish UI)
            try {
                const displayNames = new Intl.DisplayNames(['tr'], { type: 'region' });
                data.countryName = displayNames.of(data.countryCode) || data.countryName;
            } catch {
                // Fallback map for common countries
                const fallback = {
                    TR: 'Türkiye', US: 'ABD', GB: 'Birleşik Krallık', DE: 'Almanya',
                    FR: 'Fransa', IT: 'İtalya', ES: 'İspanya', NL: 'Hollanda',
                    JP: 'Japonya', KR: 'Güney Kore', BR: 'Brezilya', MX: 'Meksika',
                };
                data.countryName = fallback[data.countryCode] || data.countryName;
            }
            return data;
        } catch {
            return { countryCode: 'TR', countryName: 'Türkiye' };
        }
    },
};

/**
 * Embedding Service - AI-powered search infrastructure
 * Handles embeddings generation, metric logging, and search history
 */
export const EmbeddingService = {
    /**
     * Generate embeddings for content batch
     * Used by admin tools to trigger batch embedding generation
     */
    async generateEmbeddings(limit = 50, version = 'v1') {
        try {
            const response = await fetch('/api/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit, version }),
            });
            if (!response.ok) {
                throw new Error(`Embedding generation failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[EmbeddingService] generateEmbeddings error:', error);
            throw error;
        }
    },

    /**
     * Log a metric (search cost, confidence, etc.) to api_metrics collection
     * Used after each search to track costs and performance
     */
    async logMetric(metric) {
        try {
            const response = await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric),
            });
            if (!response.ok) {
                console.warn('[EmbeddingService] Metric logging failed:', response.status);
            }
            return response.ok;
        } catch (error) {
            console.warn('[EmbeddingService] Metric logging error:', error);
            return false;
        }
    },

    /**
     * Log search query silently for personalization enrichment
     * Failures do not disrupt user experience (silent logging pattern)
     * Only logged for authenticated users
     * No sensitive data — only query text, result count, timestamp
     */
    async logSearchQuery(query, userId, resultsCount = 0) {
        try {
            const response = await fetch('/api/search-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    userId,
                    resultsCount,
                    timestamp: new Date().toISOString(),
                }),
            });
            if (!response.ok) {
                console.warn('[EmbeddingService] Failed to log search history');
            }
        } catch (error) {
            console.warn('[EmbeddingService] Search history logging error:', error);
            // Silently fail — don't disrupt user experience
        }
    },
};

/**
 * Combined API object (for legacy compatibility)
 */
export const API = {
    // TMDB methods
    fetchTMDB: (endpoint) => TMDBService.fetch(endpoint),
    search: (...args) => TMDBService.search(...args),
    sortByRelevance: (...args) => TMDBService.sortByRelevance(...args),
    normalizeTitle: (title) => TMDBService.normalizeTitle(title),
    getPopular: (...args) => TMDBService.getPopular(...args),
    getClassics: (...args) => TMDBService.getClassics(...args),
    getDetails: (...args) => TMDBService.getDetails(...args),
    getWatchProviders: (...args) => TMDBService.getWatchProviders(...args),
    getReleaseDates: (...args) => TMDBService.getReleaseDates(...args),
    getCredits: (...args) => TMDBService.getCredits(...args),
    getTMDBVideos: (...args) => TMDBService.getVideos(...args),
    getPosterUrl: (...args) => TMDBService.getPosterUrl(...args),
    getIMDBId: (...args) => TMDBService.getIMDBId(...args),

    // Hybrid AI search methods
    hybridSearch: (...args) => TMDBService.hybridSearch(...args),
    getCostDashboard: (...args) => TMDBService.getCostDashboard(...args),

    // YouTube methods
    searchYouTube: (...args) => YouTubeService.search(...args),
    getMovieVideos: (...args) => YouTubeService.getMovieVideos(...args),
    filterAndCleanVideos: (...args) => YouTubeService.filterVideos(...args),
    fuzzyMatch: (str1, str2) => {
        const s1 = str1.replace(/[^a-z0-9]/g, '');
        const s2 = str2.replace(/[^a-z0-9]/g, '');
        return s1.includes(s2) || s2.includes(s1);
    },
    getYouTubeThumbnail: (...args) => YouTubeService.getThumbnailUrl(...args),

    // Ratings methods
    getAllRatings: (...args) => RatingsService.getAllRatings(...args),

    // Streaming Availability methods
    getStreamingProviders: (...args) => StreamingAvailabilityService.getProviders(...args),

    // GeoIP methods
    detectCountry: () => GeoIPService.detectCountry(),

    // Embedding methods
    generateEmbeddings: (...args) => EmbeddingService.generateEmbeddings(...args),
    logMetric: (...args) => EmbeddingService.logMetric(...args),
    logSearchQuery: (...args) => EmbeddingService.logSearchQuery(...args),
};

/**
 * Search Service - Hybrid AI search and cost dashboard
 * Exported separately for convenience
 */
export const SearchService = {
    hybridSearch: (...args) => TMDBService.hybridSearch(...args),
    getCostDashboard: (...args) => TMDBService.getCostDashboard(...args),
};

// Legacy window export
if (typeof window !== 'undefined') {
    window.API = API;
    window.TMDBService = TMDBService;
    window.YouTubeService = YouTubeService;
    window.RatingsService = RatingsService;
    window.EmbeddingService = EmbeddingService;
    window.SearchService = SearchService;
    window.StreamingAvailabilityService = StreamingAvailabilityService;
    window.GeoIPService = GeoIPService;
}
