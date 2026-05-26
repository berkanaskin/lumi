# Brandfetch Logo Acquisition Log

**Date:** 2026-05-26
**Endpoint:** `https://cdn.brandfetch.io/<domain>/w/256/h/256` (path-style, NOT `?c=logo` query — that returns 403)
**Headers:** `User-Agent: Chrome/120`, `Referer: https://brandfetch.com/`, `Accept: image/webp`
**Output format:** WEBP (Brandfetch's native CDN format at sizes ≤ 256px)
**Output dir:** `public/img/providers/`

## Method notes

- Initial attempt with `?c=logo&h=192` query params returned 403 Forbidden across all domains. Brandfetch now gates the legacy query-param API behind a client ID token.
- Path-style endpoint `/w/<W>/h/<H>` works without auth.
- Rate-limiting observed: rapid bursts get Cloudflare interstitial HTML (~252KB). Mitigated with 350ms sleep between requests + retry-once on non-image response.
- Size sanity floor: 500 bytes (anything smaller is a fallback lettermark placeholder, not a real logo).

## CRITICAL (visual verification required)

| Slug  | Domain    | Final size | Visual check | Verdict |
|-------|-----------|------------|--------------|---------|
| gain  | gain.tv   | 2254 B     | White "GAIN" wordmark + red balloon on black, Turkish style | ✓ CORRECT BRAND |
| mubi  | mubi.com  | 3254 B     | MUBI dot-grid "M" symbol on deep blue | ✓ CORRECT BRAND |
| tabii | tabii.com | 890 B      | Generic video-thumbnail lettermark fallback (not Tabii red wordmark) | ⚠ WRONG — Brandfetch has no real logo; deleted webp, kept existing `tabii.svg` placeholder |

Searched alternates for Tabii: `tabii.com.tr` returned a different brand's stylized "B" (not Tabii). Brandfetch search API confirms `tabii.com` brand entry exists but icon path is marked `fallback/lettermark`. Falling back to existing SVG placeholder per brief.

## TR set (11 platforms)

| Slug          | Domain          | HTTP | Type        | Size  | Status |
|---------------|-----------------|------|-------------|-------|--------|
| gain          | gain.tv         | 200  | image/webp  | 2254  | OK     |
| tabii         | tabii.com       | 200  | image/webp  | 890   | FAIL (placeholder kept) |
| mubi          | mubi.com        | 200  | image/webp  | 3254  | OK     |
| netflix       | netflix.com     | 200  | image/webp  | 1430  | OK     |
| disney-plus   | disneyplus.com  | 200  | image/webp  | 3020  | OK     |
| prime-video   | primevideo.com  | 200  | image/webp  | 3540  | OK     |
| hbo-max       | max.com         | 200  | image/webp  | 2202  | OK     |
| apple-tv-plus | tv.apple.com    | 200  | image/webp  | 1324  | OK     |
| exxen         | exxen.com       | 200  | image/webp  | 3026  | OK     |
| tod           | tod.com         | 200  | image/webp  | 3826  | OK (todtv.com gave 426 B fallback; tod.com used instead) |
| puhutv        | puhutv.com      | 200  | image/webp  | 2724  | OK     |

**TR result: 10/11 acquired** (tabii kept as existing SVG placeholder).

## Global set (26 platforms)

| Slug           | Domain               | HTTP | Type        | Size | Status |
|----------------|----------------------|------|-------------|------|--------|
| paramount-plus | paramountplus.com    | 200  | image/webp  | 5512 | OK |
| peacock        | peacocktv.com        | 200  | image/webp  | 2290 | OK |
| hulu           | hulu.com             | 200  | image/webp  | 1784 | OK |
| crunchyroll    | crunchyroll.com      | 200  | image/webp  | 2134 | OK |
| bbc-iplayer    | bbc.com              | 200  | image/webp  | 3370 | OK |
| now-tv         | now.com              | 200  | image/webp  | 2528 | OK |
| britbox        | britbox.com          | 200  | image/webp  | 2612 | OK |
| itvx           | itv.com              | 200  | image/webp  | 2154 | OK |
| wow            | wowtv.de             | 200  | image/webp  | 2518 | OK |
| rtl-plus       | rtlplus.de           | 200  | image/webp  | 874  | OK (small but valid) |
| joyn           | joyn.de              | 200  | image/webp  | 1640 | OK |
| magenta-tv     | magentatv.de         | 200  | image/webp  | 1628 | OK |
| canal-plus     | canalplus.com        | 200  | image/webp  | 2760 | OK |
| ocs            | ocs.fr               | 200  | image/webp  | 1764 | OK |
| u-next         | unext.jp             | 200  | image/webp  | 2572 | OK |
| abema          | abema.tv             | 200  | image/webp  | 1998 | OK |
| wavve          | wavve.com            | 200  | image/webp  | 1742 | OK |
| tving          | tving.com            | 200  | image/webp  | 2122 | OK |
| crave          | crave.ca             | 200  | image/webp  | 2538 | OK |
| stan           | stan.com.au          | 200  | image/webp  | 2610 | OK |
| binge          | binge.com.au         | 200  | image/webp  | 2640 | OK |
| globoplay      | globoplay.globo.com  | 200  | image/webp  | 2322 | OK |
| hotstar        | hotstar.com          | 200  | image/webp  | 5972 | OK |
| zee5           | zee5.com             | 200  | image/webp  | 2224 | OK |
| jiocinema      | jiocinema.com        | 200  | image/webp  | 2342 | OK |
| sonyliv        | sonyliv.com          | 200  | image/webp  | 5864 | OK |

**Global result: 26/26 acquired.**

## Total: 36/37 logos acquired (97.3%)

## Important follow-up for code change (separate phase, NOT done here)

All new files are `.webp`, not `.png`. The existing `.png` files in `public/img/providers/` are untouched (preserved). Two integration options:

1. **Update `src/data/region-platforms.js`** to reference `.webp` paths for the new logos.
2. **Or convert** the new WEBPs to PNG via `sips`/`magick` if the app requires PNG.

The brief explicitly forbids modifying `region-platforms.js` in this task, so this is deferred.
