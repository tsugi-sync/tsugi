import type { DetectedMedia, MediaType, PlatformType } from '@/lib/types';

// ─── Detector Interface ───────────────────────────────────────────────────────

export interface PlatformDetector {
  platform: PlatformType;
  /** URL patterns this detector handles */
  matches: RegExp[];
  detect(): DetectedMedia | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function text(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? '';
}

function parseNum(str: string): number {
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

function make(platform: PlatformType, title: string, progress: number, type: MediaType): DetectedMedia {
  return { platform, title, progress, type, url: location.href };
}

function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[|:-].*$/, '') // Remove site suffixes
    .replace(/\s+(?:Chapter|Ch|Ep|Episode|Vol|Volume)\s*\d+.*$/i, '')
    .replace(/\s+Read\s+Online.*$/i, '')
    .trim();
}

function isReadingManga(): boolean {
  // Check for common reader containers or high image count
  const reader = document.querySelector('#reader, .reader, #chapter-images, .images-container, .viewer, .read-container, #v-reader');
  if (reader) return true;

  // Minimal image count check (usually > 3 for a chapter)
  const images = document.querySelectorAll('main img, #reader img, .chapter-content img, .read-content img');
  if (images.length > 3) return true;

  // WeebCentral specific: reader has many images inside main or a specific ID
  if (location.hostname.includes('weebcentral') && location.pathname.includes('/chapters/')) {
    return document.querySelectorAll('img').length > 5;
  }

  return false;
}

function isWatchingAnime(): boolean {
  const player = document.querySelector('video, iframe, #player, .player, #video-player, .video-content');
  return !!player;
}

// ════════════════════════════════════════════════════════════════════════════════
// ANIME — PIRACY
// ════════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════════
// ANIME — LEGAL
// ════════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════════
// MANGA — PIRACY
// ════════════════════════════════════════════════════════════════════════════════

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
    const title = cleanTitle(text('h1, .chapter-title'));
    const progress = parseNum(location.pathname.match(/chapters\/([\d.]+)/)?.[1] ?? '0');

    if (!isReadingManga() || !title) return null;
    return make('tcbscans', title, progress, 'manga');
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// MANGA — LEGAL
// ════════════════════════════════════════════════════════════════════════════════

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
    const title = cleanTitle(text('.subj_series a, .tit'));
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

// ════════════════════════════════════════════════════════════════════════════════
// GENERIC / MULTI-SITE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generic Manga Detector for various engines (Madara, MangaStream, etc.)
 * Handles sites like: MangaSee, Bato.to, Asura, Flame, etc.
 */
export const genericMangaDetector: PlatformDetector = {
  platform: 'generic_manga',
  matches: [
    /mangasee123\.com\/read-online\//,
    /mangalife\.us\/read-online\//,
    /bato\.to\/chapter\//,
    /asuracomic\.net\/series\/.+\/chapter\//,
    /flamecomics\.(com|xyz)\/.+-chapter-/,
    /readm\.org\/manga\/.+\/.+\//,
    /mangabuddy\.com\/.+\/chapter-/,
    /copymanga\.site\/h5\/details\/manga\//,
    /2026copy\.com/,
    /guya\.moe\/read\/manga\//,
    /dynastyscans\.com\/chapters\//,
    /mangapark\.net\/title\/.+\/.+/,
    // Aidoku Sources - English & Global
    /promanga\.net/, /silentquill\.net/, /batcave\.biz/, /comix\.to/, /hivetoons\.org/,
    /manga\.madokami\.al/, /magustoon\.org/, /mangabats\.com/, /mangadistrict\.com/, /mangago\.me/,
    /mangakakalot\.gg/, /manganato\.gg/, /nelomanga\.net/, /mangaread\.org/, /mangasect\.net/,
    /mangatx\.cc/, /manhuagold\.top/, /manhuaplus\.org/, /manhwax\.top/, /novelbuddy\.com/,
    /nyxscans\.com/, /qiscans\.org/, /readcomiconline\.li/, /rizzfables\.com/, /tcbonepiecechapters\.com/,
    /toonily\.(com|me)/, /vortexscans\.org/, /webtoon\.xyz/, /weebcentral\.com/, /mangafire\.to/,
    /nhentai\.net/, /cubari\.moe/, /xbat\.si/,
    // Aidoku Sources - Regional (ID, FR, ES, RU, JA)
    /kanzenin\.info/, /komiksin\.net/, /komiktap\.info/, /komiku\.asia/, /mangasusuku\.com/,
    /manhwalist02\.site/, /natsu\.tv/, /bigsolo\.org/, /sushiscan\.net/, /catharsisworld\.dig-it\.info/,
    /eternalmangas\.org/, /flowermanga\.net/, /mangalivre\.tv/, /hentailib\.me/, /mangalib\.me/,
    /ranobelib\.me/, /slashlib\.me/, /mangaworld\.(mx|net)/, /comic-action\.com/, /comic-days\.com/,
    /manga\.io\.vn/, /manga1000\.top/, /mangamura\.net/, /manga\.nicovideo\.jp/, /raw1001\.net/,
    /rawfree\.at/, /rawkuma\.net/, /rawkuro\.net/, /rawotaku\.com/, /shonenjumpplus\.com/,
    // Aidoku Sources - China & Vietnam
    /go-manga\.com/, /pretty-frank\.com/, /up-manga\.com/, /cmangax12\.com/, /cuutruyen\.net/,
    /dilib\.vn/, /foxtruyen2\.com/, /nettruyenviet1\.com/, /manhua3q\.com/, /truyenqq(no|\.online)/,
    /zettruyen\.space/, /baozimh\.com/, /bilimanga\.net/, /boylove\.cc/, /2026copy\.com/,
    /godamh\.com/, /happymh\.com/, /mangabz\.com/, /manhuagui\.com/, /mycomic\.com/,
    /manhuabika\.com/, /manga2026\.com/, /wnacg\.com/, /zaimanhua\.com/, /weebcentral\.com/,
  ],
  detect() {
    // 1. Breadcrumb priority for series title (usually "Series > Chapter")
    const breadcrumbTitle = document.querySelector('.breadcrumb a:nth-last-child(2), .panel-breadcrumb a:nth-last-child(2), .breadcrumb-item:nth-last-child(2) a')?.textContent?.trim();
    const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';

    // 2. Try to find chapter/progress — PRIORITIZE URL
    const segments = location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    let progressMatch = location.pathname.match(/\/view\/[^\/]+\/([\d.]+)/i)
      || location.pathname.match(/chapter-([\d.]+)/i)
      || location.href.match(/chapter\/([\d.]+)/i)
      || (lastSegment && /^\d+$/.test(lastSegment) ? [null, lastSegment] : null);

    // Fallback to DOM parsing with MUCH broader selectors
    let rawText = '';
    if (!progressMatch) {
      const searchSelectors = [
        '.current-chapter', '.chapter-info', 'button.active', '.navbar .active',
        '.chapter-selector', '.dropdown-toggle', 'h1', 'title', 'h2'
      ];
      for (const sel of searchSelectors) {
        const el = document.querySelector(sel);
        const m = el?.textContent?.match(/Chapter\s*([\d.]+)/i);
        if (m) {
          progressMatch = m;
          rawText = el!.textContent!;
          break;
        }
      }
    }

    // If still nothing, just grab anything that says "Chapter"
    if (!progressMatch) {
      const anyChapter = Array.from(document.querySelectorAll('button, span, a, p, div')).find(el => el.textContent?.match(/Chapter\s*\d+/i));
      if (anyChapter) {
        progressMatch = anyChapter.textContent!.match(/Chapter\s*([\d.]+)/i);
        rawText = anyChapter.textContent!;
      }
    }

    let progress = 0;
    if (progressMatch) {
      progress = parseFloat(progressMatch[1] || progressMatch[0] || '0');
    } else {
      progress = parseNum(rawText);
    }

    // 3. Clean title
    // PREFER breadcrumbTitle if it exists and doesn't look like a chapter
    let title = '';
    if (breadcrumbTitle && !breadcrumbTitle.match(/Chapter\s*\d+/i)) {
      title = breadcrumbTitle;
    } else {
      title = document.querySelector('.series-title, .manga-title, .title, #series-title')?.textContent?.trim()
        || metaTitle.split(' - ')[0].split(' | ')[0].trim();
    }

    title = cleanTitle(title);

    // --- Reader Check & Validation ---
    if (!isReadingManga() || progress <= 0 || !title) return null;

    const lowercaseTitle = title.toLowerCase();
    const junk = ['chapter 1', 'home', 'manga', 'manhua', 'manhwa', 'weeb central', 'community manga'];
    if (junk.includes(lowercaseTitle) || lowercaseTitle.length < 2) return null;

    console.log(`[Tsugi] Generic Manga Detection: Title="${title}", Progress=${progress}`);
    return make('generic_manga', title, progress, 'manga');
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// GENERIC ANIME
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Fallback for sites that look like anime players
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

// ════════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

export const ALL_DETECTORS: PlatformDetector[] = [
  // Piracy anime
  zoroDetector,
  nineAnimeDetector,
  gogoanimeDetector,
  animesugeDetector,
  genericAnimeDetector,
  // Legal anime
  crunchyrollDetector,
  netflixDetector,
  // Piracy manga
  mangaBatDetector,
  mangakakalotDetector,
  tcbScansDetector,
  genericMangaDetector,
  // Legal manga
  mangaDexDetector,
  webtoonDetector,
  mangaplusDetector,
];

export function detectCurrentPage(): DetectedMedia | null {
  const url = location.href;
  for (const detector of ALL_DETECTORS) {
    if (detector.matches.some(re => re.test(url))) {
      try {
        return detector.detect();
      } catch (err) {
        console.warn(`[Tsugi] Detector "${detector.platform}" threw: `, err);
        return null;
      }
    }
  }
  return null;
}
