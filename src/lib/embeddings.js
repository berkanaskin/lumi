/**
 * Client-side Embedding Utilities
 * v1.0.0
 *
 * Provides utilities for embedding operations:
 * - Version management and caching
 * - Retraining detection
 * - Metric logging for client-side operations
 */

import { getFirestore, collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';

/**
 * Cache for embedding version (5-minute TTL)
 */
let embeddingVersionCache = {
    value: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get current embedding version from Firestore
 * Queries first movie with any embedding field to extract version
 * Caches result for 5 minutes to reduce queries
 *
 * @returns {Promise<string>} Version string like 'v1', 'v2', etc.
 */
export async function getEmbeddingVersion() {
    const now = Date.now();

    // Return cached value if still fresh
    if (embeddingVersionCache.value && (now - embeddingVersionCache.timestamp) < embeddingVersionCache.ttl) {
        return embeddingVersionCache.value;
    }

    try {
        const db = getFirestore();
        const moviesRef = collection(db, 'movies');

        // Query for movies with any embedding field
        const q = query(moviesRef, limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn('[Embeddings] No movies found to extract version');
            return 'v1'; // Default to v1 if no movies
        }

        const movie = snapshot.docs[0].data();

        // Extract version from field names (embedding_v1, embedding_v2, etc.)
        const embeddingFields = Object.keys(movie).filter(key =>
            key.startsWith('embedding_v')
        );

        if (embeddingFields.length === 0) {
            console.warn('[Embeddings] No embedding fields found');
            return 'v1'; // Default to v1 if no embeddings yet
        }

        // Extract highest version number
        const versions = embeddingFields
            .map(field => field.replace('embedding_', ''))
            .sort((a, b) => {
                const aNum = parseInt(a.substring(1));
                const bNum = parseInt(b.substring(1));
                return bNum - aNum; // Descending order
            });

        const currentVersion = versions[0];

        // Cache the result
        embeddingVersionCache = {
            value: currentVersion,
            timestamp: now,
            ttl: embeddingVersionCache.ttl,
        };

        return currentVersion;
    } catch (error) {
        console.error('[Embeddings] Error getting version:', error);
        return 'v1'; // Default fallback
    }
}

/**
 * Determine if retraining is needed
 * Checks two conditions:
 * 1. LLM fallback ratio > 25% (expensive operations)
 * 2. Oldest embedding > 30 days old
 *
 * @returns {Promise<boolean>} true if retraining recommended
 */
export async function shouldRetrain() {
    try {
        const db = getFirestore();

        // Check condition 1: LLM fallback ratio
        const metricsRef = collection(db, 'api_metrics');
        const metricsQuery = query(
            metricsRef,
            where('type', 'in', ['embedding', 'llm']),
            orderBy('timestamp', 'desc'),
            limit(1000)
        );

        const metricsSnapshot = await getDocs(metricsQuery);
        const metrics = metricsSnapshot.docs.map(doc => doc.data());

        if (metrics.length > 0) {
            const llmCount = metrics.filter(m => m.type === 'llm').length;
            const embeddingCount = metrics.filter(m => m.type === 'embedding').length;
            const total = llmCount + embeddingCount;

            const fallbackRatio = total > 0 ? llmCount / total : 0;
            if (fallbackRatio > 0.25) {
                console.log('[Embeddings] Retraining recommended: LLM fallback ratio too high', fallbackRatio);
                return true;
            }
        }

        // Check condition 2: Oldest embedding age
        const moviesRef = collection(db, 'movies');
        const embeddingQuery = query(
            moviesRef,
            orderBy('embedding_generated_at', 'asc'),
            limit(1)
        );

        const embeddingSnapshot = await getDocs(embeddingQuery);
        if (!embeddingSnapshot.empty) {
            const oldestMovie = embeddingSnapshot.docs[0].data();
            const generatedAt = oldestMovie.embedding_generated_at?.toDate?.() ||
                new Date(oldestMovie.embedding_generated_at);

            const ageInDays = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

            if (ageInDays > 30) {
                console.log('[Embeddings] Retraining recommended: Embeddings older than 30 days');
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('[Embeddings] Error checking retraining:', error);
        return false; // Fail open - don't recommend retraining if we can't check
    }
}

/**
 * Log a metric locally (for later submission to api_metrics)
 * Prepares metric object with timestamp for tracking
 *
 * @param {string} type - Metric type: 'embedding' | 'llm' | 'search'
 * @param {object} details - Additional metric details (query, resultCount, confidence, etc.)
 * @returns {object} Metric object ready for API submission
 */
export function logMetricLocally(type, details = {}) {
    if (!['embedding', 'llm', 'search'].includes(type)) {
        console.warn('[Embeddings] Unknown metric type:', type);
    }

    return {
        type,
        timestamp: new Date(),
        ...details,
    };
}

/**
 * Clear embedding version cache (for testing or manual refresh)
 */
export function clearVersionCache() {
    embeddingVersionCache = {
        value: null,
        timestamp: 0,
        ttl: embeddingVersionCache.ttl,
    };
}
