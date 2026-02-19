import { describe, it, expect } from 'vitest';
import { PLATFORM_LABELS, ANIME_PLATFORMS, MANGA_PLATFORMS } from './index';
import type { PlatformType } from '../types';

describe('Platform Configuration', () => {
    it('has labels for all defined platforms', () => {
        // This test ensures we don't forget to add a label when adding a new platform
        const platformKeys = Object.keys(PLATFORM_LABELS) as PlatformType[];
        expect(platformKeys.length).toBeGreaterThan(80); // We know we have 80+ platforms now

        // Check specific known keys exist
        expect(PLATFORM_LABELS.mangasee123).toBe('MangaSee');
        expect(PLATFORM_LABELS.generic_anime).toBe('Anime Site');
    });

    it('categorizes generic_anime correctly', () => {
        expect(ANIME_PLATFORMS).toContain('generic_anime');
        expect(MANGA_PLATFORMS).not.toContain('generic_anime');
    });

    it('categorizes generic_manga correctly', () => {
        expect(MANGA_PLATFORMS).toContain('generic_manga');
        expect(ANIME_PLATFORMS).not.toContain('generic_manga');
    });

    it('ensures no overlap between anime and manga lists (except generics if intended)', () => {
        // Check for accidental duplicates
        const animeSet = new Set(ANIME_PLATFORMS);
        const mangaSet = new Set(MANGA_PLATFORMS);

        // Find intersection
        const intersection = [...animeSet].filter(x => mangaSet.has(x));

        // Currently only 'unknown' might overlap if it was in both, but usually disjoint
        expect(intersection).toEqual([]);
    });

    it('ensures all platforms are categorized', () => {
        const allCategorized = new Set([...ANIME_PLATFORMS, ...MANGA_PLATFORMS, 'unknown']);
        const allLabels = Object.keys(PLATFORM_LABELS);

        const uncategorized = allLabels.filter(k => !allCategorized.has(k as PlatformType));
        expect(uncategorized).toEqual([]);
    });
});
