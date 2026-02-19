import { describe, it, expect } from 'vitest';
import { isOfficial, getPlatformLabel } from './platforms';

describe('getPlatformLabel', () => {
    it('returns label for known platform', () => {
        expect(getPlatformLabel('mangasee123')).toBe('MangaSee');
        expect(getPlatformLabel('crunchyroll')).toBe('Crunchyroll');
    });

    it('returns platform key for unknown platform (fallback)', () => {
        const fakePlatform = 'fake-platform-123' as any;
        expect(getPlatformLabel(fakePlatform)).toBe(fakePlatform);
    });
});

describe('isOfficial', () => {
    it('identifies official anime platforms', () => {
        expect(isOfficial('crunchyroll')).toBe(true);
        expect(isOfficial('netflix')).toBe(true);
        expect(isOfficial('hidive')).toBe(true);
        expect(isOfficial('funimation')).toBe(true);
    });

    it('identifies official manga platforms', () => {
        expect(isOfficial('mangadex')).toBe(true);
        expect(isOfficial('webtoon')).toBe(true);
        expect(isOfficial('mangaplus')).toBe(true);
    });

    it('identifies community platforms as non-official', () => {
        expect(isOfficial('hianime')).toBe(false);
        expect(isOfficial('zoro')).toBe(false);
        expect(isOfficial('mangabat')).toBe(false);
        expect(isOfficial('mangasee123')).toBe(false as any); // Type assertion if not in enum, but it is
    });
});
