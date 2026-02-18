import type { Message, MessageResponse, TrackerType, MediaStatus, AppSettings, TrackedItem, AidokuSource, AidokuSourceIndex, TrackerEntry, DetectedMedia } from '@/lib/types';
import { getSettings, saveSettings, getTrackedItem, saveTrackedItem, getAllTrackedItems, makePlatformKey, deleteTrackedItem, storageSet } from '@/lib/utils/storage';
import { searchMAL, updateMALProgress, getMALAuthUrl, exchangeMALCode, getMALUser, generateCodeVerifier, MAL_CLIENT_ID, getMALUserList } from '@/lib/trackers/mal';
import { searchAniList, updateAniListProgress, getAniListAuthUrl, parseAniListToken, getAniListUser, getAniListUserList } from '@/lib/trackers/anilist';
import { searchShikimori, updateShikimoriProgress, getShikimoriAuthUrl, exchangeShikimoriCode, getShikimoriUser } from '@/lib/trackers/shikimori';
import { searchBangumi, updateBangumiProgress, getBangumiAuthUrl, exchangeBangumiCode, getBangumiUser, refreshBangumiToken } from '@/lib/trackers/bangumi';
import { migratePlatform, getActiveItems, getArchivedItems } from '@/lib/migrations/index';
import { ensureValidToken } from '@/lib/utils/auth';

// Store PKCE verifiers temporarily during auth flow
const pkceVerifiers: Partial<Record<TrackerType, string>> = {};

// Cache for items detected in the current session (not yet persistently saved if unlinked)
let sessionDiscoveries: Record<string, TrackedItem> = {};
let currentlyViewingKey: string | null = null;

const AIDOKU_SOURCES_URL = 'https://aidoku-community.github.io/sources/index.min.json';
const AIDOKU_CACHE_KEY = 'aidoku_sources_cache';
const AIDOKU_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  });

  // Prune session discoveries older than 1 day every hour to keep memory lean
  const SESSION_TTL = 24 * 60 * 60 * 1000; // 1 day
  setInterval(() => {
    const now = Date.now();
    for (const key in sessionDiscoveries) {
      if (now - (sessionDiscoveries[key].createdAt ?? 0) > SESSION_TTL) {
        delete sessionDiscoveries[key];
      }
    }
  }, 60 * 60 * 1000); // Run every hour
});

// ─── Message Router ───────────────────────────────────────────────────────────

async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {

    case 'GET_SETTINGS':
      return { success: true, data: await getSettings() };

    case 'SAVE_SETTINGS': {
      await saveSettings(message.payload);
      return { success: true, data: null };
    }

    case 'GET_TRACKED_ITEMS': {
      const active = await getActiveItems();
      const archived = await getArchivedItems();
      // Combine persistent active items with session discoveries that are NOT already in persistent
      const activeWithDiscoveries = [...active];
      for (const key in sessionDiscoveries) {
        if (!active.some(item => item.platformKey === key)) {
          activeWithDiscoveries.push(sessionDiscoveries[key]);
        }
      }
      return {
        success: true,
        data: {
          active: activeWithDiscoveries,
          archived,
          currentlyViewingKey
        }
      };
    }

    case 'INITIATE_AUTH':
      return handleAuth(message.payload.tracker);

    case 'LOGOUT':
      return handleLogout(message.payload.tracker);

    case 'SEARCH_TRACKER': {
      const settings = await getSettings();
      if (settings.activeTrackers.length === 0) return { success: false, error: 'Please connect a tracker in Settings first.' };
      return handleSearch(message.payload);
    }

    case 'MEDIA_DETECTED': {
      const settings = await getSettings();
      if (settings.activeTrackers.length === 0) return { success: true, data: null }; // Silent ignore
      return handleMediaDetected(message.payload);
    }

    case 'LINK_ENTRY': {
      const settings = await getSettings();
      if (settings.activeTrackers.length === 0) return { success: false, error: 'Connect a tracker first.' };
      return handleLinkEntry(message.payload);
    }

    case 'UNLINK_ENTRY':
      return handleUnlinkEntry(message.payload);

    case 'SYNC_PROGRESS': {
      const settings = await getSettings();
      if (settings.activeTrackers.length === 0) return { success: false, error: 'No active trackers' };
      return handleSyncProgress(message.payload.platformKey);
    }

    case 'SYNC_ALL_HISTORY':
      await syncAllHistory();
      return { success: true, data: null };

    case 'MIGRATE_PLATFORM': {
      const newItem = await migratePlatform(message.payload);
      return { success: true, data: newItem };
    }

    case 'CONFIRM_TRACKING':
      return handleConfirmTracking(message.payload);

    case 'GET_AIDOKU_SOURCES':
      return handleGetAidokuSources();

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function handleAuth(tracker: TrackerType): Promise<MessageResponse> {
  try {
    // Diagnostic: Check if Client ID is being loaded
    let diagnosticInfo = `Tracker: ${tracker}`;
    let authUrl = '';

    if (tracker === 'mal') {
      const { MAL_CLIENT_ID, MAL_CLIENT_SECRET, getMALAuthUrl, generateCodeVerifier } = await import('@/lib/trackers/mal');
      if (!MAL_CLIENT_ID || MAL_CLIENT_ID.startsWith('your_') || MAL_CLIENT_ID === 'undefined') {
        return { success: false, error: 'MAL Client ID not set. Update .env with your key from myanimelist.net/apiconfig and RESTART the dev server.' };
      }
      if (!MAL_CLIENT_SECRET || MAL_CLIENT_SECRET.startsWith('your_') || MAL_CLIENT_SECRET === 'undefined') {
        return { success: false, error: 'MAL Client Secret not set for "Web" app type. Update .env and RESTART the dev server.' };
      }
      const verifier = generateCodeVerifier();
      pkceVerifiers.mal = verifier;
      authUrl = getMALAuthUrl(verifier);
      diagnosticInfo += ` | ID: ${MAL_CLIENT_ID.substring(0, 5)}...`;
    } else if (tracker === 'anilist') {
      const { ANILIST_CLIENT_ID, getAniListAuthUrl } = await import('@/lib/trackers/anilist');
      if (!ANILIST_CLIENT_ID || ANILIST_CLIENT_ID.startsWith('your_') || ANILIST_CLIENT_ID === 'undefined') {
        return { success: false, error: 'AniList Client ID not set. Update .env with your key from anilist.co/settings/developer' };
      }
      authUrl = getAniListAuthUrl();
      diagnosticInfo += ` | ID: ${ANILIST_CLIENT_ID.substring(0, 5)}...`;
    } else if (tracker === 'shikimori') {
      const { SHIKIMORI_CLIENT_ID, getShikimoriAuthUrl } = await import('@/lib/trackers/shikimori');
      if (!SHIKIMORI_CLIENT_ID || SHIKIMORI_CLIENT_ID.startsWith('your_') || SHIKIMORI_CLIENT_ID === 'undefined') {
        return { success: false, error: 'Shikimori Client ID not set. Update .env with your key from shikimori.one/oauth/applications' };
      }
      authUrl = getShikimoriAuthUrl();
      diagnosticInfo += ` | ID: ${SHIKIMORI_CLIENT_ID.substring(0, 5)}...`;
    } else if (tracker === 'bangumi') {
      const { BANGUMI_APP_ID, getBangumiAuthUrl } = await import('@/lib/trackers/bangumi');
      if (!BANGUMI_APP_ID || BANGUMI_APP_ID.startsWith('your_') || BANGUMI_APP_ID === 'undefined') {
        return { success: false, error: 'Bangumi App ID not set. Update .env with your key from bgm.tv/dev/app' };
      }
      authUrl = getBangumiAuthUrl();
      diagnosticInfo += ` | ID: ${BANGUMI_APP_ID.substring(0, 5)}...`;
    } else {
      return { success: false, error: `Unknown tracker: ${tracker}` };
    }

    const redirectUri = chrome.identity.getRedirectURL();
    diagnosticInfo += ` | Redirect: ${redirectUri}`;

    // Open OAuth popup via chrome.identity
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (resUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`${chrome.runtime.lastError.message} (${diagnosticInfo})`));
          } else if (!resUrl) {
            reject(new Error(`Authentication failed: No redirect URL received. (${diagnosticInfo})`));
          } else {
            resolve(resUrl);
          }
        }
      );
    });

    return await finalizeAuth(tracker, responseUrl);
  } catch (err: any) {
    console.error(`[Tsugi] Auth direct error:`, err);
    return { success: false, error: err.message };
  }
}

async function finalizeAuth(tracker: TrackerType, redirectUrl: string): Promise<MessageResponse> {
  const settings = await getSettings();
  let auth: any;

  try {
    if (tracker === 'mal') {
      const code = new URL(redirectUrl).searchParams.get('code');
      if (!code) return { success: false, error: 'No code in MAL redirect' };
      const verifier = pkceVerifiers.mal;
      if (!verifier) return { success: false, error: 'No PKCE verifier found' };
      auth = await exchangeMALCode(code, verifier);
      delete pkceVerifiers.mal;
      const user = await getMALUser(auth.accessToken);
      auth = { ...auth, ...user };

    } else if (tracker === 'anilist') {
      auth = parseAniListToken(redirectUrl);
      const user = await getAniListUser(auth.accessToken);
      auth = { ...auth, ...user };

    } else if (tracker === 'shikimori') {
      const code = new URL(redirectUrl).searchParams.get('code');
      if (!code) return { success: false, error: 'No code in Shikimori redirect' };
      auth = await exchangeShikimoriCode(code);
      const user = await getShikimoriUser(auth.accessToken);
      auth = { ...auth, ...user };

    } else if (tracker === 'bangumi') {
      const code = new URL(redirectUrl).searchParams.get('code');
      if (!code) return { success: false, error: 'No code in Bangumi redirect' };
      auth = await exchangeBangumiCode(code);
      const user = await getBangumiUser(auth.accessToken);
      auth = { ...auth, ...user };
    }

    await saveSettings({
      auth: { ...settings.auth, [tracker]: auth },
      activeTrackers: [...new Set([...settings.activeTrackers, tracker])],
    });

    return { success: true, data: auth };
  } catch (err: any) {
    console.error(`[Tsugi] Finalize auth error for ${tracker}:`, err);
    const redirectInfo = ` (Redirect Used: ${redirectUrl})`;
    return { success: false, error: `Failed to complete ${tracker} connection: ${err.message}${redirectInfo}` };
  }
}

async function handleLogout(tracker: TrackerType): Promise<MessageResponse> {
  const settings = await getSettings();
  const newAuth = { ...settings.auth };
  delete newAuth[tracker];
  await saveSettings({
    auth: newAuth,
    activeTrackers: settings.activeTrackers.filter(t => t !== tracker),
  });
  return { success: true, data: null };
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function handleSearch({ tracker, query, mediaType }: {
  tracker: TrackerType;
  query: string;
  mediaType: any;
}): Promise<MessageResponse> {
  const settings = await getSettings();
  const auth = settings.auth[tracker];
  if (!auth) return { success: false, error: `Not authenticated with ${tracker}` };

  const isAnime = mediaType === 'anime';

  try {
    const token = await ensureValidToken(tracker);
    let results;
    if (tracker === 'mal') results = await searchMAL(query, isAnime ? 'anime' : 'manga', token);
    else if (tracker === 'anilist') results = await searchAniList(query, isAnime ? 'ANIME' : 'MANGA', token);
    else if (tracker === 'shikimori') results = await searchShikimori(query, isAnime ? 'anime' : 'manga', token);
    else if (tracker === 'bangumi') results = await searchBangumi(query, isAnime ? 'anime' : 'manga');
    else return { success: false, error: `Tracker ${tracker} not implemented` };

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Media Detected ───────────────────────────────────────────────────────────

async function handleMediaDetected(payload: DetectedMedia, sender?: chrome.runtime.MessageSender): Promise<MessageResponse> {
  const { platform, title, progress, type } = payload;
  const platformKey = makePlatformKey(platform, title);
  currentlyViewingKey = platformKey;

  const [settings, existing] = await Promise.all([getSettings(), getTrackedItem(platformKey)]);
  const tabId = sender?.tab?.id;

  if (existing) {
    // 1. Existing tracked item
    if (existing.migrationStatus === 'active' && existing.lastProgress < progress) {
      const isUnlinked = Object.keys(existing.trackerIds).length === 0;

      if (isUnlinked) {
        // Not linked to any tracker yet — just update local progress so it's ready when they link
        existing.lastProgress = progress;
        existing.updatedAt = Date.now();
        if (!existing.pendingProgress) existing.pendingProgress = [];
        if (!existing.pendingProgress.includes(progress)) {
          existing.pendingProgress.push(progress);
        }
        await saveTrackedItem(existing);
      } else if (settings.confirmationMode === 'auto' || existing.autoTrack) {
        // Auto-sync
        existing.lastProgress = progress;
        existing.updatedAt = Date.now();
        await saveTrackedItem(existing);
        await syncToTrackers(platformKey, progress);
        if (tabId) showToast(tabId, '✓ Auto-synced', `${title} Ch.${progress}`, 'success');
      } else {
        // Scenario 4: Update pendingProgress if not auto-syncing
        if (!existing.pendingProgress) existing.pendingProgress = [];
        if (!existing.pendingProgress.includes(progress)) {
          existing.pendingProgress.push(progress);
          await saveTrackedItem(existing);
        }
        if (settings.confirmationMode === 'quick' && tabId) {
          showToast(tabId, `📖 ${title} Ch.${progress}`, 'Track this chapter?', 'info', 5000);
        }
      }
    }
  } else {
    // 2. Check for migration or historical matches (Scenario 6)
    const allItems = await getAllTrackedItems();
    const duplicate = Object.values(allItems).find((item: any) =>
      item.platformTitle.toLowerCase() === title.toLowerCase() &&
      item.platform !== platform &&
      item.migrationStatus === 'active'
    );

    if (duplicate) {
      // SEAMLESS SYNC: If it's a generic item from history sync, automatically link it
      if (duplicate.platform.startsWith('generic_') && settings.autoSyncHistory) {
        const linkedItem: TrackedItem = {
          ...duplicate,
          platformKey,
          platform,
          updatedAt: Date.now(),
        };
        await saveTrackedItem(linkedItem);
        // Delete the generic placeholder
        const all = await getAllTrackedItems();
        delete all[duplicate.platformKey];
        await storageSet('tsugi:tracked', all);

        if (tabId) showToast(tabId, '✓ History Matched', `Linked ${title} to ${trackerNames(linkedItem)}`, 'success');
        return { success: true, data: null };
      }

      if (tabId) {
        showModal(tabId, 'migration', {
          fromItem: duplicate, toPlatform: platform, toTitle: title, toProgress: progress
        });
      }
      return { success: true, data: null };
    }

    // 3. New discovery (Scenario 1)
    if (!sessionDiscoveries[platformKey]) {
      // ... existing discovery logic
      const discovery: TrackedItem = {
        platformKey, platform, platformTitle: title, type,
        trackerIds: {}, lastProgress: progress,
        status: type === 'anime' ? 'watching' : 'reading',
        migrationStatus: 'active', createdAt: Date.now(), updatedAt: Date.now(),
      };
      sessionDiscoveries[platformKey] = discovery;

      if (settings.activeTrackers.length > 0 && progress >= 1 && tabId) {
        showModal(tabId, 'link', { platformKey, title, progress });
      }
    } else {
      // Already discovered but not yet linked — update progress if user has read further
      const existing = sessionDiscoveries[platformKey];
      if (progress > existing.lastProgress) {
        existing.lastProgress = progress;
        existing.updatedAt = Date.now();
        // Also track all chapters read so far as pending
        if (!existing.pendingProgress) existing.pendingProgress = [];
        if (!existing.pendingProgress.includes(progress)) {
          existing.pendingProgress.push(progress);
        }
      }
    }
  }

  return { success: true, data: null };
}

async function handleConfirmTracking({ platformKey, confirmed, always }: any): Promise<MessageResponse> {
  if (!confirmed) {
    // Scenario 4: If not confirmed, we could store in pending updates
    return { success: true, data: null };
  }

  let item = await getTrackedItem(platformKey);
  if (!item && sessionDiscoveries[platformKey]) {
    item = sessionDiscoveries[platformKey];
    delete sessionDiscoveries[platformKey];
  }

  if (item) {
    if (always) item.autoTrack = true;
    await saveTrackedItem(item);
    // If not linked yet, background can't sync to tracker. 
    // Usually LINK_ENTRY message follows search from popup.
  }

  return { success: true, data: null };
}

function showToast(tabId: number, title: string, subtitle: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', duration?: number) {
  chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', payload: { title, subtitle, type, duration } }).catch(() => { });
}

function showModal(tabId: number, modalType: 'link' | 'migration' | 'jump' | 'fallback', data: any) {
  chrome.tabs.sendMessage(tabId, { type: 'SHOW_MODAL', payload: { modalType, data } }).catch(() => { });
}

// ─── Link / Unlink ────────────────────────────────────────────────────────────

async function handleLinkEntry({ platformKey, tracker, entryId, status }: any): Promise<MessageResponse> {
  // 1. Check persistent storage
  let item = await getTrackedItem(platformKey);

  // 2. Check session discoveries (items detected but not yet linked)
  if (!item && sessionDiscoveries[platformKey]) {
    item = sessionDiscoveries[platformKey];
    delete sessionDiscoveries[platformKey];
  }

  // 3. If still not found, handle manual/generic keys from search
  if (!item) {
    if (platformKey?.startsWith('generic_') || platformKey?.startsWith('manual:')) {
      const parts = platformKey.split(':');
      const platformPart = parts[0];
      const type = platformPart.includes('anime') ? 'anime' : 'manga';
      const slug = parts[1] || 'manual-entry';

      item = {
        platformKey,
        platform: (platformPart.startsWith('generic') ? platformPart : 'generic_manga') as any,
        platformTitle: slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type,
        trackerIds: {},
        lastProgress: 0,
        status: status || (type === 'anime' ? 'watching' : 'reading'),
        migrationStatus: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      return { success: false, error: 'Entry not found' };
    }
  }

  item.trackerIds = { ...item.trackerIds, [tracker]: entryId };
  if (status) item.status = status;
  item.updatedAt = Date.now();

  // Use the highest progress seen (pending or lastProgress) for the initial sync
  const pendingMax = (item.pendingProgress?.length ?? 0) > 0 ? Math.max(...item.pendingProgress!) : 0;
  const syncProgress = Math.max(item.lastProgress, pendingMax);
  item.lastProgress = syncProgress;
  item.pendingProgress = []; // Clear pending after linking

  await saveTrackedItem(item);

  // Push initial sync immediately with the highest known progress
  await syncToTrackers(platformKey, syncProgress);

  return { success: true, data: null };
}

async function handleUnlinkEntry({ platformKey, tracker }: { platformKey: string; tracker: TrackerType }): Promise<MessageResponse> {
  const item = await getTrackedItem(platformKey);
  if (!item) return { success: false, error: 'Entry not found' };

  delete item.trackerIds[tracker];
  item.updatedAt = Date.now();
  await saveTrackedItem(item);
  return { success: true, data: null };
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

async function handleSyncProgress(platformKey: string): Promise<MessageResponse> {
  const item = await getTrackedItem(platformKey);
  if (!item) return { success: false, error: 'Not tracking this entry' };

  const pending = item.pendingProgress ?? [];
  const newProgress = pending.length > 0 ? Math.max(...pending) : item.lastProgress;

  item.lastProgress = newProgress;
  item.pendingProgress = []; // Clear pending after sync
  await saveTrackedItem(item);
  await syncToTrackers(platformKey, newProgress);
  return { success: true, data: null };
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function trackerNames(item: TrackedItem): string {
  return Object.keys(item.trackerIds).map(t => t.toUpperCase()).join(', ');
}

async function syncToTrackers(platformKey: string, progress: number): Promise<void> {
  const [settings, item] = await Promise.all([getSettings(), getTrackedItem(platformKey)]);
  if (!item) return;

  const isAnime = item.type === 'anime';
  const status = item.status;

  const syncs = settings.activeTrackers.map(async (tracker) => {
    const trackerId = item.trackerIds[tracker as TrackerType];
    const auth = settings.auth[tracker as TrackerType];
    if (!trackerId || !auth) return;

    try {
      const token = await ensureValidToken(tracker);
      if (tracker === 'mal') await updateMALProgress(trackerId, isAnime ? 'anime' : 'manga', progress, status, token);
      else if (tracker === 'anilist') await updateAniListProgress(trackerId, progress, status, token);
      else if (tracker === 'shikimori') await updateShikimoriProgress(trackerId, isAnime ? 'anime' : 'manga', progress, status, token);
      else if (tracker === 'bangumi') await updateBangumiProgress(trackerId, isAnime ? 'anime' : 'manga', progress, status, token);
    } catch (err) {
      console.error(`[Tsugi] Sync to ${tracker} failed:`, err);
    }
  });

  await Promise.allSettled(syncs);
  item.lastSyncedAt = Date.now();
  item.pendingProgress = []; // Clear pending after successful batch sync
  await saveTrackedItem(item);
}

// ─── Aidoku Sources ───────────────────────────────────────────────────────────

async function handleGetAidokuSources(): Promise<MessageResponse> {
  try {
    const cached = await chrome.storage.local.get(AIDOKU_CACHE_KEY);
    const index = cached[AIDOKU_CACHE_KEY] as AidokuSourceIndex | undefined;

    if (!index || Date.now() - index.lastUpdated > AIDOKU_REFRESH_INTERVAL) {
      return { success: true, data: await fetchAidokuSources() };
    }

    return { success: true, data: index.sources };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function fetchAidokuSources(): Promise<AidokuSource[]> {
  try {
    const resp = await fetch(AIDOKU_SOURCES_URL);
    const data = await resp.json();
    const sources: AidokuSource[] = data.sources.map((s: any) => ({
      id: s.id,
      name: s.name,
      baseURL: s.baseURL,
      languages: s.languages,
      iconURL: s.iconURL.startsWith('http') ? s.iconURL : `https://aidoku-community.github.io/sources/${s.iconURL}`
    }));

    const index: AidokuSourceIndex = {
      sources,
      lastUpdated: Date.now()
    };

    await chrome.storage.local.set({ [AIDOKU_CACHE_KEY]: index });
    return sources;
  } catch (err) {
    console.error('[Tsugi] Failed to fetch Aidoku sources:', err);
    throw err;
  }
}

// Initialize Aidoku sources on startup
chrome.runtime.onStartup.addListener(() => fetchAidokuSources().catch(() => { }));
chrome.runtime.onInstalled.addListener(() => fetchAidokuSources().catch(() => { }));

async function syncAllHistory(): Promise<void> {
  const settings = await getSettings();
  const syncs = settings.activeTrackers.map(async (tracker) => {
    const auth = settings.auth[tracker];
    if (!auth) return;
    try {
      const token = await ensureValidToken(tracker);
      let entries: TrackerEntry[] = [];
      if (tracker === 'mal') {
        const manga = await getMALUserList('manga', token);
        const anime = await getMALUserList('anime', token);
        entries = [...manga, ...anime];
      } else if (tracker === 'anilist' && auth.username) {
        const manga = await getAniListUserList(auth.username, 'MANGA', token);
        const anime = await getAniListUserList(auth.username, 'ANIME', token);
        entries = [...manga, ...anime];
      }

      for (const entry of entries) {
        const platformType = entry.type === 'anime' ? 'generic_anime' : 'generic_manga';
        const platformKey = makePlatformKey(platformType, entry.title);
        let item = await getTrackedItem(platformKey);
        if (!item) {
          item = {
            platformKey,
            platform: platformType,
            platformTitle: entry.title,
            type: entry.type,
            trackerIds: { [tracker]: entry.id },
            lastProgress: entry.progress,
            status: entry.status,
            migrationStatus: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        } else {
          item.trackerIds[tracker] = entry.id;
          if (entry.progress > item.lastProgress) item.lastProgress = entry.progress;
        }
        await saveTrackedItem(item);
      }
    } catch (err) {
      console.error(`[Tsugi] Failed to sync history for ${tracker}:`, err);
    }
  });
  await Promise.allSettled(syncs);
}
