import { type PlatformDetector, cleanTitle, make, isWatchingAnime } from '../helpers';

/**
 * Generic Anime Detector — broad fallback for any anime domain not covered
 * by a specific detector. Handles sites listed in the matches array below.
 *
 * To add a new site without writing a full detector: add its URL pattern here.
 */
export const genericAnimeDetector: PlatformDetector = {
    platform: 'generic_anime' as any,
    matches: [
        // Global streaming / community watch pages
        /\.to\/watch\//, /\.me\/watch\//, /\.tv\/watch\//, /\.net\/watch\//, /\.cc\/watch\//,
        /\.to\/anime\//, /\.me\/anime\//, /\.net\/anime\//,
        // Sites from the full list — catch all known anime domains
        /adkami\.com/, /animationdigitalnetwork\.com/,
        /an1me\.to/, /anicrush\.to/, /anidream\.cc/, /anigo\.to/,
        /smotret-anime\.org/, /animeav1\.com/, /animebuff\.ru/,
        /animefire\.net/, /animeflv\.net/, /animego\.me/, /animeheaven\.me/,
        /animeid\.tv/, /animekai\.to/, /animekhor\.org/, /animeko\.co/,
        /animelib\.org/, /animelon\.com/, /animenosub\.to/,
        /anime-odcinki\.pl/, /animeonegai\.com/, /animeonsen\.xyz/,
        /animepahe\.com/, /animesonline\.in/, /anime-sama\.tv/,
        /animetoast\.cc/, /animeunity\.it/, /animeworld\.tv/,
        /animevost\.org/, /animewho\.com/, /animexin\.vip/,
        /animezone\.pl/, /aninexus\.to/, /aniworld\.to/,
        /anixl\.to/, /aniyan\.net/, /anizium\.co/, /anizm\.net/,
        /anoboye\.com/, /betteranime\.net/, /bs\.to/,
        /bilibili\.tv/, /crunchyroll\.com/, /desu-online\.pl/,
        /docchi\.pl/, /fireani\.me/, /franime\.fr/,
        /french-anime\.com/, /frixysubs\.pl/, /fumetsu\.pl/,
        /animetsu\.net/, /hdrezka\.\w+/, /hianime\.to/,
        /hidive\.com/, /hinatasoul\.com/, /hulu\.com/,
        /jkanime\.net/, /kaguya\.app/, /kickassanime\.\w+/,
        /kuudere\.to/, /latanime\.org/, /luciferdonghua\.in/,
        /miruro\.to/, /moeclip\.com/, /monoschinos2\.com/,
        /netflix\.com/, /ogladajanime\.pl/, /okanime\.tv/,
        /otakufr\.cc/, /otakustv\.com/, /proxer\.me/,
        /shinden\.pl/, /sovetromantica\.com/, /tioanime\.com/,
        /toonanime\.cc/, /topanimes\.net/, /tranimeizle\.net/,
        /turkanime\.co/, /voiranime\.com/, /witanime\.pics/,
        /gogoanime\.\w+/, /9anime\.\w+/, /animesuge\.\w+/,
    ],
    detect() {
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const breadcrumbTitle = document.querySelector(
            '.breadcrumb a:nth-last-child(2), .panel-breadcrumb a:nth-last-child(2), nav a:nth-last-child(2)'
        )?.textContent?.trim();

        // 1. Progress — URL priority
        const segments = location.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        let progressMatch = location.pathname.match(/(?:ep|episode)[_-]?([\d.]+)/i)
            || (lastSegment && /^\d+$/.test(lastSegment) ? [null, lastSegment] : null)
            || location.search.match(/(?:ep|episode)=([\d.]+)/i);

        // 2. DOM fallback
        if (!progressMatch) {
            const el = document.querySelector('.current-episode, .episode-number, .active, h1, [class*="ep-"]');
            const m = el?.textContent?.match(/(?:EP|Episode)\s*([\d.]+)/i);
            if (m) progressMatch = m;
        }

        const progress = progressMatch ? parseFloat(progressMatch[1] || progressMatch[0] || '0') : 0;
        // Default to 1 for movies/OVAs/specials with no episode number

        // 3. Title
        let title = (breadcrumbTitle && !breadcrumbTitle.match(/Episode\s*\d+/i)) ? breadcrumbTitle : '';
        if (!title) {
            title = document.querySelector('.anime-title, .title, #anime-title, h1')?.textContent?.trim()
                || metaTitle.split(' - ')[0].split(' | ')[0].trim();
        }

        title = cleanTitle(title);

        if (!isWatchingAnime() || !title || title.length < 2) return null;
        const finalProgress = progress || 1; // Default to 1 for movies/OVAs

        console.log(`[Tsugi] Generic Anime Detection: Title="${title}", Progress=${finalProgress}`);
        return make('generic_anime' as any, title, finalProgress, 'anime');
    }
};

