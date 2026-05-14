/**
 * Locale resolution layer (Phase 04-02).
 *
 * Single source of truth for { lang, country } across the app. Synchronous
 * fallback chain on the client; async geoip refinement available for first-
 * launch UX; backend Accept-Language parser exported for API endpoints.
 *
 * Storage: localStorage.lumi_locale = JSON.stringify({ lang, country, source })
 * Legacy:  localStorage.appLanguage is written-through for backwards compat.
 */

export const LANG_TO_COUNTRY = {
    tr: 'TR',
    en: 'US',
    de: 'DE',
    fr: 'FR',
    es: 'ES',
    ja: 'JP',
    ko: 'KR',
    zh: 'CN',
};

export const COUNTRY_TO_LANG = {
    TR: 'tr',
    US: 'en', GB: 'en', AU: 'en', CA: 'en', IE: 'en', NZ: 'en',
    DE: 'de', AT: 'de', CH: 'de',
    FR: 'fr', BE: 'fr',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
    JP: 'ja',
    KR: 'ko',
    CN: 'zh', TW: 'zh', HK: 'zh',
};

export const SUPPORTED_LANGS = ['tr', 'en', 'de', 'fr', 'es', 'ja', 'ko', 'zh'];

function safeLocalStorage() {
    try {
        if (typeof localStorage !== 'undefined') return localStorage;
    } catch {}
    return null;
}

function parseStored(ls) {
    try {
        const raw = ls?.getItem('lumi_locale');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object' && parsed.lang && parsed.country) return parsed;
    } catch {}
    return null;
}

export function getLocale() {
    return resolveLocaleSync();
}

export function resolveLocaleSync() {
    const ls = safeLocalStorage();

    // 1) Stored locale wins
    const stored = parseStored(ls);
    if (stored) return { lang: stored.lang, country: stored.country, source: 'stored' };

    // 2) Legacy appLanguage migration
    const legacy = ls?.getItem('appLanguage');
    if (legacy && SUPPORTED_LANGS.includes(legacy)) {
        return { lang: legacy, country: LANG_TO_COUNTRY[legacy] || 'US', source: 'migrated' };
    }

    // 3) navigator.language — EN-first policy (04-04-r6).
    // App's design source language is EN. Only navigator-language values that
    // are *clearly Turkish* override the EN default; every other browser locale
    // (de-DE, ja-JP, ko-KR, fr-CA, …) still boots in English so the user sees
    // the canonical copy and can opt into their own language on S2.
    const nav = (typeof navigator !== 'undefined' && navigator.language) || null;
    if (nav) {
        try {
            const loc = new Intl.Locale(nav);
            const lower = String(nav).toLowerCase();
            const isTurkish = loc.language === 'tr' || lower.startsWith('tr');
            if (isTurkish) {
                const country = loc.region || 'TR';
                return { lang: 'tr', country, source: 'navigator' };
            }
            // Non-Turkish navigator → keep EN but remember region for provider region hints.
            const country = loc.region || 'US';
            return { lang: 'en', country, source: 'navigator' };
        } catch {
            // Malformed BCP-47 → fall through to default
        }
    }

    // 4) Default — EN/US is the global launch baseline.
    return { lang: 'en', country: 'US', source: 'default' };
}

export async function resolveLocaleAsync() {
    const sync = resolveLocaleSync();
    // Stored/migrated/user wins outright — no remote refinement needed.
    if (sync.source === 'stored' || sync.source === 'migrated' || sync.source === 'user') return sync;
    try {
        const res = await fetch('/api/geoip');
        const data = await res.json();
        const cc = data?.countryCode;
        if (cc && cc !== 'XX') {
            const lang = sync.source === 'navigator' ? sync.lang : (COUNTRY_TO_LANG[cc] || 'en');
            return { lang, country: cc, source: 'geoip' };
        }
    } catch {}
    return sync;
}

export function setLocale(partial) {
    const current = resolveLocaleSync();
    const next = {
        lang: partial?.lang ?? current.lang,
        country: partial?.country ?? current.country,
        source: 'user',
    };
    const ls = safeLocalStorage();
    if (ls) {
        ls.setItem('lumi_locale', JSON.stringify(next));
        ls.setItem('appLanguage', next.lang); // legacy write-through
    }
    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.setLanguage === 'function') {
        try { window.i18n.setLanguage(next.lang); } catch {}
    }
    return next;
}

/**
 * Parse an HTTP Accept-Language header into a q-sorted list.
 *
 *   'en-US,en;q=0.9,tr;q=0.8'  →  [{tag:'en-US',q:1}, {tag:'en',q:0.9}, {tag:'tr',q:0.8}]
 *
 * Empty / null / non-string input returns []. Malformed q values are coerced
 * to 0 so they sort to the end rather than throwing.
 */
export function parseAcceptLanguage(header) {
    if (!header || typeof header !== 'string') return [];
    return header
        .split(',')
        .map((s) => {
            const trimmed = s.trim();
            if (!trimmed) return null;
            const [tag, qPart] = trimmed.split(';q=');
            if (!tag) return null;
            let q = qPart === undefined ? 1 : parseFloat(qPart);
            if (!Number.isFinite(q)) q = 0;
            return { tag: tag.trim(), q };
        })
        .filter(Boolean)
        .sort((a, b) => b.q - a.q);
}
