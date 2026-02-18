/**
 * Detector registry — imports all platform detectors and exposes
 * `detectCurrentPage()` for use by the content script.
 *
 * ─── Adding a new detector ────────────────────────────────────────────────────
 * 1. Create a new file in `anime/` or `manga/` (or a new category folder).
 * 2. Export a `PlatformDetector` object from that file.
 * 3. Import it here and add it to `ALL_DETECTORS` in the appropriate position.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type { PlatformDetector } from './helpers';

// ─── Anime ────────────────────────────────────────────────────────────────────
import { zoroDetector, nineAnimeDetector, gogoanimeDetector, animesugeDetector } from './anime/community';
import { crunchyrollDetector, netflixDetector } from './anime/legal';
import { genericAnimeDetector } from './anime/generic';

// ─── Manga ────────────────────────────────────────────────────────────────────
import { mangaBatDetector, mangakakalotDetector, tcbScansDetector } from './manga/community';
import { mangaDexDetector, webtoonDetector, mangaplusDetector } from './manga/legal';
import { genericMangaDetector } from './manga/generic';

import type { DetectedMedia } from '@/lib/types';
import type { PlatformDetector } from './helpers';

// ─── Registry ─────────────────────────────────────────────────────────────────
// Order matters: specific detectors should come before generic fallbacks.

export const ALL_DETECTORS: PlatformDetector[] = [
  // Community anime (specific first)
  zoroDetector,
  nineAnimeDetector,
  gogoanimeDetector,
  animesugeDetector,
  // Legal anime
  crunchyrollDetector,
  netflixDetector,
  // Generic anime fallback (last among anime)
  genericAnimeDetector,
  // Community manga (specific first)
  mangaBatDetector,
  mangakakalotDetector,
  tcbScansDetector,
  // Legal manga
  mangaDexDetector,
  webtoonDetector,
  mangaplusDetector,
  // Generic manga fallback (last among manga)
  genericMangaDetector,
];

export function detectCurrentPage(): DetectedMedia | null {
  const url = location.href;
  for (const detector of ALL_DETECTORS) {
    if (detector.matches.some(re => re.test(url))) {
      try {
        return detector.detect();
      } catch (err) {
        console.warn(`[Tsugi] Detector "${detector.platform}" threw: `, err);
        return null;
      }
    }
  }
  return null;
}
