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
        // Only strip suffix after | – — if it looks like a site name / boilerplate
        .replace(/\s*[|]\s*(?:Watch|Read|Free|Online|HD|Sub|Dub|Streaming|Anime|Manga|Episode|Ep).*$/i, '')
        .replace(/\s*[-–—]\s*(?:Watch|Read|Free|Online|HD|Sub|Dub|Streaming|Episode|Ep)\s.*$/i, '')
        // Strip chapter/episode progress labels at end
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
    // 1. Explicit player element already in DOM (most reliable)
    if (document.querySelector(
        'video, iframe[src*="player"], iframe[src*="embed"], ' +
        '#player, .player, #video-player, .video-content, ' +
        '.video-js, .jw-video, [class*="player-container"], [id*="player"]'
    )) return true;

    // 2. URL strongly suggests a watch/episode page (handles SPAs before player loads)
    const url = location.href;
    if (/\/watch\//i.test(url)) return true;
    if (/\/episode\//i.test(url)) return true;
    if (/[?&]ep=\d/i.test(url)) return true;
    if (/-episode-\d/i.test(url)) return true;
    if (/\/ep\//i.test(url)) return true;
    if (/\/stream\//i.test(url)) return true;

    return false;
}
