/**
 * Shikimori Tracker
 *
 * Docs: https://shikimori.one/api/doc
 * Auth: OAuth2 (Authorization Code)
 * Popular in: Russia / CIS
 *
 * TODO: Register app at https://shikimori.one/oauth/applications
 *       Set redirect URI to: chrome.identity.getRedirectURL('shikimori')
 *       Then replace credentials below.
 */

import type { TrackerEntry, TrackerAuth, MediaStatus, MediaType } from '@/lib/types';

export const SHIKIMORI_CLIENT_ID = import.meta.env.WXT_SHIKIMORI_CLIENT_ID;
export const SHIKIMORI_CLIENT_SECRET = import.meta.env.WXT_SHIKIMORI_CLIENT_SECRET;
const SHIKIMORI_API = 'https://shikimori.one/api';
const SHIKIMORI_AUTH = 'https://shikimori.one/oauth';
const USER_AGENT = 'Tsugi Browser Extension'; // Required by Shikimori API

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getShikimoriAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: SHIKIMORI_CLIENT_ID,
    redirect_uri: chrome.identity.getRedirectURL(),
    response_type: 'code',
    scope: '',
  });
  return `${SHIKIMORI_AUTH}/authorize?${params}`;
}

export async function exchangeShikimoriCode(code: string): Promise<TrackerAuth> {
  // TODO: Shikimori requires client_secret — this needs a proxy or secure storage
  // For now scaffold with direct call; consider a lightweight proxy for production
  const res = await fetch(`${SHIKIMORI_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: SHIKIMORI_CLIENT_ID,
      client_secret: SHIKIMORI_CLIENT_SECRET,
      code,
      redirect_uri: chrome.identity.getRedirectURL(),
    }),
  });
  if (!res.ok) throw new Error(`Shikimori auth failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ─── User Info ────────────────────────────────────────────────────────────────

export async function getShikimoriUser(token: string): Promise<{ username: string; avatarUrl: string }> {
  const res = await fetch(`${SHIKIMORI_API}/users/whoami`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error('Failed to fetch Shikimori user');
  const data = await res.json();
  return { username: data.nickname, avatarUrl: data.avatar ?? '' };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchShikimori(
  query: string,
  type: 'anime' | 'manga',
  token: string
): Promise<TrackerEntry[]> {
  const res = await fetch(
    `${SHIKIMORI_API}/${type}s?search=${encodeURIComponent(query)}&limit=12&order=popularity`,
    { headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT } }
  );
  if (!res.ok) throw new Error(`Shikimori search failed: ${res.status}`);
  const data = await res.json();

  return data.map((item: any) => ({
    id: item.id,
    title: item.name,
    coverImage: `https://shikimori.one${item.image?.preview ?? ''}`,
    type: type as MediaType,
    status: 'plan_to_read' as MediaStatus,
    progress: 0,
    score: item.score ? parseFloat(item.score) : undefined,
    totalChapters: item.chapters ?? null,
    totalEpisodes: item.episodes ?? null,
    tracker: 'shikimori' as const,
  }));
}

async function getUserRateId(
  targetId: number,
  targetType: 'Anime' | 'Manga',
  token: string
): Promise<number | null> {
  const res = await fetch(`${SHIKIMORI_API}/v2/user_rates?target_id=${targetId}&target_type=${targetType}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0]?.id ?? null;
}

export async function updateShikimoriProgress(
  targetId: number,
  type: 'anime' | 'manga',
  progress: number,
  status: MediaStatus,
  token: string
): Promise<void> {
  const targetType = type === 'anime' ? 'Anime' : 'Manga';
  const rateId = await getUserRateId(targetId, targetType, token);

  const progressField = type === 'anime' ? 'episodes' : 'chapters';
  const url = rateId ? `${SHIKIMORI_API}/v2/user_rates/${rateId}` : `${SHIKIMORI_API}/v2/user_rates`;
  const method = rateId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      user_rate: {
        target_id: targetId,
        target_type: targetType,
        status: toShikimoriStatus(status),
        [progressField]: progress,
      },
    }),
  });
  if (!res.ok) throw new Error(`Shikimori update failed: ${res.status}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toShikimoriStatus(status: MediaStatus): string {
  const map: Record<MediaStatus, string> = {
    watching: 'watching',
    reading: 'reading',
    completed: 'completed',
    on_hold: 'on_hold',
    dropped: 'dropped',
    plan_to_watch: 'planned',
    plan_to_read: 'planned',
  };
  return map[status];
}
