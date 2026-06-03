/**
 * LUMI — Decide-for-Me (Phase 05-03).
 *
 * Premium feature: one tap → AI picks EXACTLY ONE unseen title tuned to the viewer's
 * taste, an optional mood chip, and the inferred time-of-day. Reuses the existing
 * hybrid AI+TMDB pipeline (SearchService.hybridSearch) with a crafted prompt — no
 * server change — then post-filters the user's seen set and reveals one pick.
 *
 * Pure helpers (inferTimeOfDay / buildDecidePrompt / MOODS) are exported for tests.
 */
import { SearchService } from '../services/api.js';
import { getSeenSet, getTasteProfile } from '../lib/seen.js';
import { consumeAiQuota } from './discover.js';

export const MOODS = [
    { key: 'cozy', tr: 'Rahatlatıcı', en: 'Cozy', emoji: '☕' },
    { key: 'intense', tr: 'Gergin', en: 'Intense', emoji: '🔥' },
    { key: 'funny', tr: 'Komik', en: 'Funny', emoji: '😂' },
    { key: 'thoughtful', tr: 'Düşündürücü', en: 'Thoughtful', emoji: '🧠' },
    { key: 'feelgood', tr: 'Moral', en: 'Feel-good', emoji: '🌤️' },
];

const MOOD_HINT = {
    cozy: 'cozy, comforting, low-stakes',
    intense: 'tense, gripping, high-stakes',
    funny: 'genuinely funny, light',
    thoughtful: 'thought-provoking, slow-burn, substantial',
    feelgood: 'uplifting, warm, feel-good',
};

/** Infer coarse time-of-day + weekend flag from a Date. Pure. */
export function inferTimeOfDay(date = new Date()) {
    const h = date.getHours();
    let slot;
    if (h >= 5 && h < 12) slot = 'morning';
    else if (h >= 12 && h < 17) slot = 'afternoon';
    else if (h >= 17 && h < 23) slot = 'evening';
    else slot = 'lateNight';
    const day = date.getDay();
    return { slot, isWeekend: day === 0 || day === 6 };
}

const SLOT_HINT = {
    morning: 'a short, easy morning watch',
    afternoon: 'an afternoon watch',
    evening: 'a proper evening watch',
    lateNight: 'a late-night watch (not too long, not too heavy)',
};

/**
 * Build the natural-language query for the hybrid search pipeline. Pure.
 * @param {{taste?:object, ownedPlatforms?:string[], mood?:string, time?:object, lang?:string}} o
 */
export function buildDecidePrompt({ taste = {}, ownedPlatforms = [], mood = null, time = null, lang = 'en' } = {}) {
    const t = time || inferTimeOfDay();
    const liked = (taste.likedTitles || []).concat(taste.ratedTitles || []).slice(0, 20);
    const parts = [];
    parts.push('Pick EXACTLY ONE title (a movie or a TV series) for me to watch right now.');
    parts.push(`Context: ${SLOT_HINT[t.slot] || 'a watch'}${t.isWeekend ? ' on a weekend' : ' on a weeknight'}.`);
    if (mood && MOOD_HINT[mood]) parts.push(`Mood: ${MOOD_HINT[mood]}.`);
    if (liked.length) parts.push(`I tend to like: ${liked.join(', ')}.`);
    if (ownedPlatforms && ownedPlatforms.length) parts.push(`Prefer something available on: ${ownedPlatforms.join(', ')}.`);
    parts.push('Avoid the obvious blockbusters and anything I have clearly already seen. Give one confident, slightly non-obvious pick that fits the moment.');
    if (lang === 'tr') parts.push('Respond in Turkish.');
    return parts.join(' ');
}

/** Best-effort read of owned streaming platforms from onboarding storage (optional). */
export function readOwnedPlatforms() {
    const candidates = ['lumi_owned_platforms', 'ownedPlatforms', 'lumi_platforms'];
    for (const key of candidates) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length) {
                return parsed.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean);
            }
        } catch { /* ignore */ }
    }
    return [];
}

/**
 * Run a Decide-for-Me pick. Returns the single chosen TMDB result (unseen) or null.
 * @param {{mood?:string}} opts
 */
export async function runDecide({ mood = null } = {}) {
    // Defense-in-depth (review 05-final): Decide-for-Me is an AI search too — it MUST pass the
    // server-side quota gate, even though the hub already premium-gates the UI. A blocked gate
    // returns a sentinel the caller turns into a paywall/retry. Premium users bypass server-side.
    const gate = await consumeAiQuota();
    if (gate.blocked) return { blocked: true, reason: gate.reason };

    const taste = getTasteProfile();
    const lang = window.i18n?.currentLang || (String(navigator.language || 'en').startsWith('tr') ? 'tr' : 'en');
    const prompt = buildDecidePrompt({
        taste,
        ownedPlatforms: readOwnedPlatforms(),
        mood,
        time: inferTimeOfDay(),
        lang,
    });
    const userId = window.AuthService?.currentUser?.uid || 'anonymous';
    const res = await SearchService.hybridSearch(prompt, userId);
    const results = (res && Array.isArray(res.results)) ? res.results : [];
    const seen = getSeenSet();
    const fresh = results.filter((r) => r && r.id != null && !seen.has(String(r.id)));
    return (fresh[0] || results[0]) || null;
}
