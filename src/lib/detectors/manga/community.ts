import { type PlatformDetector, cleanTitle, make, parseNum, isReadingManga } from '../helpers';

export const mangaBatDetector: PlatformDetector = {
    platform: 'mangabat',
    matches: [/mangabat\.com\/chapter\//],
    detect() {
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(metaTitle.split('|')[0] || metaTitle.split('-')[0]);
        const progress = parseNum(location.pathname.split('/').pop()?.replace('ep-', '') ?? '0');

        if (!isReadingManga() || !title || progress <= 0) return null;
        return make('mangabat', title, progress, 'manga');
    },
};

export const mangakakalotDetector: PlatformDetector = {
    platform: 'mangakakalot',
    matches: [/mangakakalot\.com\/chapter\//, /chapmanganato\.to\/manga-/],
    detect() {
        // Breadcrumb: Home > Manga Title > Chapter X
        const breadcrumbs = document.querySelectorAll('.breadcrumb p a, .panel-breadcrumb a, .breadcrumb-item a');
        const titleEl = breadcrumbs[breadcrumbs.length - 2] || breadcrumbs[1];
        const chapterEl = breadcrumbs[breadcrumbs.length - 1];

        const title = cleanTitle(titleEl?.textContent?.trim() ?? '');
        const progress = parseNum(chapterEl?.textContent ?? '');

        if (!isReadingManga() || !title) return null;
        return make('mangakakalot', title, progress, 'manga');
    },
};

export const tcbScansDetector: PlatformDetector = {
    platform: 'tcbscans',
    matches: [/tcbscans\.\w+\/chapters\//],
    detect() {
        // TODO: TCB Scans for One Piece etc — verify selectors
        const title = cleanTitle(document.querySelector('h1, .chapter-title')?.textContent?.trim() ?? '');
        const progress = parseNum(location.pathname.match(/chapters\/([\d.]+)/)?.[1] ?? '0');

        if (!isReadingManga() || !title) return null;
        return make('tcbscans', title, progress, 'manga');
    },
};
