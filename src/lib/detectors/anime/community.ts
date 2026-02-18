import { type PlatformDetector, cleanTitle, make, parseNum, text, isWatchingAnime } from '../helpers';

/**
 * Zoro.to / Aniwatch.to
 * URL pattern: /watch/anime-title-123?ep=456
 */
export const zoroDetector: PlatformDetector = {
    platform: 'zoro',
    matches: [/zoro\.to\/watch\//, /aniwatch\.to\/watch\//, /aniwatchtv\.to\/watch\//],
    detect() {
        // TODO: Zoro is a SPA — selectors may change after updates
        // Series title is in the breadcrumb or meta og:title
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const titleEl = document.querySelector('.film-name, [class*="film-name"], h2.film-name');
        const epEl = document.querySelector('.ep-name, [class*="ep-name"]');

        const title = cleanTitle(titleEl?.textContent?.trim() ?? metaTitle.split(' - ')[0]);
        const epText = epEl?.textContent ?? '';
        const progress = parseNum(epText) || parseNum(new URL(location.href).searchParams.get('ep') ?? '0');

        if (!isWatchingAnime() || !title) return null;
        return make('zoro', title, progress, 'anime');
    },
};

/**
 * 9anime
 * URL pattern: /watch/anime-title.xyz/ep-N
 */
export const nineAnimeDetector: PlatformDetector = {
    platform: '9anime',
    matches: [/9anime\.\w+\/watch\//],
    detect() {
        // TODO: 9anime heavily obfuscates its DOM — selectors below are approximate
        const title = cleanTitle(text('h1.title, .title.is-5, [class*="anime-title"]'));
        const epText = text('.ep-range .active, [class*="ep-item"].active, [class*="episode"].active');
        const progress = parseNum(epText);

        if (!isWatchingAnime() || !title) return null;
        return make('9anime', title, progress, 'anime');
    },
};

/**
 * Gogoanime
 * URL pattern: /category/anime-title  (series page)
 *              /anime-title-episode-N  (watch page)
 */
export const gogoanimeDetector: PlatformDetector = {
    platform: 'gogoanime',
    matches: [/gogoanime\.\w+\//, /gogoanimehd\.\w+\//],
    detect() {
        // Episode page title format: "Anime Name Episode N"
        const h1 = text('h1, .anime_info_body_bg h1');
        const epMatch = h1.match(/Episode\s+([\d.]+)/i);
        const progress = epMatch ? parseFloat(epMatch[1]) : 0;
        const title = cleanTitle(h1);

        if (!isWatchingAnime() || !title) return null;
        return make('gogoanime', title, progress, 'anime');
    },
};

/**
 * Animesuge
 * URL pattern: /anime/anime-title/episode-N
 */
export const animesugeDetector: PlatformDetector = {
    platform: 'animesuge',
    matches: [/animesuge\.\w+\/anime\//],
    detect() {
        // TODO: verify current selectors on live site
        const title = cleanTitle(text('.anime-title, h1.title'));
        const epText = text('.ep-list .active, .episodes .active');
        const progress = parseNum(epText) || parseNum(location.pathname.match(/episode-([\d.]+)/)?.[1] ?? '0');

        if (!isWatchingAnime() || !title) return null;
        return make('animesuge', title, progress, 'anime');
    },
};
