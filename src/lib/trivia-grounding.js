/**
 * Phase 04.6-02 — Trivia grounding helpers.
 *
 * Pure, dependency-free utilities that turn TMDB + OMDB raw responses into:
 *   1. A structured ground-truth fact bundle (`buildGroundTruth`).
 *   2. A strict Gemini prompt that embeds the bundle and forbids invention
 *      (`buildGroundedPrompt`).
 *   3. A defensive bullet clamper for LLM output (`clampBullets`).
 *
 * No I/O. No side effects. Fully unit-testable.
 */

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                          */
/* -------------------------------------------------------------------------- */

function isMeaningful(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') {
        const t = v.trim();
        if (!t) return false;
        if (t === 'N/A') return false;
        return true;
    }
    if (Array.isArray(v)) return v.length > 0;
    return true;
}

function pick(obj, key) {
    const v = obj?.[key];
    return isMeaningful(v) ? v : undefined;
}

function omdbRatings(omdb) {
    if (!omdb || !Array.isArray(omdb.Ratings)) return undefined;
    const out = {};
    for (const r of omdb.Ratings) {
        if (!r?.Source || !r?.Value || r.Value === 'N/A') continue;
        const s = String(r.Source).toLowerCase();
        if (s.includes('rotten')) out.rt = r.Value;
        else if (s.includes('metacritic')) out.metacritic = r.Value;
        else if (s.includes('internet movie database') || s.includes('imdb')) out.imdb = r.Value;
    }
    return Object.keys(out).length ? out : undefined;
}

function tmdbCastTop5(tmdb) {
    const cast = tmdb?.credits?.cast;
    if (!Array.isArray(cast) || !cast.length) return undefined;
    return cast
        .slice()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .slice(0, 5)
        .map((c) => ({ name: c.name, character: c.character }))
        .filter((c) => isMeaningful(c.name));
}

function tmdbKeyCrew(tmdb) {
    const crew = tmdb?.credits?.crew;
    if (!Array.isArray(crew) || !crew.length) return undefined;
    const find = (...jobs) => {
        const target = jobs.map((j) => j.toLowerCase());
        return crew.find((c) => c?.job && target.includes(String(c.job).toLowerCase()))?.name;
    };
    const out = {};
    const d = find('Director');
    const w = find('Writer', 'Screenplay');
    const m = find('Original Music Composer', 'Music', 'Composer');
    const dop = find('Director of Photography', 'Cinematography');
    if (d) out.director = d;
    if (w) out.writer = w;
    if (m) out.composer = m;
    if (dop) out.dop = dop;
    return Object.keys(out).length ? out : undefined;
}

function tmdbKeywords(tmdb) {
    const arr = tmdb?.keywords?.keywords || tmdb?.keywords?.results;
    if (!Array.isArray(arr) || !arr.length) return undefined;
    return arr.map((k) => k?.name).filter(isMeaningful).slice(0, 10);
}

function tmdbCompanies(tmdb) {
    const arr = tmdb?.production_companies;
    if (!Array.isArray(arr) || !arr.length) return undefined;
    return arr.map((c) => c?.name).filter(isMeaningful).slice(0, 5);
}

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Build a structured ground-truth bundle from TMDB + OMDB data.
 *
 * @param {object} tmdbDetails - TMDB movie/tv detail (with credits, keywords, external_ids).
 * @param {object|null} omdbData - OMDB lookup payload (may be null on error/miss).
 * @returns {{ source: 'omdb+tmdb'|'tmdb-only', facts: object }}
 */
export function buildGroundTruth(tmdbDetails, omdbData) {
    const tmdb = tmdbDetails || {};
    const omdbOk =
        omdbData &&
        typeof omdbData === 'object' &&
        !omdbData.error &&
        // OMDB returns Response:"False" on title-not-found
        omdbData.Response !== 'False';

    const facts = {};

    // --- Title / type metadata (always) ---
    const title = pick(tmdb, 'title') || pick(tmdb, 'name') || pick(omdbData || {}, 'Title');
    if (title) facts.title = title;
    const originalTitle = pick(tmdb, 'original_title') || pick(tmdb, 'original_name');
    if (originalTitle && originalTitle !== title) facts.original_title = originalTitle;
    const tagline = pick(tmdb, 'tagline');
    if (tagline) facts.tagline = tagline;

    // --- OMDB-side facts (only when payload is real) ---
    if (omdbOk) {
        const awards = pick(omdbData, 'Awards');
        if (awards) facts.awards = awards;
        const plot = pick(omdbData, 'Plot');
        if (plot) facts.plot = plot;
        const ratings = omdbRatings(omdbData);
        if (ratings) facts.ratings = ratings;
        const director = pick(omdbData, 'Director');
        if (director) facts.director = director;
        const writer = pick(omdbData, 'Writer');
        if (writer) facts.writer = writer;
        const runtime = pick(omdbData, 'Runtime');
        if (runtime) facts.runtime = runtime;
        const released = pick(omdbData, 'Released');
        if (released) facts.released = released;
        const country = pick(omdbData, 'Country');
        if (country) facts.country = country;
        const language = pick(omdbData, 'Language');
        if (language) facts.language = language;
        const boxOffice = pick(omdbData, 'BoxOffice');
        if (boxOffice) facts.box_office = boxOffice;
    }

    // --- TMDB-side facts (always when present) ---
    const keywords = tmdbKeywords(tmdb);
    if (keywords) facts.keywords = keywords;
    const cast = tmdbCastTop5(tmdb);
    if (cast) facts.cast_top5 = cast;
    const crew = tmdbKeyCrew(tmdb);
    if (crew) facts.key_crew = crew;
    const companies = tmdbCompanies(tmdb);
    if (companies) facts.production_companies = companies;

    return {
        source: omdbOk ? 'omdb+tmdb' : 'tmdb-only',
        facts,
    };
}

/**
 * Build the strict Gemini prompt. The prompt is a contract: it MUST instruct
 * the model to never invent facts, and it MUST embed the JSON-stringified
 * ground-truth bundle so the model can only quote/format from it.
 *
 * @param {{source:string, facts:object}} ground
 * @param {'movie'|'tv'|'series'|string} type
 * @returns {string}
 */
export function buildGroundedPrompt(ground, type) {
    const safe = ground && typeof ground === 'object' ? ground : { source: 'tmdb-only', facts: {} };
    const facts = safe.facts || {};
    const title = facts.title || '(unknown title)';
    const mediaType = type === 'tv' || type === 'series' ? 'series' : 'movie';

    const groundJson = JSON.stringify(facts, null, 2);

    // The four mandatory instruction strings are LITERAL and tested.
    return [
        'You are a movie trivia formatter for the Lumi app.',
        '',
        `TITLE: ${title}`,
        `TYPE: ${mediaType}`,
        `GROUND_TRUTH_SOURCE: ${safe.source}`,
        '',
        'Use ONLY these facts. If unsure, say \'no notable trivia available\'. Never invent awards, dates, names, or events.',
        '',
        'Output format: ≤3 short bullets, each ≤140 characters, each verifiable from GROUND_TRUTH below.',
        '- Begin each bullet with "• ".',
        '- Do not output any preamble, headings, or numbers — bullets only.',
        '- If GROUND_TRUTH lacks at least one non-obvious interesting fact, return exactly: no notable trivia available',
        '',
        'GROUND_TRUTH:',
        groundJson,
    ].join('\n');
}

/**
 * Defense-in-depth: split LLM output into bullet lines, drop empties, cap at 3.
 * Accepts either bullet-prefixed lines ("• …", "- …", "* …") or plain newlines.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function clampBullets(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!trimmed) return [];
    // "no notable trivia available" sentinel → no bullets.
    if (/^no notable trivia available\.?$/i.test(trimmed)) return [];

    const lines = trimmed
        .split(/\r?\n+/)
        .map((l) => l.replace(/^\s*[•\-*•]\s*/, '').trim())
        .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
        .filter((l) => l.length > 0);

    return lines.slice(0, 3);
}
