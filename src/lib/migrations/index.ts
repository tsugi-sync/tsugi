/**
 * Platform Migration
 *
 * Handles the case where a user switches from one platform to another
 * (e.g., Netflix drops the show → move to Zoro).
 *
 * The old entry is archived (migrationStatus: 'archived') and a new
 * entry is created with the same trackerIds and progress carried over.
 */

import type { TrackedItem, MigratePlatformPayload, PlatformType } from '../types';
import { getAllTrackedItems, saveTrackedItem, slugify } from '@/lib/utils/storage';

export async function migratePlatform(payload: MigratePlatformPayload): Promise<TrackedItem> {
  const all = await getAllTrackedItems();
  const fromItem = all[payload.fromPlatformKey];

  if (!fromItem) throw new Error(`Source entry not found: ${payload.fromPlatformKey}`);
  if (fromItem.migrationStatus === 'archived') {
    throw new Error('This entry is already archived/migrated');
  }

  const now = Date.now();
  const toPlatformKey = `${payload.toPlatform}:${slugify(payload.toPlatformTitle)}`;

  const migrationRecord = {
    fromPlatformKey: payload.fromPlatformKey,
    toPlatformKey,
    migratedAt: now,
    progressAtMigration: fromItem.lastProgress,
    reason: payload.reason,
  };

  // Archive the old entry
  const archivedItem: TrackedItem = {
    ...fromItem,
    migrationStatus: 'archived',
    migratedTo: migrationRecord,
    updatedAt: now,
  };
  await saveTrackedItem(archivedItem);

  // Create new entry carrying over progress and tracker links
  const newItem: TrackedItem = {
    platformKey: toPlatformKey,
    platform: payload.toPlatform,
    platformTitle: payload.toPlatformTitle,
    type: fromItem.type,
    // Carry over all tracker IDs — user keeps their MAL/AniList links
    trackerIds: { ...fromItem.trackerIds },
    lastProgress: fromItem.lastProgress,
    status: fromItem.status,
    migrationStatus: 'active',
    migratedFrom: migrationRecord,
    createdAt: now,
    updatedAt: now,
  };
  await saveTrackedItem(newItem);

  return newItem;
}

/** Returns all archived items (useful for showing migration history) */
export async function getArchivedItems(): Promise<TrackedItem[]> {
  const all = await getAllTrackedItems();
  return Object.values(all).filter(item => item.migrationStatus === 'archived');
}

/** Returns all active items (default view) */
export async function getActiveItems(): Promise<TrackedItem[]> {
  const all = await getAllTrackedItems();
  return Object.values(all).filter(item => item.migrationStatus === 'active');
}

/** Display label for a platform */
export const PLATFORM_LABELS: Record<PlatformType, string> = {
  crunchyroll: 'Crunchyroll',
  netflix: 'Netflix',
  funimation: 'Funimation',
  hidive: 'HIDIVE',
  zoro: 'Zoro.to / Aniwatch',
  '9anime': '9anime',
  gogoanime: 'Gogoanime',
  animesuge: 'Animesuge',
  mangadex: 'MangaDex',
  webtoon: 'Webtoon',
  mangaplus: 'MangaPlus',
  mangabat: 'MangaBat',
  mangakakalot: 'Mangakakalot',
  tcbscans: 'TCB Scans',
  generic_manga: 'Community Manga',
  generic_anime: 'Community Anime',
  unknown: 'Unknown',
};

export const ANIME_PLATFORMS: PlatformType[] = [
  'crunchyroll', 'netflix', 'funimation', 'hidive',
  'zoro', '9anime', 'gogoanime', 'animesuge',
];

export const MANGA_PLATFORMS: PlatformType[] = [
  'mangadex', 'webtoon', 'mangaplus',
  'mangabat', 'mangakakalot', 'tcbscans', 'generic_manga',
];
