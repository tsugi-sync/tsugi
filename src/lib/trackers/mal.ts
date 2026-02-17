/**
 * MyAnimeList Tracker
 *
 * Docs: https://myanimelist.net/apiconfig/references/api/v2
 * Auth: OAuth2 PKCE (no client_secret needed for extensions)
 *
 * TODO: Register a client at https://myanimelist.net/apiconfig
 *       and set MAL_CLIENT_ID below.
 */

import type { TrackerEntry, TrackerAuth, MediaStatus, MediaType } from '@/lib/types';

export const MAL_CLIENT_ID = import.meta.env.WXT_MAL_CLIENT_ID;
export const MAL_CLIENT_SECRET = import.meta.env.WXT_MAL_CLIENT_SECRET;
const MAL_API = 'https://api.myanimelist.net/v2';
const MAL_AUTH = 'https://myanimelist.net/v1/oauth2';

// ─── PKCE Helpers ─────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function getMALAuthUrl(codeVerifier: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeVerifier,
    code_challenge_method: 'plain',
    redirect_uri: chrome.identity.getRedirectURL(),
  });
  return `${MAL_AUTH}/authorize?${params}`;
}

export async function exchangeMALCode(code: string, codeVerifier: string): Promise<TrackerAuth> {
  const res = await fetch(`${MAL_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: chrome.identity.getRedirectURL(),
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`MAL token exchange failed (${res.status}): ${errorBody}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshMALToken(refreshToken: string): Promise<TrackerAuth> {
  // TODO: implement token refresh on expiry
  const res = await fetch(`${MAL_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`MAL token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ─── User Info ────────────────────────────────────────────────────────────────

export async function getMALUser(token: string): Promise<{ username: string; avatarUrl: string }> {
  const res = await fetch(`${MAL_API}/users/@me?fields=name,picture`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch MAL user');
  const data = await res.json();
  return { username: data.name, avatarUrl: data.picture ?? '' };
}

// ─── Search ───────────────────────────────────────────────────────────────────

const FIELDS = 'id,title,main_picture,media_type,status,num_chapters,num_episodes,mean';

export async function searchMAL(
  query: string,
  type: 'anime' | 'manga',
  token: string
): Promise<TrackerEntry[]> {
  const res = await fetch(
    `${MAL_API}/${type}?q=${encodeURIComponent(query)}&limit=12&fields=${FIELDS}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`MAL search failed: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).map(({ node }: any) => ({
    id: node.id,
    title: node.title,
    coverImage: node.main_picture?.medium ?? '',
    type: mapMALType(node.media_type),
    status: 'plan_to_read' as MediaStatus,
    progress: 0,
    score: node.mean,
    totalChapters: node.num_chapters ?? null,
    totalEpisodes: node.num_episodes ?? null,
    tracker: 'mal' as const,
  }));
}

// ─── Progress Update ──────────────────────────────────────────────────────────

export async function updateMALProgress(
  id: number,
  type: 'anime' | 'manga',
  progress: number,
  status: MediaStatus,
  token: string
): Promise<void> {
  const progressField = type === 'anime' ? 'num_watched_episodes' : 'num_chapters_read';
  const res = await fetch(`${MAL_API}/${type}/${id}/my_list_status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      [progressField]: String(progress),
      status: toMALStatus(status),
    }),
  });
  if (!res.ok) throw new Error(`MAL update failed: ${res.status}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapMALType(type: string): MediaType {
  if (['tv', 'ova', 'movie', 'special', 'ona', 'music'].includes(type)) return 'anime';
  if (type === 'manhwa') return 'manhwa';
  if (type === 'manhua') return 'manhua';
  if (type === 'novel' || type === 'light_novel') return 'novel';
  return 'manga';
}

function toMALStatus(status: MediaStatus): string {
  const map: Record<MediaStatus, string> = {
    watching: 'watching',
    reading: 'reading',
    completed: 'completed',
    on_hold: 'on_hold',
    dropped: 'dropped',
    plan_to_watch: 'plan_to_watch',
    plan_to_read: 'plan_to_read',
  };
  return map[status];
}
