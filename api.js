// ============================================
// NEREDE İZLERİM? - API Fonksiyonları v5.0
// Language support + fetchTMDB general function
// ============================================

const API = {
    // ============================================
    // TMDB API Fonksiyonları
    // ============================================

    // Genel TMDB API isteği (language destekli)
    async fetchTMDB(endpoint) {
        // Endpoint zaten language içeriyorsa direkt kullan
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_URLS.TMDB_BASE}${endpoint}${separator}api_key=${CONFIG.TMDB_API_KEY}`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('TMDB API hatası:', error);
            return { results: [] };
        }
    },

    // Film/Dizi Arama - Language destekli
    async search(query, type = 'multi', language = 'tr-TR') {
        const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
        const url = `${API_URLS.TMDB_BASE}${endpoint}?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(query)}&page=1`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Multi arama için sadece film ve dizileri filtrele
            if (type === 'multi') {
                data.results = data.results.filter(item =>
                    item.media_type === 'movie' || item.media_type === 'tv'
                );
            }

            // Sonuçları alakaya göre sırala
            data.results = this.sortByRelevance(data.results, query);

            return data;
        } catch (error) {
            console.error('Arama hatası:', error);
            return { results: [] };
        }
    },

    // Arama sonuçlarını alakaya göre sırala
    sortByRelevance(results, query) {
        const queryLower = query.toLowerCase().trim();
        const queryNorm = this.normalizeTitle(queryLower);

        return results.sort((a, b) => {
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            const originalA = (a.original_title || a.original_name || '').toLowerCase();
            const originalB = (b.original_title || b.original_name || '').toLowerCase();

            const titleANorm = this.normalizeTitle(titleA);
            const titleBNorm = this.normalizeTitle(titleB);
            const originalANorm = this.normalizeTitle(originalA);
            const originalBNorm = this.normalizeTitle(originalB);

            // Tam eşleşme
            const exactMatchA = titleANorm === queryNorm || originalANorm === queryNorm;
            const exactMatchB = titleBNorm === queryNorm || originalBNorm === queryNorm;

            if (exactMatchA && !exactMatchB) return -1;
            if (!exactMatchA && exactMatchB) return 1;

            // Başlangıç eşleşmesi
            const startsWithA = titleANorm.startsWith(queryNorm) || originalANorm.startsWith(queryNorm);
            const startsWithB = titleBNorm.startsWith(queryNorm) || originalBNorm.startsWith(queryNorm);

            if (startsWithA && !startsWithB) return -1;
            if (!startsWithA && startsWithB) return 1;

            // İçerme
            const containsA = titleANorm.includes(queryNorm) || originalANorm.includes(queryNorm);
            const containsB = titleBNorm.includes(queryNorm) || originalBNorm.includes(queryNorm);

            if (containsA && !containsB) return -1;
            if (!containsA && containsB) return 1;

            // Popülerlik
            const scoreA = (a.vote_count || 0) * (a.vote_average || 0);
            const scoreB = (b.vote_count || 0) * (b.vote_average || 0);

            return scoreB - scoreA;
        });
    },

    // Başlığı normalize et
    normalizeTitle(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\sğüşıöçа-яё]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Popüler İçerikleri Getir
    async getPopular(type = 'movie', language = 'tr-TR') {
        const url = `${API_URLS.TMDB_BASE}/${type}/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&page=1`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Popüler içerik hatası:', error);
            return { results: [] };
        }
    },

    // Klasik Filmler - En çok oy alan, eski filmler
    async getClassics(language = 'tr-TR') {
        // Top rated movies with high vote count, released before 2000
        const url = `${API_URLS.TMDB_BASE}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&sort_by=vote_average.desc&vote_count.gte=5000&primary_release_date.lte=2000-12-31&page=1`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Klasikler hatası:', error);
            return { results: [] };
        }
    },

    // Film/Dizi Detayları - Language destekli
    async getDetails(id, type, language = 'tr-TR') {
        const url = `${API_URLS.TMDB_BASE}/${type}/${id}?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Detay hatası:', error);
            return null;
        }
    },

    // İzleme Platformları (TMDB'den gerçek data)
    async getWatchProviders(id, type, country = 'TR') {
        const url = `${API_URLS.TMDB_BASE}/${type}/${id}/watch/providers?api_key=${CONFIG.TMDB_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            return data.results[country] || null;
        } catch (error) {
            console.error('Platform hatası:', error);
            return null;
        }
    },

    // Cast and Crew (Credits)
    async getCredits(id, type) {
        const url = `${API_URLS.TMDB_BASE}/${type}/${id}/credits?api_key=${CONFIG.TMDB_API_KEY}`;
        try {
            const response = await fetch(url);
            const data = await response.json();

            // Cast: Top 10
            const cast = data.cast ? data.cast.slice(0, 10) : [];

            // Crew: Filter for key roles
            const keyJobs = ['Director', 'Director of Photography', 'Editor', 'Writer', 'Screenplay', 'Original Music Composer'];
            const crew = data.crew ? data.crew.filter(person => keyJobs.includes(person.job)) : [];

            // Remove duplicates in crew (sometimes same person has multiple roles)
            const uniqueCrew = crew.filter((person, index, self) =>
                index === self.findIndex(p => p.id === person.id && p.job === person.job)
            );

            return { cast, crew: uniqueCrew };
        } catch (error) {
            console.error('Credits error:', error);
            return { cast: [], crew: [] };
        }
    },

    // TMDB Videoları (Fragmanlar ve diğerleri)
    async getTMDBVideos(id, type) {
        // Türkçe ve İngilizce videoları al
        const urls = [
            `${API_URLS.TMDB_BASE}/${type}/${id}/videos?api_key=${CONFIG.TMDB_API_KEY}&language=tr-TR`,
            `${API_URLS.TMDB_BASE}/${type}/${id}/videos?api_key=${CONFIG.TMDB_API_KEY}&language=en-US`
        ];

        try {
            const responses = await Promise.all(urls.map(url => fetch(url)));
            const dataArr = await Promise.all(responses.map(r => r.json()));

            // Videoları birleştir ve sadece YouTube olanları al
            const allVideos = [...dataArr[0].results, ...dataArr[1].results]
                .filter(video => video.site === 'YouTube');

            // Tekrar edenleri kaldır
            const uniqueVideos = allVideos.filter((video, index, self) =>
                index === self.findIndex(v => v.key === video.key)
            );

            return uniqueVideos;
        } catch (error) {
            console.error('Video hatası:', error);
            return [];
        }
    },

    // Poster URL
    getPosterUrl(path, size = 'w500') {
        if (!path) return null;
        return `${API_URLS.TMDB_IMAGE}/${size}${path}`;
    },

    // ============================================
    // YouTube API Fonksiyonları - GELİŞTİRİLMİŞ
    // ============================================

    // YouTube'da Video Ara - Geliştirilmiş filtreleme
    async searchYouTube(query, maxResults = 8) {
        const url = `${API_URLS.YOUTUBE_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${CONFIG.YOUTUBE_API_KEY}&relevanceLanguage=tr&videoDuration=medium`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error('YouTube API hatası:', data.error.message);
                return [];
            }

            return data.items || [];
        } catch (error) {
            console.error('YouTube arama hatası:', error);
            return [];
        }
    },

    // Farklı video kategorileri için AKILLI arama
    async getMovieVideos(movieTitle, year, originalTitle = null) {
        const searchTitle = originalTitle || movieTitle;
        const yearStr = year ? ` ${year}` : '';

        // Her kategori için özel arama terimleri
        const categories = {
            trailer: {
                queries: [
                    `${searchTitle}${yearStr} official trailer`,
                    `${searchTitle}${yearStr} trailer HD`,
                    `${movieTitle}${yearStr} resmi fragman`
                ],
                mustInclude: ['trailer', 'fragman', 'teaser'],
                maxResults: 6
            },
            behindTheScenes: {
                queries: [
                    `${searchTitle}${yearStr} behind the scenes`,
                    `${searchTitle}${yearStr} making of featurette`,
                    `${searchTitle}${yearStr} kamera arkası`
                ],
                mustInclude: ['behind', 'making', 'set', 'kamera', 'featurette', 'bts'],
                maxResults: 4
            },
            interview: {
                queries: [
                    `${searchTitle}${yearStr} cast interview`,
                    `${searchTitle}${yearStr} actors interview press`,
                    `${searchTitle}${yearStr} oyuncu röportaj`
                ],
                mustInclude: ['interview', 'röportaj', 'press', 'talk', 'cast'],
                maxResults: 4
            },
            makingOf: {
                queries: [
                    `${searchTitle}${yearStr} making of documentary`,
                    `${searchTitle}${yearStr} production featurette`,
                    `${searchTitle}${yearStr} yapım belgesel`
                ],
                mustInclude: ['making', 'production', 'yapım', 'how', 'created', 'documentary'],
                maxResults: 4
            }
        };

        const results = {};

        // Her kategori için arama yap
        for (const [key, config] of Object.entries(categories)) {
            let categoryVideos = [];

            // Her sorgu için arama yap (ilk başarılı sonuçları al)
            for (const query of config.queries) {
                if (categoryVideos.length >= config.maxResults) break;

                const videos = await this.searchYouTube(query, config.maxResults);
                categoryVideos = [...categoryVideos, ...videos];
            }

            // Filtreleme ve temizleme
            categoryVideos = this.filterAndCleanVideos(categoryVideos, config.mustInclude, movieTitle, searchTitle);

            // Maksimum sayıya sınırla
            results[key] = categoryVideos.slice(0, config.maxResults);
        }

        return results;
    },

    // Video filtreleme ve temizleme
    filterAndCleanVideos(videos, mustIncludeKeywords, movieTitle, originalTitle) {
        const seen = new Set();
        const movieTitleLower = movieTitle.toLowerCase();
        const originalTitleLower = originalTitle?.toLowerCase() || movieTitleLower;

        return videos.filter(video => {
            const title = video.snippet.title.toLowerCase();
            const channel = video.snippet.channelTitle.toLowerCase();
            const videoId = video.id.videoId;

            // Tekrar kontrolü
            if (seen.has(videoId)) return false;
            seen.add(videoId);

            // Film adı video başlığında olmalı
            const hasMovieTitle = title.includes(movieTitleLower) ||
                title.includes(originalTitleLower) ||
                this.fuzzyMatch(title, movieTitleLower);

            if (!hasMovieTitle) return false;

            // Alakasız içerikleri filtrele
            const excludeKeywords = [
                'reaction', 'reaksiyon', 'izledik', 'izliyor',
                'review', 'inceleme', 'eleştiri', 'yorum',
                'explained', 'analysis', 'analiz', 'açıklama',
                'fan made', 'fanmade', 'parody', 'parodi',
                'gameplay', 'game', 'oyun', 'walkthrough',
                'music video', 'müzik video', 'soundtrack only',
                'scene pack', 'edit', 'vine', 'tiktok',
                'ranking', 'top 10', 'comparison'
            ];

            const hasExcluded = excludeKeywords.some(kw => title.includes(kw));
            if (hasExcluded) return false;

            // Spesifik kategori kelimesi kontrolü
            const hasKeyword = mustIncludeKeywords.some(kw =>
                title.includes(kw) || channel.includes(kw)
            );

            // Resmi kanallardan gelen videolara öncelik ver
            const isOfficialChannel = channel.includes('official') ||
                channel.includes('resmi') ||
                channel.includes('movies') ||
                channel.includes('film') ||
                channel.includes('warner') ||
                channel.includes('sony') ||
                channel.includes('disney') ||
                channel.includes('universal') ||
                channel.includes('marvel') ||
                channel.includes('dc');

            return hasKeyword || isOfficialChannel;
        });
    },

    // Bulanık eşleşme (fuzzy match)
    fuzzyMatch(str1, str2) {
        const s1 = str1.replace(/[^a-z0-9]/g, '');
        const s2 = str2.replace(/[^a-z0-9]/g, '');
        return s1.includes(s2) || s2.includes(s1);
    },

    // YouTube Thumbnail URL
    getYouTubeThumbnail(videoId, quality = 'mqdefault') {
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    },

    // =============================================
    // MOVIESDATABASE API (RapidAPI) - Trivia & IMDB
    // =============================================

    // IMDB ID ile film detayları al (trivia dahil)
    async getMovieFromIMDB(imdbId) {
        if (!imdbId) return null;
        try {
            const response = await fetch(
                `${API_URLS.MOVIEDB_BASE}/titles/${imdbId}?info=base_info`,
                {
                    headers: {
                        'X-RapidAPI-Key': CONFIG.MOVIEDB_API_KEY,
                        'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com'
                    }
                }
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data.results || null;
        } catch (error) {
            console.error('MoviesDatabase API hatası:', error);
            return null;
        }
    },

    // IMDB ID ile trivia al
    async getMovieTrivia(imdbId) {
        if (!imdbId) return [];
        try {
            const response = await fetch(
                `${API_URLS.MOVIEDB_BASE}/titles/${imdbId}/trivia`,
                {
                    headers: {
                        'X-RapidAPI-Key': CONFIG.MOVIEDB_API_KEY,
                        'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com'
                    }
                }
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.results?.entries || [];
        } catch (error) {
            console.error('Trivia API hatası:', error);
            return [];
        }
    },

    // TMDB ID'den IMDB ID al
    async getIMDBId(tmdbId, mediaType) {
        try {
            const response = await fetch(
                `${API_URLS.TMDB_BASE}/${mediaType}/${tmdbId}/external_ids?api_key=${CONFIG.TMDB_API_KEY}`
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data.imdb_id || null;
        } catch (error) {
            console.error('IMDB ID hatası:', error);
            return null;
        }
    }
};

// Expose to window for inline scripts
window.API = API;
