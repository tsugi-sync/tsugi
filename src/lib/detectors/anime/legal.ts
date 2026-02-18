import { type PlatformDetector, cleanTitle, make, parseNum, text, isWatchingAnime } from '../helpers';

export const crunchyrollDetector: PlatformDetector = {
    platform: 'crunchyroll',
    matches: [/crunchyroll\.com\/watch\//],
    detect() {
        // TODO: Crunchyroll SPA — these selectors change often
        const title = cleanTitle(text('[data-testid="series-title"], [class*="series-title"]'));
        const epText = text('[data-testid="episode-number"], [class*="episode-number"]');
        const progress = parseNum(epText);

        if (!isWatchingAnime() || !title) return null;
        return make('crunchyroll', title, progress, 'anime');
    },
};

export const netflixDetector: PlatformDetector = {
    platform: 'netflix',
    matches: [/netflix\.com\/watch\//],
    detect() {
        // 1. Try to get title from the video control bar / ARIA label
        const playerControls = document.querySelector('.watch-video--player-view, .player-controls-wrapper');
        const ariaLabel = playerControls?.querySelector('[aria-label*=":"]')?.getAttribute('aria-label');

        // 2. Fallback to page title
        const rawTitle = document.title.replace(' | Netflix', '').trim();

        // 3. Try to parse episode and series name
        let title = rawTitle;
        let progress = 0;

        const metadataText = ariaLabel || rawTitle;
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
