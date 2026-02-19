import { PlatformType } from '../types';
import { PLATFORM_LABELS } from '@/lib/migrations/index';

export const OFFICIAL_ANIME_PLATFORMS = new Set<PlatformType>([
    'crunchyroll',
    'netflix',
    'hidive',
    'hulu',
    'funimation',
    'adn',
    'animeonegai',
    'animeonsen',
    'bstation',
    'proxer',
]);

export const OFFICIAL_MANGA_PLATFORMS = new Set<PlatformType>([
    'mangadex',
    'webtoon',
    'mangaplus',
]);

export function getPlatformLabel(platform: PlatformType): string {
    return PLATFORM_LABELS[platform] || platform;
}

export function isOfficial(platform: PlatformType): boolean {
    return OFFICIAL_ANIME_PLATFORMS.has(platform) || OFFICIAL_MANGA_PLATFORMS.has(platform);
}
