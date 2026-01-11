// ============================================
// LUMI AI SERVICE - Gemini 3 Flash Integration
// ============================================

const AIService = {
    API_KEY: 'AIzaSyDaS3H7m4gzpe3Ctk2pRngLNBabww6LxVM',
    MODEL: 'gemini-2.0-flash',
    ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    /**
     * Get movie recommendations from Gemini based on user prompt
     * @param {string} userPrompt - User's mood/preference description
     * @returns {Promise<Array>} - Array of movie recommendations with TMDB data
     */
    async getRecommendations(userPrompt) {
        if (!userPrompt || userPrompt.trim().length < 3) {
            throw new Error('Lütfen en az 3 karakter girin.');
        }

        const systemPrompt = `Sen bir film küratörüsün. Kullanıcı şunu söyledi: "${userPrompt}". 
Buna uygun, popüler ve niş karışık 5 film öner. 
SADECE şu JSON formatında cevap ver, başka hiçbir şey yazma:
[{"title": "Film Adı", "year": "2020"}, ...]
Önemli: Sadece JSON array döndür, açıklama veya markdown kullanma.`;

        try {
            console.log('[AIService] Sending request to Gemini...');

            const response = await fetch(`${this.ENDPOINT}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: systemPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[AIService] API Error:', errorData);
                throw new Error(`Gemini API hatası: ${response.status}`);
            }

            const data = await response.json();
            console.log('[AIService] Raw response:', data);

            // Extract text from Gemini response
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textContent) {
                throw new Error('Gemini yanıt döndürmedi.');
            }

            console.log('[AIService] Text content:', textContent);

            // Parse JSON from response (handle markdown code blocks)
            let recommendations;
            try {
                // Try direct JSON parse first
                recommendations = JSON.parse(textContent.trim());
            } catch {
                // Try to extract JSON from markdown code block
                const jsonMatch = textContent.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('JSON parse hatası');
                }
            }

            if (!Array.isArray(recommendations)) {
                throw new Error('Geçersiz öneri formatı');
            }

            console.log('[AIService] Parsed recommendations:', recommendations);

            // Fetch TMDB data for each recommendation
            const enrichedResults = await this.enrichWithTMDB(recommendations);
            return enrichedResults;

        } catch (error) {
            console.error('[AIService] Error:', error);
            throw error;
        }
    },

    /**
     * Enrich AI recommendations with TMDB data (posters, IDs, etc.)
     * @param {Array} recommendations - Array of {title, year} objects
     * @returns {Promise<Array>} - Enriched movie data with TMDB info
     */
    async enrichWithTMDB(recommendations) {
        const results = [];

        for (const rec of recommendations) {
            try {
                // Search TMDB for this movie
                const searchQuery = `${rec.title} ${rec.year || ''}`.trim();
                const searchData = await API.search(searchQuery, 'movie', 'tr-TR');

                if (searchData.results && searchData.results.length > 0) {
                    // Find best match (prioritize exact year match)
                    let bestMatch = searchData.results[0];

                    if (rec.year) {
                        const yearMatch = searchData.results.find(r => {
                            const releaseYear = r.release_date?.split('-')[0];
                            return releaseYear === rec.year;
                        });
                        if (yearMatch) bestMatch = yearMatch;
                    }

                    results.push({
                        ...bestMatch,
                        media_type: 'movie',
                        ai_recommended: true,
                        ai_title: rec.title,
                        ai_year: rec.year
                    });
                } else {
                    console.warn(`[AIService] No TMDB match for: ${rec.title}`);
                }
            } catch (err) {
                console.warn(`[AIService] TMDB search failed for ${rec.title}:`, err);
            }
        }

        return results;
    },

    /**
     * Get a quick mood-based recommendation without full AI
     * @param {string} mood - Predefined mood category
     * @returns {Promise<Array>} - Movie results from TMDB
     */
    async getMoodBasedRecommendations(mood) {
        const moodPrompts = {
            'chill': 'Rahatlatıcı, hafif ve keyifli',
            'adrenaline': 'Heyecan verici, aksiyon dolu',
            'tearjerker': 'Duygusal, ağlatıcı drama',
            'mindbending': 'Beyin yakan, karmaşık hikaye'
        };

        const prompt = moodPrompts[mood] || mood;
        return this.getRecommendations(`${prompt} film öner`);
    }
};

// Make globally available
window.AIService = AIService;
