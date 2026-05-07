/**
 * LUMI - Preset Avatar Catalog
 * Plan 03.2-03 Track E
 *
 * All URLs MUST be HTTPS (Pitfall 4 / Threat T-03.2-03-01).
 * Using DiceBear (open-source, CDN, deterministic SVG avatars) — movie/cinema themed seeds.
 */

export const PRESET_AVATARS = [
    { id: 'avatar-01', label: 'Yıldız',    url: 'https://api.dicebear.com/7.x/shapes/svg?seed=star&backgroundColor=ffd54f' },
    { id: 'avatar-02', label: 'Klaket',    url: 'https://api.dicebear.com/7.x/shapes/svg?seed=clapboard&backgroundColor=ef5350' },
    { id: 'avatar-03', label: 'Bobin',     url: 'https://api.dicebear.com/7.x/shapes/svg?seed=reel&backgroundColor=42a5f5' },
    { id: 'avatar-04', label: 'Bilet',     url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ticket&backgroundColor=ab47bc' },
    { id: 'avatar-05', label: 'Sahne',     url: 'https://api.dicebear.com/7.x/shapes/svg?seed=stage&backgroundColor=26a69a' },
    { id: 'avatar-06', label: 'Yönetmen',  url: 'https://api.dicebear.com/7.x/bottts/svg?seed=director&backgroundColor=ff7043' },
    { id: 'avatar-07', label: 'Sinema',    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cinema&backgroundColor=5c6bc0' },
    { id: 'avatar-08', label: 'Mikrofon',  url: 'https://api.dicebear.com/7.x/bottts/svg?seed=mic&backgroundColor=66bb6a' },
    { id: 'avatar-09', label: 'Galaksi',   url: 'https://api.dicebear.com/7.x/identicon/svg?seed=galaxy&backgroundColor=7e57c2' },
    { id: 'avatar-10', label: 'Macera',    url: 'https://api.dicebear.com/7.x/identicon/svg?seed=adventure&backgroundColor=ec407a' },
];

/** Return true if `url` matches one of the preset avatars (or is on a known HTTPS CDN). */
export function isAllowedPhotoURL(url) {
    if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return false;
    const allowedHosts = [
        'api.dicebear.com',
        'lh3.googleusercontent.com', // Google sign-in default photo
        'image.tmdb.org',
        'i.pravatar.cc',
    ];
    try {
        const u = new URL(url);
        return allowedHosts.includes(u.hostname);
    } catch {
        return false;
    }
}
