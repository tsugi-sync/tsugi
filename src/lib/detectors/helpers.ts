import type { DetectedMedia, MediaType, PlatformType } from '@/lib/types';

// ─── Detector Interface ───────────────────────────────────────────────────────

export interface PlatformDetector {
    platform: PlatformType;
    /** URL patterns this detector handles */
    matches: RegExp[];
    detect(): DetectedMedia | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function text(selector: string): string {
    return document.querySelector(selector)?.textContent?.trim() ?? '';
}

export function parseNum(str: string): number {
    return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

export function make(platform: PlatformType, title: string, progress: number, type: MediaType): DetectedMedia {
    return { platform, title, progress, type, url: location.href };
}

export function cleanTitle(title: string): string {
    if (!title) return '';
    return title
        .replace(/\s*[|:-].*$/, '') // Remove site suffixes
        .replace(/\s+(?:Chapter|Ch|Ep|Episode|Vol|Volume)\s*\d+.*$/i, '')
        .replace(/\s+Read\s+Online.*$/i, '')
        .trim();
}

export function isReadingManga(): boolean {
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

export function isWatchingAnime(): boolean {
    const player = document.querySelector('video, iframe, #player, .player, #video-player, .video-content');
    return !!player;
}
