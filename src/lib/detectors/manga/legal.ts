import { type PlatformDetector, cleanTitle, make, parseNum, isReadingManga } from '../helpers';

export const mangaDexDetector: PlatformDetector = {
    platform: 'mangadex',
    matches: [/mangadex\.org\/chapter\//],
    detect() {
        const titleEl = document.querySelector('a[href*="/title/"]');
        const chapterEl = document.querySelector('.chakra-breadcrumb__list-item:last-child span');

        const title = cleanTitle(titleEl?.textContent?.trim() ?? '');
        const progress = parseNum(chapterEl?.textContent ?? '');

        if (!isReadingManga() || !title) return null;
        return make('mangadex', title, progress, 'manga');
    },
};

export const webtoonDetector: PlatformDetector = {
    platform: 'webtoon',
    matches: [/webtoons\.com\/.+\/viewer/],
    detect() {
        const title = cleanTitle(document.querySelector('.subj_series a, .tit')?.textContent?.trim() ?? '');
        const progressText = document.querySelector('.sub_title span')?.textContent ?? '';
        const progress = parseNum(progressText);

        if (!isReadingManga() || !title) return null;
        return make('webtoon', title, progress, 'manhwa');
    },
};

export const mangaplusDetector: PlatformDetector = {
    platform: 'mangaplus',
    matches: [/mangaplus\.shueisha\.co\.jp\/viewer\//],
    detect() {
        const rawTitle = document.title.replace(' - MANGA Plus', '').trim();
        const epMatch = rawTitle.match(/#([\d.]+)/);
        const progress = epMatch ? parseFloat(epMatch[1]) : 0;
        const title = cleanTitle(rawTitle);

        if (!isReadingManga() || !title) return null;
        return make('mangaplus', title, progress, 'manga');
    },
};
