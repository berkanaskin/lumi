// Fallback acquisition: for providers where the tmdb_id in region-platforms.js
// is wrong/missing, search TMDB watch-providers by NAME and pick the closest.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'img', 'providers');
const DATA = path.join(ROOT, 'src', 'data', 'region-platforms.js');
const KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

// failed slugs from acquire-provider-logos run + their human-readable names
// for fuzzy matching against TMDB provider_name.
const TARGETS = [
    { slug: 'exxen',         names: ['Exxen'] },
    { slug: 'tod',           names: ['TOD', 'beIN TOD', 'beIN Sports'] },
    { slug: 'puhutv',        names: ['Puhu TV', 'puhutv'] },
    { slug: 'mycanal',       names: ['Canal+', 'myCanal', 'Canal Plus'] },
    // ocs intentionally skipped — was acquired by Canal+ in 2024; no clean
    // TMDB match exists (DOCSVILLE was a false hit). Keep SVG placeholder.
    // { slug: 'ocs', names: ['OCS'] },
    { slug: 'france-tv',     names: ['France TV', 'francetv', 'France Télévisions'] },
    { slug: 'rtve-play',     names: ['RTVE Play', 'RTVE'] },
    { slug: 'flixole',       names: ['FlixOlé', 'Flixole'] },
    { slug: 'tving',         names: ['TVING'] },
    { slug: 'coupang-play',  names: ['Coupang Play'] },
    { slug: 'cbc-gem',       names: ['CBC Gem'] },
    { slug: 'abc-iview',     names: ['ABC iview', 'iView', 'ABC iView'] },
    { slug: 'sbs-on-demand', names: ['SBS On Demand'] },
    { slug: 'vix',           names: ['ViX', 'Vix', 'ViX+'] },
    { slug: 'claro-video',   names: ['Claro Video', 'Claro tv+', 'Claro Tv'] },
    { slug: 'hotstar',       names: ['Hotstar', 'Disney+ Hotstar', 'Jio Hotstar'] },
    { slug: 'jiocinema',     names: ['JioCinema', 'Jio Cinema'] },
];

async function fetchJson(u) { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); }

async function loadAll() {
    const map = new Map(); // name(lc) -> logo_path
    const regions = [null, 'US', 'TR', 'FR', 'DE', 'GB', 'JP', 'KR', 'IN', 'BR', 'ES', 'IT', 'AU', 'CA', 'MX'];
    for (const kind of ['movie', 'tv']) {
        for (const region of regions) {
            try {
                const url = `https://api.themoviedb.org/3/watch/providers/${kind}?api_key=${KEY}${region ? `&watch_region=${region}` : ''}`;
                const j = await fetchJson(url);
                (j.results || []).forEach((p) => {
                    if (p.provider_name && p.logo_path) {
                        const key = p.provider_name.toLowerCase().trim();
                        if (!map.has(key)) map.set(key, { name: p.provider_name, logo: p.logo_path, id: p.provider_id });
                    }
                });
            } catch {}
        }
    }
    return map;
}

async function download(logoPath, outPath) {
    const r = await fetch(`https://image.tmdb.org/t/p/original${logoPath}`);
    if (!r.ok) throw new Error('download ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).resize({ width: 256, withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9, palette: true }).toFile(outPath);
    return fs.statSync(outPath).size;
}

async function main() {
    const tmdb = await loadAll();
    console.log(`TMDB index: ${tmdb.size} providers by name`);
    const acquired = [];
    const failed = [];
    for (const t of TARGETS) {
        let hit = null;
        for (const n of t.names) {
            const k = n.toLowerCase().trim();
            if (tmdb.has(k)) { hit = tmdb.get(k); break; }
            // Loose match: prefix
            for (const [mk, mv] of tmdb) {
                if (mk.startsWith(k) || mk.includes(k)) { hit = mv; break; }
            }
            if (hit) break;
        }
        if (!hit) { failed.push(t.slug); continue; }
        try {
            const size = await download(hit.logo, path.join(OUT, `${t.slug}.png`));
            acquired.push({ slug: t.slug, matched: hit.name, id: hit.id, size });
            console.log(`  + ${t.slug} <- "${hit.name}" (id ${hit.id}, ${(size / 1024).toFixed(1)}KB)`);
        } catch (e) {
            failed.push(t.slug + ' (' + e.message + ')');
        }
    }

    // Update region-platforms.js .svg → .png for acquired
    let src = fs.readFileSync(DATA, 'utf8');
    for (const a of acquired) {
        const before = `'/img/providers/${a.slug}.svg'`;
        const after  = `'/img/providers/${a.slug}.png'`;
        src = src.split(before).join(after);
    }
    fs.writeFileSync(DATA, src, 'utf8');

    console.log(`\nAcquired: ${acquired.length}\nFailed:   ${failed.length}`);
    if (failed.length) console.log('  ' + failed.join('\n  '));
}
main().catch((e) => { console.error(e); process.exit(1); });
