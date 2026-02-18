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
  // Legal anime
  | 'crunchyroll'
  | 'netflix'
  | 'funimation'
  | 'hidive'
  // Community anime
  | 'zoro'
  | '9anime'
  | 'gogoanime'
  | 'animesuge'
  // Legal manga
  | 'mangadex'
  | 'webtoon'
  | 'mangaplus'
  // Community manga
  | 'mangabat'
  | 'mangakakalot'
  | 'tcbscans'
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
