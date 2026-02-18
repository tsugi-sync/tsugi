import { describe, it, expect } from 'vitest';
import { cleanTitle, parseNum } from './helpers';

describe('cleanTitle', () => {
    it('removes site suffixes after pipe', () => {
        expect(cleanTitle('One Piece | MangaDex')).toBe('One Piece');
    });

    it('removes site suffixes after colon', () => {
        expect(cleanTitle('Bleach: Thousand Year Blood War')).toBe('Bleach');
    });

    it('removes chapter info from title', () => {
        expect(cleanTitle('Naruto Chapter 700')).toBe('Naruto');
    });

    it('removes episode info from title', () => {
        expect(cleanTitle('Attack on Titan Episode 87')).toBe('Attack on Titan');
    });

    it('removes "Read Online" suffix', () => {
        expect(cleanTitle('Berserk Read Online')).toBe('Berserk');
    });

    it('returns empty string for empty input', () => {
        expect(cleanTitle('')).toBe('');
    });

    it('trims whitespace', () => {
        expect(cleanTitle('  Dragon Ball  ')).toBe('Dragon Ball');
    });

    it('preserves normal titles', () => {
        expect(cleanTitle('20th Century Boys')).toBe('20th Century Boys');
    });
});

describe('parseNum', () => {
    it('parses integer strings', () => {
        expect(parseNum('42')).toBe(42);
    });

    it('parses float strings', () => {
        expect(parseNum('10.5')).toBe(10.5);
    });

    it('strips non-numeric characters', () => {
        expect(parseNum('Chapter 7')).toBe(7);
        expect(parseNum('EP 12')).toBe(12);
    });

    it('returns 0 for empty or non-numeric', () => {
        expect(parseNum('')).toBe(0);
        expect(parseNum('abc')).toBe(0);
    });
});
