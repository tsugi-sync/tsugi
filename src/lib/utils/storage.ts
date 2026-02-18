import type { AppSettings, TrackedItem } from '../types';

// ─── Generic Wrappers ─────────────────────────────────────────────────────────

export async function storageGet<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  activeTrackers: [],
  updateAfterReading: true,
  autoSyncHistory: false,
  auth: {},
  defaultTracker: null,
  confirmationMode: 'quick',
  batchSyncPending: true,
  showChapterBadge: true,
  notifyDetectionFailure: true,
};

export async function getSettings(): Promise<AppSettings> {
  const stored = await storageGet<AppSettings>('tsugi:settings');
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await storageSet('tsugi:settings', { ...current, ...partial });
}

// ─── Tracked Items ────────────────────────────────────────────────────────────

export async function getAllTrackedItems(): Promise<Record<string, TrackedItem>> {
  return (await storageGet<Record<string, TrackedItem>>('tsugi:tracked')) ?? {};
}

export async function getTrackedItem(platformKey: string): Promise<TrackedItem | null> {
  const all = await getAllTrackedItems();
  return all[platformKey] ?? null;
}

export async function saveTrackedItem(item: TrackedItem): Promise<void> {
  const all = await getAllTrackedItems();
  await storageSet('tsugi:tracked', { ...all, [item.platformKey]: item });
}

export async function deleteTrackedItem(platformKey: string): Promise<void> {
  const all = await getAllTrackedItems();
  delete all[platformKey];
  await storageSet('tsugi:tracked', all);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function makePlatformKey(platform: string, title: string): string {
  return `${platform}:${slugify(title)}`;
}
