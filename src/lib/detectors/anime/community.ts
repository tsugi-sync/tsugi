import { type PlatformDetector, cleanTitle, make, parseNum, text, isWatchingAnime } from '../helpers';

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Extract real episode number from DOM before falling back to URL.
 * Many sites use ?ep=<internal_id> which is NOT an episode number.
 */
function extractEpisodeNumber(): number {
    // 1. DOM: explicit episode number indicators
    const domEp = text(
        '.current-episode, .episode-number, .ep-number, ' +
        '[data-number], .ep-item.active, .active-ep, ' +
        '.ep-name, [class*="episode-num"], [class*="ep-num"]'
    );
    const domMatch = domEp.match(/(\d+(?:\.\d+)?)/);
    if (domMatch) {
        const n = parseFloat(domMatch[1]);
        if (n > 0 && n < 10000) return n;
    }

    // 2. URL path: /episode-12, /ep-3, /ep/5 etc.
    const pathMatch =
        location.pathname.match(/\/episode[_-](\d+(?:\.\d+)?)/i) ||
        location.pathname.match(/\/ep[_-](\d+(?:\.\d+)?)/i) ||
        location.pathname.match(/\/ep\/(\d+(?:\.\d+)?)/i) ||
        location.pathname.match(/-episode-(\d+(?:\.\d+)?)/i);
    if (pathMatch) return parseFloat(pathMatch[1]);

    // 3. URL: ?episode=5 (full word query param — typically the real number)
    const searchEpisode = location.search.match(/[?&]episode=(\d+(?:\.\d+)?)/);
    if (searchEpisode) return parseFloat(searchEpisode[1]);

    // 4. URL: ?ep=N — only trust if it looks like a real ep number (≤ 4 digits)
    // Large values like ep=58914 are internal DB IDs, not episode numbers.
    const searchEp = location.search.match(/[?&]ep=(\d+(?:\.\d+)?)/);
    if (searchEp) {
        const n = parseFloat(searchEp[1]);
        if (n > 0 && n <= 2000) return n;
    }

    return 0;
}

/** Reusable detection logic for most community sites */
function genericDetect(platform: string) {
    const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
    const breadcrumbTitle = document.querySelector(
        '.breadcrumb a:nth-last-child(2), nav a:nth-last-child(2), .breadcrumbs a:nth-last-child(2)'
    )?.textContent?.trim() ?? '';

    const domTitle = text('.anime-title, .series-title, .title, h1, #anime-title');
    let title = (breadcrumbTitle && !breadcrumbTitle.match(/Episode\s*\d+/i))
        ? breadcrumbTitle
        : (domTitle || metaContent.split(' - ')[0].split(' | ')[0].trim());
    title = cleanTitle(title);

    const progress = extractEpisodeNumber() || 1; // Default to 1 for movies/OVAs

    if (!isWatchingAnime() || !title || title.length < 2) return null;
    console.log(`[Tsugi] ${platform}: title="${title}", ep=${progress}`);
    return make(platform as any, title, progress, 'anime');
}

// ─── Zoro / Aniwatch family ───────────────────────────────────────────────────

export const zoroDetector: PlatformDetector = {
    platform: 'zoro',
    matches: [/zoro\.to\/watch\//, /aniwatch\.to\/watch\//, /aniwatchtv\.to\/watch\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const titleEl = document.querySelector('.film-name, [class*="film-name"], h2.film-name');
        const epEl = document.querySelector('.ep-name, [class*="ep-name"]');
        const title = cleanTitle(titleEl?.textContent?.trim() || metaContent.split(' - ')[0]);
        const epText = epEl?.textContent ?? '';
        const searchEp = new URL(location.href).searchParams.get('ep') ?? '0';
        const progress = parseNum(epText) || parseNum(searchEp) || 1;
        if (!isWatchingAnime() || !title) return null;
        return make('zoro', title, progress, 'anime');
    },
};

export const hiAnimeDetector: PlatformDetector = {
    platform: 'hianime',
    matches: [/hianime\.to\/watch\//],
    detect() {
        // Title: prefer .film-name element, fall back to og:title
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const titleEl = document.querySelector('.film-name, [class*="film-name"], h2.film-name');
        const title = cleanTitle(titleEl?.textContent?.trim() || metaContent.split(' - ')[0]);

        // Episode number: HiAnime uses ?ep=<internal_id>, NOT the episode number.
        // The real episode number is in the active episode item's data-number attribute
        // or in the .ep-name text (e.g. "Ep 12").
        let progress = 0;

        // 1. Active episode in the episode list sidebar
        const activeEp = document.querySelector(
            '.ep-item.active, .ssl-item.ep-item.active, [class*="ep-item"][class*="active"], ' +
            '.episodes-ul .active, .ss-list .active'
        );
        if (activeEp) {
            const dataNum = activeEp.getAttribute('data-number') ||
                activeEp.getAttribute('data-ep-num') ||
                activeEp.querySelector('[data-number]')?.getAttribute('data-number');
            if (dataNum) progress = parseFloat(dataNum);
        }

        // 2. Episode name element (e.g. "Episode 5" or "Ep 5")
        if (!progress) {
            const epName = text('.ep-name, [class*="ep-name"], .detail_page-watch .ep-name');
            const m = epName.match(/(\d+(?:\.\d+)?)/);
            if (m) progress = parseFloat(m[1]);
        }

        // 3. URL path slug episode number (e.g. .../dragon-ball-z-1-episode-5-...)
        if (!progress) {
            const pathMatch = location.pathname.match(/episode-(\d+(?:\.\d+)?)/i);
            if (pathMatch) progress = parseFloat(pathMatch[1]);
        }

        // 4. Default to 1 for movies/OVAs/specials with no episode list
        if (!progress) progress = 1;

        if (!isWatchingAnime() || !title) return null;
        console.log(`[Tsugi] hianime: title="${title}", ep=${progress}`);
        return make('hianime', title, progress, 'anime');
    },
};

export const aniCrushDetector: PlatformDetector = {
    platform: 'anicrush',
    matches: [/anicrush\.to\/watch\//],
    detect() { return genericDetect('anicrush'); },
};

export const an1meDetector: PlatformDetector = {
    platform: 'an1me',
    matches: [/an1me\.to\/watch\//, /an1me\.to\/anime\//],
    detect() { return genericDetect('an1me'); },
};

export const aniGoDetector: PlatformDetector = {
    platform: 'anigo',
    matches: [/anigo\.to\/watch\//],
    detect() { return genericDetect('anigo'); },
};

export const aniNexusDetector: PlatformDetector = {
    platform: 'aninexus',
    matches: [/aninexus\.to\/watch\//],
    detect() { return genericDetect('aninexus'); },
};

export const aniXLDetector: PlatformDetector = {
    platform: 'anixl',
    matches: [/anixl\.to\/watch\//],
    detect() { return genericDetect('anixl'); },
};

export const kuudereDetector: PlatformDetector = {
    platform: 'kuudere',
    matches: [/kuudere\.to\/watch\//],
    detect() { return genericDetect('kuudere'); },
};

export const miruroDetector: PlatformDetector = {
    platform: 'miruro',
    matches: [/miruro\.to\/watch\//],
    detect() { return genericDetect('miruro'); },
};

export const aniDreamDetector: PlatformDetector = {
    platform: 'anidream',
    matches: [/anidream\.cc\/watch\//, /anidream\.cc\/anime\//],
    detect() { return genericDetect('anidream'); },
};

export const anoBoyeDetector: PlatformDetector = {
    platform: 'anoboye',
    matches: [/anoboye\.com\/watch\//, /anoboye\.com\/anime\//],
    detect() { return genericDetect('anoboye'); },
};

// ─── 9anime ───────────────────────────────────────────────────────────────────

export const nineAnimeDetector: PlatformDetector = {
    platform: '9anime',
    matches: [/9anime\.\w+\/watch\//],
    detect() {
        const title = cleanTitle(text('h1.title, .title.is-5, [class*="anime-title"]'));
        const epText = text('.ep-range .active, [class*="ep-item"].active, [class*="episode"].active');
        const progress = parseNum(epText);
        if (!isWatchingAnime() || !title) return null;
        return make('9anime', title, progress, 'anime');
    },
};

// ─── Gogoanime ────────────────────────────────────────────────────────────────

export const gogoanimeDetector: PlatformDetector = {
    platform: 'gogoanime',
    matches: [/gogoanime\.\w+\//, /gogoanimehd\.\w+\//],
    detect() {
        const h1 = text('h1, .anime_info_body_bg h1');
        const epMatch = h1.match(/Episode\s+([\d.]+)/i);
        const progress = epMatch ? parseFloat(epMatch[1]) : 0;
        const title = cleanTitle(h1);
        if (!isWatchingAnime() || !title) return null;
        return make('gogoanime', title, progress, 'anime');
    },
};

// ─── Animesuge ────────────────────────────────────────────────────────────────

export const animesugeDetector: PlatformDetector = {
    platform: 'animesuge',
    matches: [/animesuge\.\w+\/anime\//],
    detect() {
        const title = cleanTitle(text('.anime-title, h1.title'));
        const epText = text('.ep-list .active, .episodes .active');
        const urlEp = location.pathname.match(/episode-([\d.]+)/)?.[1] ?? '0';
        const progress = parseNum(epText) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animesuge', title, progress, 'anime');
    },
};

// ─── KickAssAnime ─────────────────────────────────────────────────────────────

export const kickAssAnimeDetector: PlatformDetector = {
    platform: 'kickassanime',
    matches: [/kickassanime\.\w+\/anime\//],
    detect() { return genericDetect('kickassanime'); },
};

// ─── AnimeKAI ─────────────────────────────────────────────────────────────────

export const animeKAIDetector: PlatformDetector = {
    platform: 'animekai',
    matches: [/animekai\.to\/watch\//],
    detect() { return genericDetect('animekai'); },
};

// ─── AnimeWorld (IT) ──────────────────────────────────────────────────────────

export const animeWorldDetector: PlatformDetector = {
    platform: 'animeworld',
    matches: [/animeworld\.tv\/play\//, /animeworld\.so\/play\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="anime-title"], [class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const urlEp = location.pathname.match(/\/(\d+(?:\.\d+)?)$/)?.[1] ?? '0';
        const progress = parseNum(urlEp) || parseNum(text('[class*="episode-number"]'));
        if (!isWatchingAnime() || !title) return null;
        return make('animeworld', title, progress, 'anime');
    },
};

// ─── AnimeUnity (IT) ─────────────────────────────────────────────────────────

export const animeUnityDetector: PlatformDetector = {
    platform: 'animeunity',
    matches: [/animeunity\.it\/anime\//, /animeunity\.to\/anime\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' episodio')[0]);
        const urlEp = location.pathname.match(/\/(\d+(?:\.\d+)?)$/)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animeunity', title, progress, 'anime');
    },
};

// ─── AnimeFlv (ES) ────────────────────────────────────────────────────────────

export const animeflvDetector: PlatformDetector = {
    platform: 'animeflv',
    matches: [/animeflv\.net\/ver\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('h1, .anime-info h1');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const urlEp = location.pathname.match(/\/ver\/[^/]+-(\d+(?:\.\d+)?)$/)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animeflv', title, progress, 'anime');
    },
};

// ─── Jkanime (ES) ────────────────────────────────────────────────────────────

export const jkanimeDetector: PlatformDetector = {
    platform: 'jkanime',
    matches: [/jkanime\.net\/[^/]+\/\d+/],
    detect() {
        const title = cleanTitle(text('h1.anime__details__title, .anime__details__title h1, h1'));
        const progress = parseNum(location.pathname.split('/').filter(Boolean).pop() ?? '0');
        if (!isWatchingAnime() || !title) return null;
        return make('jkanime', title, progress, 'anime');
    },
};

// ─── tioanime (ES) ────────────────────────────────────────────────────────────

export const tioAnimeDetector: PlatformDetector = {
    platform: 'tioanime',
    matches: [/tioanime\.com\/ver\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('h1, .anime-title');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const urlEp = location.pathname.match(/-(\d+(?:\.\d+)?)$/)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('tioanime', title, progress, 'anime');
    },
};

export const latanimeDetector: PlatformDetector = {
    platform: 'latanime',
    matches: [/latanime\.org\/ver\//],
    detect() { return genericDetect('latanime'); },
};

export const monosChinosDetector: PlatformDetector = {
    platform: 'monoschinos',
    matches: [/monoschinos2\.com\/ver\//],
    detect() { return genericDetect('monoschinos'); },
};

// ─── BetterAnime (BR/PT) ──────────────────────────────────────────────────────

export const betterAnimeDetector: PlatformDetector = {
    platform: 'betteranime',
    matches: [/betteranime\.net\/anime\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' – ')[0]);
        const urlEp = location.pathname.match(/\/(\d+(?:\.\d+)?)(?:\/?$)/)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('betteranime', title, progress, 'anime');
    },
};

export const animeFireDetector: PlatformDetector = {
    platform: 'animefire',
    matches: [/animefire\.net\/anime\//],
    detect() { return genericDetect('animefire'); },
};

// ─── AnimeSama (FR) ───────────────────────────────────────────────────────────

export const animeSamaDetector: PlatformDetector = {
    platform: 'animesama',
    matches: [/anime-sama\.tv\/catalogue\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1, h2');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const searchEp = new URL(location.href).searchParams.get('episode') ?? '0';
        const urlEp = location.pathname.match(/\/(\d+(?:\.\d+)?)(?:\/?$)/)?.[1] ?? '0';
        const progress = parseNum(searchEp) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animesama', title, progress, 'anime');
    },
};

export const frAnimeDetector: PlatformDetector = {
    platform: 'franime',
    matches: [/franime\.fr\/animes\//],
    detect() { return genericDetect('franime'); },
};

export const frenchAnimeDetector: PlatformDetector = {
    platform: 'french_anime',
    matches: [/french-anime\.com\/anime\//],
    detect() { return genericDetect('french_anime'); },
};

export const voirAnimeDetector: PlatformDetector = {
    platform: 'voiranime',
    matches: [/voiranime\.com\/anime\//],
    detect() { return genericDetect('voiranime'); },
};

export const otakuFRDetector: PlatformDetector = {
    platform: 'otakufr',
    matches: [/otakufr\.cc\/anime\//],
    detect() { return genericDetect('otakufr'); },
};

// ─── Polish sites ─────────────────────────────────────────────────────────────

export const animeOdcinkiDetector: PlatformDetector = {
    platform: 'animeodcinki',
    matches: [/anime-odcinki\.pl\/anime\//],
    detect() { return genericDetect('animeodcinki'); },
};

export const frixySubsDetector: PlatformDetector = {
    platform: 'frixysubs',
    matches: [/frixysubs\.pl\/anime\//],
    detect() { return genericDetect('frixysubs'); },
};

export const fumetsuDetector: PlatformDetector = {
    platform: 'fumetsu',
    matches: [/fumetsu\.pl\/anime\//],
    detect() { return genericDetect('fumetsu'); },
};

export const docchiDetector: PlatformDetector = {
    platform: 'docchi',
    matches: [/docchi\.pl\/anime\//],
    detect() { return genericDetect('docchi'); },
};

export const ogladajAnimeDetector: PlatformDetector = {
    platform: 'ogladajanime',
    matches: [/ogladajanime\.pl\/do-obejrzenia\//],
    detect() { return genericDetect('ogladajanime'); },
};

export const animeZoneDetector: PlatformDetector = {
    platform: 'animezone',
    matches: [/animezone\.pl\/odcinek\//],
    detect() { return genericDetect('animezone'); },
};

export const desuOnlineDetector: PlatformDetector = {
    platform: 'desuonline',
    matches: [/desu-online\.pl\/anime\//],
    detect() { return genericDetect('desuonline'); },
};

export const shindenDetector: PlatformDetector = {
    platform: 'shinden',
    matches: [/shinden\.pl\/episode\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' – ')[0]);
        const urlEp = location.pathname.match(/\/episode\/(\d+)/)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('shinden', title, progress, 'anime');
    },
};

// ─── Turkish sites ────────────────────────────────────────────────────────────

export const turkAnimeDetector: PlatformDetector = {
    platform: 'turkanime',
    matches: [/turkanime\.co\/video\//],
    detect() { return genericDetect('turkanime'); },
};

export const trAnimeizleDetector: PlatformDetector = {
    platform: 'tranimeizle',
    matches: [/tranimeizle\.net\/.*-\d+-bolum/],
    detect() { return genericDetect('tranimeizle'); },
};

export const anizmDetector: PlatformDetector = {
    platform: 'anizm',
    matches: [/anizm\.net\/anime\//],
    detect() { return genericDetect('anizm'); },
};

// ─── Arabic sites ─────────────────────────────────────────────────────────────

export const witAnimeDetector: PlatformDetector = {
    platform: 'witanime',
    matches: [/witanime\.pics\/episode\//],
    detect() { return genericDetect('witanime'); },
};

export const okAnimeDetector: PlatformDetector = {
    platform: 'okanime',
    matches: [/okanime\.tv\/episodes\//],
    detect() { return genericDetect('okanime'); },
};

// ─── Russian/CIS sites ────────────────────────────────────────────────────────

export const animeGODetector: PlatformDetector = {
    platform: 'animego',
    matches: [/animego\.me\/anime\/.*\/player\b/],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' — ')[0]);
        const searchEp = new URL(location.href).searchParams.get('episode') ?? '0';
        const progress = parseNum(searchEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animego', title, progress, 'anime');
    },
};

export const animeLibDetector: PlatformDetector = {
    platform: 'animelib',
    matches: [/animelib\.org\/anime\/[^/]+\/\d+\/\d+/],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="media-name__main"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const parts = location.pathname.split('/').filter(Boolean);
        const progress = parseNum(parts[parts.length - 1] ?? '0');
        if (!isWatchingAnime() || !title) return null;
        return make('animelib', title, progress, 'anime');
    },
};

export const animeBuffDetector: PlatformDetector = {
    platform: 'animebuff',
    matches: [/animebuff\.ru\/watch\//],
    detect() { return genericDetect('animebuff'); },
};

export const sovetRomanticaDetector: PlatformDetector = {
    platform: 'sovetromantica',
    matches: [/sovetromantica\.com\/anime\/[^/]+\/(episode|film)/],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' — ')[0]);
        const urlEp = location.pathname.match(/(episode|film)_(\d+)/)?.[2] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('sovetromantica', title, progress, 'anime');
    },
};

export const animeVostDetector: PlatformDetector = {
    platform: 'animevost',
    matches: [/animevost\.org\/tip\//],
    detect() { return genericDetect('animevost'); },
};

export const anime365Detector: PlatformDetector = {
    platform: 'anime365',
    matches: [/smotret-anime\.org\/translations\/embed\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="poster__title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' — ')[0]);
        const searchEp = new URL(location.href).searchParams.get('episode') ?? '0';
        const urlEp = location.pathname.match(/\/embed\/(\d+)/)?.[1] ?? '0';
        const progress = parseNum(searchEp) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('anime365', title, progress, 'anime');
    },
};

export const hdRezkaDetector: PlatformDetector = {
    platform: 'hdrezka',
    matches: [/hdrezka\.\w+\/animation\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="b-post__title"], h1');
        const title = cleanTitle(domTitle || metaContent);
        const searchSeason = new URL(location.href).searchParams.get('season') ?? '0';
        const progress = parseNum(searchSeason);
        if (!isWatchingAnime() || !title) return null;
        return make('hdrezka', title, progress, 'anime');
    },
};

// ─── Brazilian/Portuguese sites ───────────────────────────────────────────────

export const hinataSoulDetector: PlatformDetector = {
    platform: 'hinatasoul',
    matches: [/hinatasoul\.com\/assistir\//],
    detect() { return genericDetect('hinatasoul'); },
};

export const animesOnlineDetector: PlatformDetector = {
    platform: 'animesonline',
    matches: [/animesonline\.in\/assistir\//],
    detect() { return genericDetect('animesonline'); },
};

// ─── Global community ─────────────────────────────────────────────────────────

export const otakusTVDetector: PlatformDetector = {
    platform: 'otakustv',
    matches: [/otakustv\.com\/episodio\//],
    detect() { return genericDetect('otakustv'); },
};

export const toonAnimeDetector: PlatformDetector = {
    platform: 'toonanime',
    matches: [/toonanime\.cc\/anime\//],
    detect() { return genericDetect('toonanime'); },
};

export const topAnimesDetector: PlatformDetector = {
    platform: 'topanimes',
    matches: [/topanimes\.net\/episodio\//],
    detect() { return genericDetect('topanimes'); },
};

export const animeHeavenDetector: PlatformDetector = {
    platform: 'animeheaven',
    matches: [/animeheaven\.me\/watch\//],
    detect() { return genericDetect('animeheaven'); },
};

export const animeIdDetector: PlatformDetector = {
    platform: 'animeid',
    matches: [/animeid\.tv\/[^/]+\/\d+/],
    detect() { return genericDetect('animeid'); },
};

export const animeKhorDetector: PlatformDetector = {
    platform: 'animekhor',
    matches: [/animekhor\.org\/watch\//],
    detect() { return genericDetect('animekhor'); },
};

export const animeKODetector: PlatformDetector = {
    platform: 'animeko',
    matches: [/animeko\.co\/anime\//],
    detect() { return genericDetect('animeko'); },
};

export const animelonDetector: PlatformDetector = {
    platform: 'animelon',
    matches: [/animelon\.com\/video\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' ')[0]);
        const searchEp = new URL(location.href).searchParams.get('ep') ?? '0';
        const progress = parseNum(searchEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animelon', title, progress, 'anime');
    },
};

export const animeNoSubDetector: PlatformDetector = {
    platform: 'animenosub',
    matches: [/animenosub\.to\/watch\//],
    detect() { return genericDetect('animenosub'); },
};

export const animeToastDetector: PlatformDetector = {
    platform: 'animetoast',
    matches: [/animetoast\.cc\/anime\//],
    detect() { return genericDetect('animetoast'); },
};

export const animeWhoDetector: PlatformDetector = {
    platform: 'animewho',
    matches: [/animewho\.com\/watch\//],
    detect() { return genericDetect('animewho'); },
};

export const animeXinDetector: PlatformDetector = {
    platform: 'animexin',
    matches: [/animexin\.vip\/anime\//],
    detect() { return genericDetect('animexin'); },
};

export const animeAv1Detector: PlatformDetector = {
    platform: 'animeav1',
    matches: [/animeav1\.com\/watch\//],
    detect() { return genericDetect('animeav1'); },
};

export const aniYanDetector: PlatformDetector = {
    platform: 'aniyan',
    matches: [/aniyan\.net\/episode\//],
    detect() { return genericDetect('aniyan'); },
};

export const aniziumDetector: PlatformDetector = {
    platform: 'anizium',
    matches: [/anizium\.co\/watch\//],
    detect() { return genericDetect('anizium'); },
};

// ─── German sites ─────────────────────────────────────────────────────────────

export const aniWorldDetector: PlatformDetector = {
    platform: 'aniworld',
    matches: [/aniworld\.to\/anime\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="series-title"], h1, [itemprop="name"]');
        const title = cleanTitle(domTitle || metaContent.split(' – ')[0]);
        const urlEp = location.pathname.match(/episode-(\d+)/i)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('aniworld', title, progress, 'anime');
    },
};

export const bsToDetector: PlatformDetector = {
    platform: 'bs_to',
    matches: [/bs\.to\/serie\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('[class*="title"], h1');
        const title = cleanTitle(domTitle || metaContent.split(' – ')[0]);
        const urlEp = location.pathname.match(/\/Episode-(\d+)/i)?.[1] ?? '0';
        const progress = parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('bs_to', title, progress, 'anime');
    },
};

// ─── Miscellaneous ────────────────────────────────────────────────────────────

export const fireAnimeDetector: PlatformDetector = {
    platform: 'fireanime',
    matches: [/fireani\.me\/watch\//],
    detect() { return genericDetect('fireanime'); },
};

export const gojoDetector: PlatformDetector = {
    platform: 'gojo',
    matches: [/animetsu\.net\/watch\//],
    detect() { return genericDetect('gojo'); },
};

export const kaguyaDetector: PlatformDetector = {
    platform: 'kaguya',
    matches: [/kaguya\.app\/anime\/[^/]+\/\d+/],
    detect() { return genericDetect('kaguya'); },
};

export const luciferDonghuaDetector: PlatformDetector = {
    platform: 'luciferdonghua',
    matches: [/luciferdonghua\.in\/[^/]+-episode-/],
    detect() { return genericDetect('luciferdonghua'); },
};

export const moeclipDetector: PlatformDetector = {
    platform: 'moeclip',
    matches: [/moeclip\.com\/anime\//],
    detect() { return genericDetect('moeclip'); },
};

export const adkamiDetector: PlatformDetector = {
    platform: 'adkami',
    matches: [/adkami\.com\/video\//],
    detect() { return genericDetect('adkami'); },
};
