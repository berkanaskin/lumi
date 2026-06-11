/**
 * Phase 05.5-12 — Wikipedia kaynaklı trivia ham maddesi.
 *
 * Founder kararı: Gemini'ye trivia ÜRETTİRİLMEZ (hallüsinasyon). Wikipedia'nın
 * yapım/çekim/seçmeler bölümlerinden HAM metin çekilir; Gemini yalnız bu
 * malzemeden en çarpıcı 3 olguyu SEÇER ve anlatır. Doğruluk kaynaktan,
 * lezzet modelden.
 *
 * Saf + enjekte edilebilir fetch — birim test edilebilir; I/O yalnız
 * fetchWikiNotes içinde.
 */

// Trivia değeri taşıyan bölüm başlıkları (en + tr wiki)
const SECTION_RE = /^==\s*(Production|Development|Filming|Casting|Writing|Music|Effects|Release|Reception|Background|Legacy|Yapım|Gelişim|Çekimler|Oyuncu seçimi|Müzik|Gösterim|Eleştiriler)\s*==$/im;

const MAX_NOTES_CHARS = 4000;

/** Tek istekte denenecek sayfa adı adayları (çoklu title API desteği). */
export function wikiTitleCandidates(details, type) {
    const title = details?.title || details?.name || '';
    const original = details?.original_title || details?.original_name || title;
    const year = String(details?.release_date || details?.first_air_date || '').slice(0, 4);
    const isTv = type === 'tv';
    const out = [];
    if (original) {
        if (year) out.push(`${original} (${year} ${isTv ? 'TV series' : 'film'})`);
        out.push(`${original} (${isTv ? 'TV series' : 'film'})`);
        out.push(original);
    }
    if (title && title !== original) out.push(title);
    return [...new Set(out)].slice(0, 4);
}

/**
 * Düz-metin extract'tan trivia değeri taşıyan bölümleri ayıkla.
 * Wikipedia plaintext'te bölümler "== Başlık ==" satırlarıyla ayrılır.
 * Hiç eşleşme yoksa giriş paragrafı (ilk bölüm) döner.
 */
export function pickWikiSections(extract) {
    if (!extract || typeof extract !== 'string') return '';
    const lines = extract.split('\n');
    const chunks = [];
    let current = null;

    for (const line of lines) {
        const isHeading = /^==[^=].*==$/.test(line.trim()) || /^==\s.*\s==$/.test(line.trim());
        if (isHeading) {
            current = SECTION_RE.test(line.trim()) ? { head: line.trim(), body: [] } : null;
            if (current) chunks.push(current);
            continue;
        }
        if (current) current.body.push(line);
    }

    let text = chunks
        .map((c) => `${c.head}\n${c.body.join('\n').trim()}`)
        .filter((s) => s.length > 80)
        .join('\n\n');

    if (!text) {
        // Bölüm bulunamadı → giriş paragrafı (ilk "==" öncesi)
        text = extract.split(/^==/m)[0].trim();
    }
    return text.slice(0, MAX_NOTES_CHARS);
}

/**
 * Adayları TEK API isteğiyle dener (titles=a|b|c), en uzun extract'ı seçer.
 * Hata/boşlukta null — trivia OMDB+TMDB yoluna düşer (mevcut davranış).
 *
 * @returns {Promise<{text: string, source: string}|null>}
 */
export async function fetchWikiNotes(details, type, fetchImpl = fetch, lang = 'en') {
    const candidates = wikiTitleCandidates(details, type);
    if (!candidates.length) return null;
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(candidates.join('|'))}`;
    try {
        const res = await fetchImpl(url);
        if (!res || !res.ok) return null;
        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {})
            .filter((p) => p && !('missing' in p) && typeof p.extract === 'string');

        // Alaka guard'ı: jenerik adlarda ("From", "Başlangıç") yanlış sayfaya
        // düşmemek için extract film/dizi sayfasına benzemeli.
        const relevant = pages.filter((p) =>
            /\b(film|television|tv series|directed by|starring|sezon|dizi)\b/i.test(p.extract.slice(0, 600)));

        // Aday SIRASI öncelikli: "(2010 film)" gibi spesifik başlık jenerikten
        // önce gelir; ilk yeterli aday kazanır. Hiçbiri eşleşmezse en uzun.
        const byOrder = candidates
            .map((c) => relevant.find((p) => p.title?.toLowerCase() === c.toLowerCase()))
            .find((p) => p && p.extract.length >= 1500);
        const best = byOrder
            || relevant.sort((a, b) => (b.extract?.length || 0) - (a.extract?.length || 0))[0];
        if (!best || (best.extract || '').length < 200) return null;
        const text = pickWikiSections(best.extract);
        if (!text || text.length < 120) return null;
        return { text, source: `${lang}.wikipedia` };
    } catch {
        return null;
    }
}
