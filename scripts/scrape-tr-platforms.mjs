#!/usr/bin/env node
/**
 * Phase 05.5-11 — TR yerel platform katalog hattı.
 *
 * Gain / Puhu / Tabii kataloglarını SITEMAP'lerinden çeker (en az kırılgan
 * yüzey), slug'ları TMDB'ye eşler ve src/data/turkish-platform-catalog.json
 * overlay'ini günceller. Exxen robots.txt ile taramayı yasaklıyor — Exxen
 * mevcut yapımcı-sezgisi (streaming-cache TR_PRODUCER_PROVIDERS) + manuel
 * girişlerle kalır.
 *
 * Eşleme kuralı:
 *   - Başlık+normalizasyon birebir eşleşen TMDB sonucu → otomatik kabul
 *     (aynı isimli adaylardan en popüleri).
 *   - Eşleşmeyen → _unverified (PR açıklamasında "şüpheli" listesi).
 *
 * Güvenlik mandalları:
 *   - Platform başına sayım önceki çalışmanın %50'sinin altına düşerse
 *     exit 2 (site yapısı değişti → workflow kırmızı, PR açılmaz).
 *   - _slugMap cache'i: önceki çalışmalarda eşlenen slug'lar TMDB'ye tekrar
 *     sorulmaz (aylık koşular artımlı kalır).
 *
 * Kullanım: TMDB_API_KEY=... node scripts/scrape-tr-platforms.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, '..', 'src', 'data', 'turkish-platform-catalog.json');
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
const UA = { 'User-Agent': 'LumiBot/1.0 (+https://lumi-jade.vercel.app; catalog sync)' };

if (!TMDB_KEY) {
    console.error('TMDB_API_KEY env eksik.');
    process.exit(1);
}

/* ----------------------------- yardımcılar ------------------------------- */

const normalize = (s) => (s || '')
    .toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[^a-z0-9]/g, '');

const deslug = (slug) => decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function getText(url) {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.text();
}

function locs(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ adapter'lar ------------------------------ */

async function scrapePuhu() {
    const items = [];
    const films = locs(await getText('https://puhutv.com/sitemap/filmler/1.xml'));
    for (const u of films) {
        const m = u.match(/puhutv\.com\/(.+)-izle$/);
        if (m) items.push({ platform: 'puhutv', slug: m[1], title: deslug(m[1]), mediaType: 'movie' });
    }
    const series = locs(await getText('https://puhutv.com/sitemap/diziler/1.xml'));
    for (const u of series) {
        const m = u.match(/puhutv\.com\/(.+)-detay$/);
        if (m) items.push({ platform: 'puhutv', slug: m[1], title: deslug(m[1]), mediaType: 'tv' });
    }
    return items;
}

async function scrapeGain() {
    const xml = await getText('https://www.gain.tv/tr-sitemap.xml');
    return locs(xml)
        .map((u) => u.match(/gain\.tv\/t\/[^/]+\/([^/?#]+)/))
        .filter(Boolean)
        .map((m) => ({ platform: 'gain', slug: m[1], title: deslug(m[1]), mediaType: 'either' }));
}

async function scrapeTabii() {
    const xml = await getText('https://www.tabii.com/sitemap-tr.xml');
    return locs(xml)
        .map((u) => u.match(/tabii\.com\/tr\/detail\/\d+\/([^/?#]+)/))
        .filter(Boolean)
        .map((m) => ({ platform: 'tabii', slug: m[1], title: deslug(m[1]), mediaType: 'either' }));
}

/* ------------------------------ TMDB eşleme ------------------------------ */

async function tmdbMatch(item) {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&language=tr-TR&region=TR&query=${encodeURIComponent(item.title)}&page=1`;
    const res = await fetch(url);
    if (res.status === 429) { await sleep(2000); return tmdbMatch(item); }
    if (!res.ok) return null;
    const data = await res.json();
    const want = normalize(item.title);
    const cands = (data.results || [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .filter((r) => item.mediaType === 'either' || r.media_type === item.mediaType)
        .filter((r) => [r.title, r.name, r.original_title, r.original_name]
            .some((t) => t && normalize(t) === want));
    if (!cands.length) return null;
    cands.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const best = cands[0];
    return { tmdbId: best.id, mediaType: best.media_type, matchedTitle: best.title || best.name };
}

/* --------------------------------- main ---------------------------------- */

// Çalışma anı kataloğu (client bundle'ına girer — KÜÇÜK kalmalı) ile
// pipeline cache'i (slug eşleme önbelleği + şüpheliler) AYRI dosyalardır.
const CACHE_PATH = path.join(__dirname, 'tr-platforms-cache.json');

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
catalog.byTmdbId = catalog.byTmdbId || { movie: {}, tv: {} };
catalog.byNormalizedTitle = catalog.byNormalizedTitle || {};

let cache;
try { cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')); }
catch { cache = {}; }
cache._slugMap = cache._slugMap || {};
cache._counts = cache._counts || {};

const adapters = { puhutv: scrapePuhu, gain: scrapeGain, tabii: scrapeTabii };
const allItems = [];
const newCounts = {};

for (const [name, fn] of Object.entries(adapters)) {
    try {
        const items = await fn();
        newCounts[name] = items.length;
        const prev = cache._counts[name] || 0;
        if (prev > 20 && items.length < prev * 0.5) {
            console.error(`ALARM: ${name} ${items.length} içerik (önceki ${prev}) — site yapısı değişmiş olabilir.`);
            process.exit(2);
        }
        console.log(`${name}: ${items.length} içerik`);
        allItems.push(...items);
    } catch (e) {
        console.error(`ALARM: ${name} scrape başarısız: ${e.message}`);
        process.exit(2);
    }
}

const addTo = (map, key, platform) => {
    const cur = new Set(map[key] || []);
    cur.add(platform);
    map[key] = [...cur].sort();
};

let mapped = 0, cached = 0, suspects = [];
for (const item of allItems) {
    const cacheKey = `${item.platform}:${item.slug}`;
    let hit = cache._slugMap[cacheKey];
    if (hit === undefined) {
        const match = await tmdbMatch(item);
        hit = match ? `${match.mediaType}:${match.tmdbId}` : null;
        cache._slugMap[cacheKey] = hit;
        await sleep(30); // TMDB nezaket aralığı
    } else {
        cached++;
    }
    if (hit) {
        const [mt, id] = hit.split(':');
        catalog.byTmdbId[mt] = catalog.byTmdbId[mt] || {};
        addTo(catalog.byTmdbId[mt], id, item.platform);
        addTo(catalog.byNormalizedTitle, normalize(item.title), item.platform);
        mapped++;
    } else {
        suspects.push({ platform: item.platform, slug: item.slug, title: item.title });
    }
}

cache._counts = newCounts;
cache._unverified = suspects;
catalog.updated = new Date().toISOString().slice(0, 10);
catalog.version = (catalog.version || 3) + 0; // şema sürümü sabit; updated alanı değişir

writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');

console.log(`\nÖZET: ${allItems.length} içerik | eşlenen ${mapped} (${cached} cache) | şüpheli ${suspects.length}`);
console.log(`byTmdbId: movie=${Object.keys(catalog.byTmdbId.movie || {}).length} tv=${Object.keys(catalog.byTmdbId.tv || {}).length}`);
console.log('Exxen: robots.txt taramayı yasaklıyor — yapımcı-sezgisi + manuel girişlerle sürüyor.');
