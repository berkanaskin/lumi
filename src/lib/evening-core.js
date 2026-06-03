/**
 * LUMI — Evening Assistant core (Phase 05-05).
 *
 * Pure, framework-free. The cron (api/cron/evening-assistant.js) runs HOURLY and uses
 * these helpers to pick which premium users are at their local 20:00 right now, parse the
 * 3 AI titles, and build the inbox event. Keeping it pure makes the tz math testable.
 *
 * The same `tz` field set by api/quota.js drives both this local-20:00 delivery and the
 * free-cap local-midnight reset.
 */

const EVENING_HOUR = 20;

/** Local hour (0-23) in the given IANA tz at `now`. Falls back to UTC for a bad tz. */
export function localHour(tz, now = Date.now()) {
    const fmt = (zone) => Number(
        new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false })
            .format(new Date(now))
            // en-US can render midnight as "24" in some engines; normalize.
            .replace(/[^0-9]/g, ''),
    );
    try {
        const h = fmt(tz || 'UTC');
        return h === 24 ? 0 : h;
    } catch {
        const h = fmt('UTC');
        return h === 24 ? 0 : h;
    }
}

/** YYYY-MM-DD local date key (for once-per-day idempotency). */
export function localDateKey(tz, now = Date.now()) {
    const fmt = (zone) => new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(now));
    try { return fmt(tz || 'UTC'); } catch { return fmt('UTC'); }
}

/** True when it is local 20:00 for this tz. */
export function isEveningBucket(tz, now = Date.now(), hour = EVENING_HOUR) {
    return localHour(tz, now) === hour;
}

/**
 * From a premium-user list, select those at local 20:00 NOW and NOT already served today.
 * @param {Array<{uid:string, tz?:string, lastEveningPick?:string}>} users
 */
export function selectEveningUsers(users, now = Date.now()) {
    const out = [];
    for (const u of users || []) {
        const tz = u?.tz || 'UTC';
        if (!isEveningBucket(tz, now)) continue;
        if (u.lastEveningPick && u.lastEveningPick === localDateKey(tz, now)) continue; // idempotent
        out.push(u);
    }
    return out;
}

/** Parse up to 3 titles from a numbered / bulleted Gemini list. */
export function parseEveningTitles(text) {
    if (!text || typeof text !== 'string') return [];
    const titles = [];
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        // strip leading "1." / "1)" / "-" / "*" / "•"
        let t = line.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim();
        if (!t) continue;
        // drop a trailing "(2021)" year tag and surrounding quotes
        t = t.replace(/\s*\(\d{4}\)\s*$/, '').replace(/^["'""]|["'""]$/g, '').trim();
        if (t) titles.push(t);
        if (titles.length === 3) break;
    }
    return titles;
}

/** Build the evening-pick inbox event (Phase-6 push schema). */
export function buildEveningPickEvent(picks, lang) {
    const tr = String(lang || '').toLowerCase().startsWith('tr');
    const list = (picks || []).slice(0, 3);
    return {
        type: 'evening_pick',
        title: tr ? '🌙 Bu akşam için 3 öneri' : '🌙 3 picks for tonight',
        body: list.length
            ? (tr ? `Bu akşam: ${list.join(', ')}` : `Tonight: ${list.join(', ')}`)
            : (tr ? 'Bu akşamlık seçimlerin hazır.' : 'Your evening picks are ready.'),
        payload: { picks: list },
        read: false,
        source: 'evening-assistant',
    };
}
