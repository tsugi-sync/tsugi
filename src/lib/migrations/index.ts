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
  // Legal Anime
  crunchyroll: 'Crunchyroll',
  netflix: 'Netflix',
  funimation: 'Funimation',
  hidive: 'HIDIVE',
  hulu: 'Hulu',
  adn: 'ADN',
  animeonegai: 'AnimeOnegai',
  animeonsen: 'AnimeOnsen',
  bstation: 'BStation',
  proxer: 'Proxer',

  // Community Anime (Global)
  zoro: 'Zoro.to',
  hianime: 'HiAnime',
  '9anime': '9anime',
  gogoanime: 'Gogoanime',
  animesuge: 'Animesuge',
  kickassanime: 'KickAssAnime',
  animekai: 'AnimeKAI',
  anicrush: 'AniCrush',
  an1me: 'An1me',
  anigo: 'AniGo',
  aninexus: 'AniNexus',
  anixl: 'AniXL',
  kuudere: 'Kuudere',
  miruro: 'Miruro',
  anidream: 'AniDream',
  anoboye: 'AnoBoye',
  animeheaven: 'AnimeHeaven',
  animeid: 'AnimeID',
  animekhor: 'AnimeKhor',
  animeko: 'AnimeKO',
  animenosub: 'AnimeNoSub',
  animetoast: 'AnimeToast',
  animewho: 'AnimeWho',
  animexin: 'AnimeXin',
  animeav1: 'AnimeAv1',
  aniyan: 'AniYan',
  anizium: 'AniZium',
  fireanime: 'FireAnime',
  gojo: 'Gojo',
  kaguya: 'Kaguya',
  luciferdonghua: 'LuciferDonghua',
  moeclip: 'MoeClip',
  adkami: 'ADKami',
  monoschinos: 'MonosChinos',
  toonanime: 'ToonAnime',
  topanimes: 'TopAnimes',

  // Community Anime (Regional)
  animeflv: 'AnimeFLV',
  jkanime: 'JKAnime',
  tioanime: 'TioAnime',
  latanime: 'Latanime',
  animesonline: 'AnimesOnline',
  otakustv: 'OtakusTV',
  animesama: 'AnimeSama',
  franime: 'FRAnime',
  french_anime: 'FrenchAnime',
  voiranime: 'VoirAnime',
  otakufr: 'OtakuFR',
  animeodcinki: 'AnimeOdcinki',
  frixysubs: 'FrixySubs',
  fumetsu: 'Fumetsu',
  docchi: 'Docchi',
  ogladajanime: 'OgladajAnime',
  animezone: 'AnimeZone',
  desuonline: 'DesuOnline',
  shinden: 'Shinden',
  turkanime: 'TurkAnime',
  tranimeizle: 'TRAnimeizle',
  anizm: 'Anizm',
  witanime: 'WitAnime',
  okanime: 'OkAnime',
  animego: 'AnimeGO',
  animelib: 'AnimeLib',
  animebuff: 'AnimeBuff',
  sovetromantica: 'SovetRomantica',
  animevost: 'AnimeVost',
  anime365: 'Anime365',
  hdrezka: 'HdRezka',
  betteranime: 'BetterAnime',
  animefire: 'AnimeFire',
  hinatasoul: 'HinataSoul',
  animeworld: 'AnimeWorld',
  animeunity: 'AnimeUnity',
  aniworld: 'AniWorld',
  bs_to: 'Bs.to',
  animelon: 'Animelon',

  // Manga
  mangadex: 'MangaDex',
  webtoon: 'Webtoon',
  mangaplus: 'MangaPlus',
  mangabat: 'MangaBat',
  mangakakalot: 'Mangakakalot',
  tcbscans: 'TCB Scans',
  mangasee123: 'MangaSee',
  bato: 'Bato.to',
  asuracomic: 'Asura',
  flamecomics: 'Flame',
  mangafire: 'MangaFire',
  mangapark: 'MangaPark',
  mangabuddy: 'MangaBuddy',
  cubari: 'Cubari',
  toonily: 'Toonily',
  weebcentral: 'WeebCentral',
  mangago: 'MangaGo',
  mangaread: 'MangaRead',
  readm: 'ReadM',
  guya: 'Guya.moe',

  // Generic
  generic_manga: 'Manga Site',
  generic_anime: 'Anime Site',
  unknown: 'Unknown',
};

export const ANIME_PLATFORMS: PlatformType[] = Object.keys(PLATFORM_LABELS).filter(k =>
  !['mangadex', 'webtoon', 'mangaplus', 'mangabat', 'mangakakalot', 'tcbscans', 'mangasee123', 'bato', 'asuracomic', 'flamecomics', 'mangafire', 'mangapark', 'mangabuddy', 'cubari', 'toonily', 'weebcentral', 'mangago', 'mangaread', 'readm', 'guya', 'generic_manga', 'unknown'].includes(k)
) as PlatformType[];

export const MANGA_PLATFORMS: PlatformType[] = [
  'mangadex', 'webtoon', 'mangaplus', 'mangabat', 'mangakakalot', 'tcbscans', 'mangasee123', 'bato', 'asuracomic', 'flamecomics', 'mangafire', 'mangapark', 'mangabuddy', 'cubari', 'toonily', 'weebcentral', 'mangago', 'mangaread', 'readm', 'guya', 'generic_manga'
];
