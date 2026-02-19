import { type PlatformDetector, cleanTitle, make, parseNum, text, isWatchingAnime } from '../helpers';

/**
 * Crunchyroll
 * URL pattern: /watch/<id>/episode-title
 */
export const crunchyrollDetector: PlatformDetector = {
    platform: 'crunchyroll',
    matches: [/crunchyroll\.com\/watch\//],
    detect() {
        const title = cleanTitle(text('[data-testid="series-title"], [class*="series-title"]'));
        const epText = text('[data-testid="episode-number"], [class*="episode-number"]');
        const progress = parseNum(epText);
        if (!isWatchingAnime() || !title) return null;
        return make('crunchyroll', title, progress, 'anime');
    },
};

/**
 * Netflix
 * URL pattern: /watch/<id>
 */
export const netflixDetector: PlatformDetector = {
    platform: 'netflix',
    matches: [/netflix\.com\/watch\//],
    detect() {
        const playerControls = document.querySelector('.watch-video--player-view, .player-controls-wrapper');
        const ariaLabel = playerControls?.querySelector('[aria-label*=":"]')?.getAttribute('aria-label');
        const rawTitle = document.title.replace(' | Netflix', '').trim();
        let title = rawTitle;
        let progress = 0;
        const metadataText = ariaLabel ?? rawTitle;
        const match = metadataText.match(/(.+?):\s*Season\s*\d+:\s*Episode\s*(\d+)/i)
            || metadataText.match(/(.+?):\s*Episode\s*(\d+)/i);
        if (match) {
            title = match[1].trim();
            progress = parseNum(match[2]);
        }
        title = cleanTitle(title);
        if (!isWatchingAnime() || !title) return null;
        return make('netflix', title, progress, 'anime');
    },
};

/**
 * HIDIVE — Legal streaming
 * URL pattern: /stream/<series>/<episode>
 */
export const hidiveDetector: PlatformDetector = {
    platform: 'hidive',
    matches: [/hidive\.com\/stream\//],
    detect() {
        const domTitle = text('[class*="VideoTitle"], [class*="series-title"], h1');
        const metaTitle = document.title.split(' | ')[0];
        const title = cleanTitle(domTitle || metaTitle);
        const epText = text('[class*="EpisodeNumber"], [class*="episode-number"]');
        const urlEp = location.pathname.match(/\/s\d+e(\d+)/i)?.[1] ?? '0';
        const progress = parseNum(epText) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('hidive', title, progress, 'anime');
    },
};

/**
 * Hulu — US legal streaming
 * URL pattern: /watch/<id>
 */
export const huluDetector: PlatformDetector = {
    platform: 'hulu',
    matches: [/hulu\.com\/watch\//],
    detect() {
        const domTitle = text('[class*="MetaData__title"], [class*="series-name"], h1');
        const metaTitle = document.title.split(' | ')[0];
        const title = cleanTitle(domTitle || metaTitle);
        const epText = text('[class*="episode-number"], [class*="EpisodeNumber"]');
        const progress = parseNum(epText);
        if (!isWatchingAnime() || !title) return null;
        return make('hulu', title, progress, 'anime');
    },
};

/**
 * ADN — Animation Digital Network (French official)
 * URL pattern: /video/<series>/<episode>
 */
export const adnDetector: PlatformDetector = {
    platform: 'adn',
    matches: [/animationdigitalnetwork\.com\/video\//],
    detect() {
        const domTitle = text('[class*="videoPlayerTitle"], [class*="serie-title"], h1');
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const epText = text('[class*="episodeNumber"], [class*="episode-number"]');
        const urlEp = location.pathname.match(/\/(?:ep|episode)[_-]?(\d+)/i)?.[1] ?? '0';
        const progress = parseNum(epText) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('adn', title, progress, 'anime');
    },
};

/**
 * AnimeOnegai — Legal LATAM/global streaming
 * URL pattern: /watch/<series>/<episode>
 */
export const animeOnegaiDetector: PlatformDetector = {
    platform: 'animeonegai',
    matches: [/animeonegai\.com\/watch\//],
    detect() {
        const domTitle = text('[class*="series-title"], [class*="SeriesTitle"], h1');
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const urlEp = location.pathname.match(/\/(?:ep|episode)[_-]?(\d+)/i)?.[1] ?? '0';
        const searchEp = new URL(location.href).searchParams.get('ep') ?? '0';
        const progress = parseNum(urlEp) || parseNum(searchEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animeonegai', title, progress, 'anime');
    },
};

/**
 * AnimeOnsen — Official subtitles, global
 * URL pattern: /watch/<series>
 */
export const animeOnsenDetector: PlatformDetector = {
    platform: 'animeonsen',
    matches: [/animeonsen\.xyz\/watch\//],
    detect() {
        const domTitle = text('[class*="series-title"], [class*="anime-title"], h1');
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const epText = text('[class*="episode-number"], [class*="current-episode"]');
        const searchEp = new URL(location.href).searchParams.get('episode') ?? '0';
        const progress = parseNum(epText) || parseNum(searchEp);
        if (!isWatchingAnime() || !title) return null;
        return make('animeonsen', title, progress, 'anime');
    },
};

/**
 * BStation / Bilibili TV — Official global anime
 * URL pattern: /play/<season_id>/<episode_id>
 */
export const bstationDetector: PlatformDetector = {
    platform: 'bstation',
    matches: [/bilibili\.tv\/(?:en\/)?play\//],
    detect() {
        const domTitle = text('[class*="player-title"], [class*="season-title"], h1');
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const epText = text('[class*="episode-number"], [class*="ep-num"]');
        const urlEp = location.pathname.match(/\/play\/\d+\/(\d+)/)?.[1] ?? '0';
        const progress = parseNum(epText) || parseNum(urlEp);
        if (!isWatchingAnime() || !title) return null;
        return make('bstation', title, progress, 'anime');
    },
};

/**
 * Proxer.me — German anime platform
 * URL pattern: /watch/<id>/<episode>/<type>
 */
export const proxerDetector: PlatformDetector = {
    platform: 'proxer',
    matches: [/proxer\.me\/watch\//],
    detect() {
        const metaContent = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const domTitle = text('#anime-title, .anime-title, h1');
        const title = cleanTitle(domTitle || metaContent.split(' - ')[0]);
        const progress = parseNum(location.pathname.split('/')[3] ?? '0');
        if (!isWatchingAnime() || !title) return null;
        return make('proxer', title, progress, 'anime');
    },
};
