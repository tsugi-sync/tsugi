import { describe, it, expect } from 'vitest';
import { slugify, makePlatformKey } from './storage';

describe('slugify', () => {
    it('lowercases the title', () => {
        expect(slugify('One Piece')).toBe('one-piece');
    });

    it('replaces spaces with hyphens', () => {
        expect(slugify('Attack on Titan')).toBe('attack-on-titan');
    });

    it('removes special characters', () => {
        expect(slugify("Berserk! (2016)")).toBe('berserk-2016');
    });

    it('collapses multiple hyphens', () => {
        expect(slugify('One  --  Piece')).toBe('one-piece');
    });

    it('trims leading and trailing hyphens', () => {
        expect(slugify('  Naruto  ')).toBe('naruto');
    });

    it('handles titles with numbers', () => {
        expect(slugify('20th Century Boys')).toBe('20th-century-boys');
    });

    it('handles already-slugified strings', () => {
        expect(slugify('one-piece')).toBe('one-piece');
    });
});

describe('makePlatformKey', () => {
    it('combines platform and slugified title', () => {
        expect(makePlatformKey('mangadex', 'One Piece')).toBe('mangadex:one-piece');
    });

    it('is consistent regardless of title casing', () => {
        const a = makePlatformKey('generic_manga', 'Berserk');
        const b = makePlatformKey('generic_manga', 'BERSERK');
        expect(a).toBe(b);
    });

    it('handles special characters in title', () => {
        expect(makePlatformKey('mangabat', 'Re:Zero')).toBe('mangabat:rezero');
    });
});
