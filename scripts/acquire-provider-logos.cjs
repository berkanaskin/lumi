// Acquire real provider logos from TMDB's watch-provider catalogue.
// TMDB serves licensed logos at https://image.tmdb.org/t/p/original{logo_path}.
// For each provider in region-platforms.js with a .svg placeholder, fetch
// /watch/providers/movie OR /tv (any region) and download the matching
// logo_path by provider_id.
//
// Output: public/img/providers/<slug>.png (overwrites .svg placeholder).
// Updates: region-platforms.js logo_path .svg→.png.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'data', 'region-platforms.js');
const OUT  = path.join(ROOT, 'public', 'img', 'providers');

// TMDB API key
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

async function loadTmdbProviders() {
    if (!TMDB_KEY) {
        console.warn('No TMDB_API_KEY env. Skipping acquisition.');
        return new Map();
    }
    const all = new Map(); // provider_id -> logo_path
    // Pull both movie + tv providers across multiple regions (TMDB filters
    // returned set by watch_region; null = all). We use a region union.
    const regions = ['US', 'TR', 'DE', 'FR', 'GB', 'JP', 'KR', 'IN', 'BR', 'ES', 'IT', 'AU', 'CA'];
    for (const kind of ['movie', 'tv']) {
        for (const region of regions) {
            try {
                const url = `https://api.themoviedb.org/3/watch/providers/${kind}?api_key=${TMDB_KEY}&watch_region=${region}`;
                const j = await fetchJson(url);
                (j.results || []).forEach((p) => {
                    if (p.provider_id && p.logo_path && !all.has(p.provider_id)) {
                        all.set(p.provider_id, p.logo_path);
                    }
                });
            } catch (e) {
                console.warn(`skip ${kind}/${region}: ${e.message}`);
            }
        }
    }
    return all;
}

function extractProviders(src) {
    // Parse `{ tmdb_id: NNN, ..., slug: 'xxx', logo_path: '/img/providers/xxx.svg' }`
    const re = /\{\s*tmdb_id:\s*(\d+)[^}]*slug:\s*'([^']+)'[^}]*logo_path:\s*'\/img\/providers\/([^']+)\.svg'/g;
    const list = [];
    let m;
    while ((m = re.exec(src))) {
        list.push({ tmdb_id: +m[1], slug: m[2], file: m[3] });
    }
    return list;
}

async function downloadAndOptimize(url, outPath) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download ${r.status} ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    // TMDB logos are PNG with transparent bg, ~500x500. Resize to 256w + palette.
    await sharp(buf)
        .resize({ width: 256, withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9, palette: true })
        .toFile(outPath);
    return fs.statSync(outPath).size;
}

async function main() {
    const src = fs.readFileSync(DATA, 'utf8');
    const providers = extractProviders(src);
    console.log(`Found ${providers.length} SVG-placeholder providers in region-platforms.js`);

    const tmdbLogos = await loadTmdbProviders();
    console.log(`TMDB catalogue loaded: ${tmdbLogos.size} unique providers`);

    const acquired = [];
    const failed = [];
    for (const p of providers) {
        const logoPath = tmdbLogos.get(p.tmdb_id);
        if (!logoPath) { failed.push(p.slug + ' (no TMDB logo)'); continue; }
        try {
            const url = `https://image.tmdb.org/t/p/original${logoPath}`;
            const outPath = path.join(OUT, `${p.slug}.png`);
            const size = await downloadAndOptimize(url, outPath);
            acquired.push({ slug: p.slug, size, url });
            console.log(`  + ${p.slug} (${(size / 1024).toFixed(1)}KB)`);
        } catch (e) {
            failed.push(p.slug + ' (' + e.message + ')');
        }
    }

    // Update region-platforms.js: .svg → .png ONLY for acquired slugs.
    let updated = src;
    for (const a of acquired) {
        const before = `'/img/providers/${a.slug}.svg'`;
        const after  = `'/img/providers/${a.slug}.png'`;
        updated = updated.split(before).join(after);
    }
    fs.writeFileSync(DATA, updated, 'utf8');

    console.log(`\nAcquired: ${acquired.length}`);
    console.log(`Failed:   ${failed.length}`);
    if (failed.length) console.log('  ' + failed.join('\n  '));

    fs.writeFileSync(
        path.join(__dirname, 'acquire-provider-logos.log.json'),
        JSON.stringify({ acquired, failed }, null, 2),
    );
}
main().catch((e) => { console.error(e); process.exit(1); });
