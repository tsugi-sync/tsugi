/**
 * Tests for the detector registry — verifies that URL patterns correctly
 * route to the right detector and that the detection logic works end-to-end
 * with mocked DOM environments.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ALL_DETECTORS, detectCurrentPage } from './index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setLocation(url: string) {
    Object.defineProperty(window, 'location', {
        value: new URL(url),
        writable: true,
        configurable: true,
    });
}

function setMeta(property: string, content: string) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

// ─── Registry ─────────────────────────────────────────────────────────────────

describe('ALL_DETECTORS registry', () => {
    it('has at least one detector', () => {
        expect(ALL_DETECTORS.length).toBeGreaterThan(0);
    });

    it('every detector has a platform, matches array, and detect function', () => {
        for (const d of ALL_DETECTORS) {
            expect(d.platform).toBeTruthy();
            expect(Array.isArray(d.matches)).toBe(true);
            expect(d.matches.length).toBeGreaterThan(0);
            expect(typeof d.detect).toBe('function');
        }
    });

    it('routes mangadex.org/chapter/ to the mangadex detector', () => {
        const url = 'https://mangadex.org/chapter/abc-123/1';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('mangadex');
    });

    it('routes webtoons.com viewer to the webtoon detector', () => {
        const url = 'https://www.webtoons.com/en/romance/lore-olympus/ep-1/viewer?title_no=1&episode_no=1';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('webtoon');
    });

    it('routes crunchyroll.com/watch/ to the crunchyroll detector', () => {
        const url = 'https://www.crunchyroll.com/watch/GRDQPM1ZY/episode-1';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('crunchyroll');
    });

    it('routes netflix.com/watch/ to the netflix detector', () => {
        const url = 'https://www.netflix.com/watch/80057281';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('netflix');
    });

    it('routes mangaread.org to the generic_manga detector', () => {
        const url = 'https://www.mangaread.org/manga/one-piece/chapter-1100/';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('generic_manga');
    });

    it('routes weebcentral.com to the generic_manga detector', () => {
        const url = 'https://weebcentral.com/chapters/01J7KQZXYZ/1';
        const matched = ALL_DETECTORS.find(d => d.matches.some(re => re.test(url)));
        expect(matched?.platform).toBe('generic_manga');
    });

    it('returns null for an unrecognised URL', () => {
        setLocation('https://example.com/some-random-page');
        const result = detectCurrentPage();
        expect(result).toBeNull();
    });
});

// ─── Generic Manga Detector ───────────────────────────────────────────────────

describe('genericMangaDetector.detect()', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    it('extracts chapter from URL path segment', () => {
        setLocation('https://www.mangaread.org/manga/one-piece/chapter-1100/');
        setMeta('og:title', 'One Piece | MangaRead');

        // Simulate a manga reader with images
        document.body.innerHTML = `
      <div class="read-container">
        ${Array(10).fill('<img src="page.jpg" />').join('')}
      </div>
    `;

        const detector = ALL_DETECTORS.find(d => d.platform === 'generic_manga')!;
        const result = detector.detect();

        expect(result).not.toBeNull();
        expect(result?.progress).toBe(1100);
        expect(result?.type).toBe('manga');
    });

    it('returns null when no reader container is present', () => {
        setLocation('https://www.mangaread.org/manga/one-piece/');
        setMeta('og:title', 'One Piece | MangaRead');
        document.body.innerHTML = '<div class="listing">No reader here</div>';

        const detector = ALL_DETECTORS.find(d => d.platform === 'generic_manga')!;
        expect(detector.detect()).toBeNull();
    });

    it('returns null when progress is 0', () => {
        setLocation('https://www.mangaread.org/manga/one-piece/');
        setMeta('og:title', 'One Piece | MangaRead');
        document.body.innerHTML = `
      <div class="read-container">
        ${Array(10).fill('<img src="page.jpg" />').join('')}
      </div>
    `;

        const detector = ALL_DETECTORS.find(d => d.platform === 'generic_manga')!;
        expect(detector.detect()).toBeNull();
    });
});
