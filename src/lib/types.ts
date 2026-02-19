// ─── Tracker Platforms ────────────────────────────────────────────────────────

export type TrackerType = 'mal' | 'anilist' | 'shikimori' | 'bangumi';

export type MediaType = 'anime' | 'manga' | 'manhwa' | 'manhua' | 'novel';

export type MediaStatus =
  | 'watching'
  | 'reading'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_watch'
  | 'plan_to_read';

export type ConfirmationMode = 'ask' | 'quick' | 'auto';

// ─── Source Platforms ─────────────────────────────────────────────────────────

export type PlatformType =
  // ── Legal anime ───────────────────────────────────────────────────────────
  | 'crunchyroll'
  | 'netflix'
  | 'hidive'
  | 'hulu'
  | 'funimation'
  | 'adn'
  | 'animeonegai'
  | 'animeonsen'
  | 'bstation'
  | 'proxer'
  // ── Community anime (global) ───────────────────────────────────────────────
  | 'zoro'
  | 'hianime'
  | '9anime'
  | 'gogoanime'
  | 'animesuge'
  | 'kickassanime'
  | 'animekai'
  | 'anicrush'
  | 'an1me'
  | 'anigo'
  | 'aninexus'
  | 'anixl'
  | 'kuudere'
  | 'miruro'
  | 'anidream'
  | 'anoboye'
  | 'animeheaven'
  | 'animeid'
  | 'animekhor'
  | 'animeko'
  | 'animenosub'
  | 'animetoast'
  | 'animewho'
  | 'animexin'
  | 'animeav1'
  | 'aniyan'
  | 'anizium'
  | 'fireanime'
  | 'gojo'
  | 'kaguya'
  | 'luciferdonghua'
  | 'moeclip'
  | 'adkami'
  | 'monoschinos'
  | 'toonanime'
  | 'topanimes'
  // ── Community anime (ES/LATAM) ─────────────────────────────────────────────
  | 'animeflv'
  | 'jkanime'
  | 'tioanime'
  | 'latanime'
  | 'animesonline'
  | 'otakustv'
  // ── Community anime (FR) ──────────────────────────────────────────────────
  | 'animesama'
  | 'franime'
  | 'french_anime'
  | 'voiranime'
  | 'otakufr'
  // ── Community anime (PL) ──────────────────────────────────────────────────
  | 'animeodcinki'
  | 'frixysubs'
  | 'fumetsu'
  | 'docchi'
  | 'ogladajanime'
  | 'animezone'
  | 'desuonline'
  | 'shinden'
  // ── Community anime (TR) ──────────────────────────────────────────────────
  | 'turkanime'
  | 'tranimeizle'
  | 'anizm'
  // ── Community anime (AR) ──────────────────────────────────────────────────
  | 'witanime'
  | 'okanime'
  // ── Community anime (RU) ──────────────────────────────────────────────────
  | 'animego'
  | 'animelib'
  | 'animebuff'
  | 'sovetromantica'
  | 'animevost'
  | 'anime365'
  | 'hdrezka'
  // ── Community anime (PT/BR) ───────────────────────────────────────────────
  | 'betteranime'
  | 'animefire'
  | 'hinatasoul'
  // ── Community anime (IT) ─────────────────────────────────────────────────
  | 'animeworld'
  | 'animeunity'
  // ── Community anime (DE) ─────────────────────────────────────────────────
  | 'aniworld'
  | 'bs_to'
  // ── Community anime (JP/EN) ──────────────────────────────────────────────
  | 'animelon'
  // ── Legal manga ───────────────────────────────────────────────────────────
  | 'mangadex'
  | 'webtoon'
  | 'mangaplus'
  // ── Community manga ───────────────────────────────────────────────────────
  | 'mangabat'
  | 'mangakakalot'
  | 'tcbscans'
  | 'mangasee123'
  | 'bato'
  | 'asuracomic'
  | 'flamecomics'
  | 'mangafire'
  | 'mangapark'
  | 'mangabuddy'
  | 'cubari'
  | 'toonily'
  | 'weebcentral'
  | 'mangago'
  | 'mangaread'
  | 'readm'
  | 'guya'
  | 'generic_manga'
  | 'generic_anime'
  | 'unknown';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TrackerAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  username?: string;
  avatarUrl?: string;
}

// ─── Tracker Search Result ────────────────────────────────────────────────────

export interface TrackerEntry {
  id: number;
  title: string;
  coverImage: string;
  type: MediaType;
  status: MediaStatus;
  progress: number;
  score?: number;
  totalChapters?: number;
  totalEpisodes?: number;
  tracker: TrackerType;
  publishingStatus?: string;
}

// ─── Detected Media ───────────────────────────────────────────────────────────

export interface DetectedMedia {
  platform: PlatformType;
  title: string;
  progress: number;
  type: MediaType;
  url: string;
  progressTitle?: string;
}

// ─── Migration ────────────────────────────────────────────────────────────────

export type MigrationStatus = 'active' | 'archived' | 'migrated';

export interface MigrationRecord {
  fromPlatformKey: string;
  toPlatformKey: string;
  migratedAt: number;
  progressAtMigration: number;
  reason?: string;
}

// ─── Core Tracked Item ────────────────────────────────────────────────────────

export interface TrackedItem {
  platformKey: string;
  platform: PlatformType;
  platformTitle: string;
  type: MediaType;
  trackerIds: Partial<Record<TrackerType, number>>;
  lastProgress: number;
  status: MediaStatus;
  lastSyncedAt?: number;
  migrationStatus: MigrationStatus;
  migratedFrom?: MigrationRecord;
  migratedTo?: MigrationRecord;
  publishingStatus?: string;
  pendingProgress?: number[]; // Chapters read but not synced
  autoTrack?: boolean; // If true, ignore confirmation for this item
  createdAt: number;
  updatedAt: number;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  activeTrackers: TrackerType[];
  updateAfterReading: boolean;
  autoSyncHistory: boolean;
  auth: Partial<Record<TrackerType, TrackerAuth>>;
  defaultTracker: TrackerType | null;
  // New Community Sources Flow Settings
  confirmationMode: ConfirmationMode;
  batchSyncPending: boolean;
  showChapterBadge: boolean;
  notifyDetectionFailure: boolean;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS: 'tsugi:settings',
  TRACKED_ITEMS: 'tsugi:tracked',
} as const;

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface AidokuSource {
  id: string;
  name: string;
  baseURL: string;
  languages: string[];
  iconURL: string;
}

export interface AidokuSourceIndex {
  sources: AidokuSource[];
  lastUpdated: number;
}

export type Message =
  | { type: 'MEDIA_DETECTED'; payload: DetectedMedia }
  | { type: 'SEARCH_TRACKER'; payload: { tracker: TrackerType; query: string; mediaType: MediaType } }
  | { type: 'LINK_ENTRY'; payload: { platformKey: string; tracker: TrackerType; entryId: number; status?: MediaStatus } }
  | { type: 'UNLINK_ENTRY'; payload: { platformKey: string; tracker: TrackerType } }
  | { type: 'SYNC_PROGRESS'; payload: { platformKey: string } }
  | { type: 'MIGRATE_PLATFORM'; payload: MigratePlatformPayload }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'GET_TRACKED_ITEMS' }
  | { type: 'INITIATE_AUTH'; payload: { tracker: TrackerType } }
  | { type: 'LOGOUT'; payload: { tracker: TrackerType } }
  | { type: 'GET_AIDOKU_SOURCES' }
  | { type: 'SYNC_ALL_HISTORY' }
  // Content Script UI Messages
  | { type: 'SHOW_TOAST'; payload: { title: string; subtitle: string; duration?: number; type?: 'success' | 'warning' | 'error' | 'info' } }
  | { type: 'SHOW_MODAL'; payload: { modalType: 'link' | 'migration' | 'jump' | 'fallback'; data: any } }
  | { type: 'CONFIRM_TRACKING'; payload: { platformKey: string; confirmed: boolean; always?: boolean } };

export interface MigratePlatformPayload {
  fromPlatformKey: string;
  toPlatform: PlatformType;
  toPlatformTitle: string;
  reason?: string;
}

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
