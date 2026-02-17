/**
 * Bangumi Tracker (bgm.tv)
 *
 * Docs: https://bangumi.github.io/api/
 * Auth: OAuth2 (Authorization Code)
 * Popular in: China
 *
 * TODO: Register app at https://bgm.tv/dev/app
 *       Set redirect URI to: chrome.identity.getRedirectURL('bangumi')
 *       Then replace credentials below.
 */

import type { TrackerEntry, TrackerAuth, MediaStatus, MediaType } from '@/lib/types';

export const BANGUMI_APP_ID = import.meta.env.WXT_BANGUMI_APP_ID;
export const BANGUMI_APP_SECRET = import.meta.env.WXT_BANGUMI_APP_SECRET;
const BANGUMI_API = 'https://api.bgm.tv';
const BANGUMI_AUTH = 'https://bgm.tv/oauth';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getBangumiAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: BANGUMI_APP_ID,
    response_type: 'code',
    redirect_uri: chrome.identity.getRedirectURL(),
  });
  return `${BANGUMI_AUTH}/authorize?${params}`;
}

export async function exchangeBangumiCode(code: string): Promise<TrackerAuth> {
  // TODO: Like Shikimori, requires app_secret — consider a minimal proxy for production
  const res = await fetch(`${BANGUMI_AUTH}/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: BANGUMI_APP_ID,
      client_secret: BANGUMI_APP_SECRET,
      code,
      redirect_uri: chrome.identity.getRedirectURL(),
    }),
  });
  if (!res.ok) throw new Error(`Bangumi auth failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshBangumiToken(refreshToken: string): Promise<TrackerAuth> {
  const res = await fetch(`${BANGUMI_AUTH}/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: BANGUMI_APP_ID,
      client_secret: BANGUMI_APP_SECRET,
      refresh_token: refreshToken,
      redirect_uri: chrome.identity.getRedirectURL(),
    }),
  });
  if (!res.ok) throw new Error(`Bangumi token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ─── User Info ────────────────────────────────────────────────────────────────

export async function getBangumiUser(token: string): Promise<{ username: string; avatarUrl: string }> {
  const res = await fetch(`${BANGUMI_API}/v0/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Bangumi user');
  const data = await res.json();
  return { username: data.nickname ?? data.username, avatarUrl: data.avatar?.medium ?? '' };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchBangumi(
  query: string,
  type: 'anime' | 'manga'
): Promise<TrackerEntry[]> {
  // Bangumi search doesn't require auth
  // type: 2 = anime, 1 = book/manga
  const subjectType = type === 'anime' ? 2 : 1;
  const res = await fetch(
    `${BANGUMI_API}/v0/search/subjects?keyword=${encodeURIComponent(query)}&type=${subjectType}&limit=12`,
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!res.ok) throw new Error(`Bangumi search failed: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).map((item: any) => ({
    id: item.id,
    title: item.name_cn || item.name,
    coverImage: item.images?.medium ?? '',
    type: type as MediaType,
    status: 'plan_to_read' as MediaStatus,
    progress: 0,
    score: item.score,
    totalChapters: item.eps ?? null,
    totalEpisodes: item.eps ?? null,
    tracker: 'bangumi' as const,
  }));
}

// ─── Progress Update ──────────────────────────────────────────────────────────

export async function updateBangumiProgress(
  subjectId: number,
  type: 'anime' | 'manga',
  progress: number,
  status: MediaStatus,
  token: string
): Promise<void> {
  // PATCH /v0/users/-/collections/{subject_id}
  const res = await fetch(`${BANGUMI_API}/v0/users/-/collections/${subjectId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: toBangumiStatus(status),
      ep_status: type === 'anime' ? progress : undefined,
      vol_status: type === 'manga' ? progress : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Bangumi update failed: ${res.status}`);
}

// ─── Episode-level update (anime) ─────────────────────────────────────────────

export async function updateBangumiEpisode(
  episodeId: number,
  watched: boolean,
  token: string
): Promise<void> {
  // TODO: for granular episode tracking use PUT /v0/episodes/{id}/collection
  const res = await fetch(`${BANGUMI_API}/v0/episodes/${episodeId}/collection`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: watched ? 2 : 0 }), // 2 = watched, 0 = unwatched
  });
  if (!res.ok) throw new Error(`Bangumi episode update failed: ${res.status}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBangumiStatus(status: MediaStatus): number {
  // Bangumi: 1=wish, 2=collect, 3=do, 4=on_hold, 5=dropped
  const map: Record<MediaStatus, number> = {
    plan_to_watch: 1,
    plan_to_read: 1,
    completed: 2,
    watching: 3,
    reading: 3,
    on_hold: 4,
    dropped: 5,
  };
  return map[status];
}
