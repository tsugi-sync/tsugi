import { type PlatformDetector, cleanTitle, make, isWatchingAnime } from '../helpers';

/**
 * Fallback for sites that look like anime players.
 */
export const genericAnimeDetector: PlatformDetector = {
    platform: 'generic_anime' as any,
    matches: [/\.to\/watch\//, /\.me\/watch\//, /\.tv\/watch\//, /\.net\/watch\//, /anime/],
    detect() {
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const breadcrumbTitle = document.querySelector('.breadcrumb a:nth-last-child(2), .panel-breadcrumb a:nth-last-child(2), nav a:nth-last-child(2)')?.textContent?.trim();

        // 1. Progress — URL priority
        const segments = location.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        let progressMatch = location.pathname.match(/(?:ep|episode)[_-]?([\d.]+)/i)
            || (lastSegment && /^\d+$/.test(lastSegment) ? [null, lastSegment] : null)
            || location.search.match(/(?:ep|episode)=([\d.]+)/i);

        // 2. DOM Priority
        if (!progressMatch) {
            const el = document.querySelector('.current-episode, .episode-number, .active, h1, [class*="ep-"]');
            const m = el?.textContent?.match(/(?:EP|Episode)\s*([\d.]+)/i);
            if (m) progressMatch = m;
        }

        const progress = progressMatch ? parseFloat(progressMatch[1] || progressMatch[0] || '0') : 0;

        // 3. Title
        let title = (breadcrumbTitle && !breadcrumbTitle.match(/Episode\s*\d+/i)) ? breadcrumbTitle : '';
        if (!title) {
            title = document.querySelector('.anime-title, .title, #anime-title, h1')?.textContent?.trim()
                || metaTitle.split(' - ')[0].split(' | ')[0].trim();
        }

        title = cleanTitle(title);

        if (!isWatchingAnime() || progress <= 0 || !title || title.length < 2) return null;

        console.log(`[Tsugi] Generic Anime Detection: Title="${title}", Progress=${progress}`);
        return make('generic_anime' as any, title, progress, 'anime');
    }
};
