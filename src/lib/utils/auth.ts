import type { TrackerType, TrackerAuth } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/utils/storage';
import { refreshMALToken } from '@/lib/trackers/mal';
import { refreshBangumiToken } from '@/lib/trackers/bangumi';
import { exchangeShikimoriCode } from '@/lib/trackers/shikimori';

/**
 * Ensures a tracker has a valid access token, refreshing if necessary.
 * Returns the valid access token.
 */
export async function ensureValidToken(tracker: TrackerType): Promise<string> {
    const settings = await getSettings();
    const auth = settings.auth[tracker];

    if (!auth) {
        throw new Error(`Not authenticated with ${tracker}`);
    }

    // If no expiration info or not expired, return as is
    // Buffer of 60 seconds
    if (!auth.expiresAt || auth.expiresAt > Date.now() + 60000) {
        return auth.accessToken;
    }

    if (!auth.refreshToken) {
        throw new Error(`Token expired for ${tracker} and no refresh token available`);
    }

    console.log(`[Tsugi] Refreshing token for ${tracker}...`);

    let newAuth: TrackerAuth;
    try {
        if (tracker === 'mal') {
            newAuth = await refreshMALToken(auth.refreshToken);
        } else if (tracker === 'bangumi') {
            newAuth = await refreshBangumiToken(auth.refreshToken);
        } else if (tracker === 'shikimori') {
            // Shikimori uses the same exchange function with grant_type: refresh_token
            newAuth = await refreshShikimoriToken(auth.refreshToken);
        } else {
            throw new Error(`Token refresh not implemented for ${tracker}`);
        }

        // Preserve user info if not returned by refresh
        const updatedAuth = {
            ...auth,
            ...newAuth,
            username: newAuth.username ?? auth.username,
            avatarUrl: newAuth.avatarUrl ?? auth.avatarUrl,
        };

        await saveSettings({
            auth: { ...settings.auth, [tracker]: updatedAuth },
        });

        return updatedAuth.accessToken;
    } catch (err) {
        console.error(`[Tsugi] Failed to refresh ${tracker} token:`, err);
        throw err;
    }
}

async function refreshShikimoriToken(refreshToken: string): Promise<TrackerAuth> {
    // Shikimori refresh is similar to code exchange
    const { SHIKIMORI_CLIENT_ID, SHIKIMORI_CLIENT_SECRET } = await import('@/lib/trackers/shikimori');
    const res = await fetch('https://shikimori.one/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Tsugi Browser Extension' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: SHIKIMORI_CLIENT_ID,
            client_secret: SHIKIMORI_CLIENT_SECRET,
            refresh_token: refreshToken,
        }),
    });
    if (!res.ok) throw new Error(`Shikimori refresh failed: ${res.status}`);
    const data = await res.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
}
