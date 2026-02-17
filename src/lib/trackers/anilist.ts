/**
 * AniList Tracker
 *
 * Docs: https://docs.anilist.co
 * Auth: OAuth2 implicit (token returned directly in redirect URL hash)
 *
 * TODO: Register a client at https://anilist.co/settings/developer
 *       Set redirect URI to: chrome.identity.getRedirectURL('anilist')
 *       Then replace ANILIST_CLIENT_ID below.
 */

import type { TrackerEntry, TrackerAuth, MediaStatus, MediaType } from '@/lib/types';

export const ANILIST_CLIENT_ID = import.meta.env.WXT_ANILIST_CLIENT_ID;
const ANILIST_API = 'https://graphql.anilist.co';
const ANILIST_AUTH = 'https://anilist.co/api/v2/oauth';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getAniListAuthUrl(): string {
  const redirectUri = chrome.identity.getRedirectURL();
  return `${ANILIST_AUTH}/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function parseAniListToken(redirectUrl: string): TrackerAuth {
  const hash = new URL(redirectUrl).hash.slice(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (!accessToken) throw new Error('No access token in AniList redirect');
  return {
    accessToken,
    expiresAt: Date.now() + Number(params.get('expires_in') ?? 0) * 1000,
  };
}

// ─── GraphQL Helper ───────────────────────────────────────────────────────────

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ─── User Info ────────────────────────────────────────────────────────────────

export async function getAniListUser(token: string): Promise<{ username: string; avatarUrl: string }> {
  const data = await gql<any>(
    `query { Viewer { name avatar { medium } } }`,
    {},
    token
  );
  return {
    username: data.Viewer.name,
    avatarUrl: data.Viewer.avatar?.medium ?? '',
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

const SEARCH_QUERY = `
  query ($search: String, $type: MediaType) {
    Page(perPage: 12) {
      media(search: $search, type: $type, sort: SEARCH_MATCH) {
        id
        title { romaji english native }
        coverImage { medium }
        type
        format
        status
        chapters
        episodes
        averageScore
      }
    }
  }
`;

export async function searchAniList(
  query: string,
  type: 'ANIME' | 'MANGA',
  token?: string
): Promise<TrackerEntry[]> {
  const data = await gql<any>(SEARCH_QUERY, { search: query, type }, token);
  return (data.Page.media ?? []).map((m: any) => ({
    id: m.id,
    title: m.title.english ?? m.title.romaji,
    coverImage: m.coverImage.medium,
    type: mapAniListFormat(m.format),
    status: 'plan_to_read' as MediaStatus,
    progress: 0,
    score: m.averageScore ? m.averageScore / 10 : undefined,
    totalChapters: m.chapters,
    totalEpisodes: m.episodes,
    tracker: 'anilist' as const,
  }));
}

// ─── Progress Update ──────────────────────────────────────────────────────────

const SAVE_MUTATION = `
  mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
    SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
      id progress status
    }
  }
`;

export async function updateAniListProgress(
  mediaId: number,
  progress: number,
  status: MediaStatus,
  token: string
): Promise<void> {
  await gql(SAVE_MUTATION, { mediaId, progress, status: toAniListStatus(status) }, token);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapAniListFormat(format: string): MediaType {
  if (['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'].includes(format)) return 'anime';
  if (format === 'MANHWA') return 'manhwa';
  if (format === 'MANHUA') return 'manhua';
  if (format === 'NOVEL') return 'novel';
  return 'manga';
}

function toAniListStatus(status: MediaStatus): string {
  const map: Record<MediaStatus, string> = {
    watching: 'CURRENT',
    reading: 'CURRENT',
    completed: 'COMPLETED',
    on_hold: 'PAUSED',
    dropped: 'DROPPED',
    plan_to_watch: 'PLANNING',
    plan_to_read: 'PLANNING',
  };
  return map[status];
}
