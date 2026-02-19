/**
 * Detector registry — imports all platform detectors and exposes
 * `detectCurrentPage()` for use by the content script.
 *
 * ─── Adding a new detector ────────────────────────────────────────────────────
 * 1. Create/edit a file in `anime/` or `manga/` (legal, community, or generic).
 * 2. Export a `PlatformDetector` object from that file.
 * 3. Import it here and add it to `ALL_DETECTORS` (specific before generic).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type { PlatformDetector } from './helpers';

// ─── Anime — Legal ────────────────────────────────────────────────────────────
import {
  crunchyrollDetector,
  netflixDetector,
  hidiveDetector,
  huluDetector,
  adnDetector,
  animeOnegaiDetector,
  animeOnsenDetector,
  bstationDetector,
  proxerDetector,
} from './anime/legal';

// ─── Anime — Community ────────────────────────────────────────────────────────
import {
  zoroDetector,
  hiAnimeDetector,
  nineAnimeDetector,
  gogoanimeDetector,
  animesugeDetector,
  kickAssAnimeDetector,
  animeKAIDetector,
  aniCrushDetector,
  an1meDetector,
  aniGoDetector,
  aniNexusDetector,
  aniXLDetector,
  kuudereDetector,
  miruroDetector,
  aniDreamDetector,
  anoBoyeDetector,
  animeHeavenDetector,
  animeIdDetector,
  animeKhorDetector,
  animeKODetector,
  animelonDetector,
  animeNoSubDetector,
  animeToastDetector,
  animeWhoDetector,
  animeXinDetector,
  animeAv1Detector,
  aniYanDetector,
  aniziumDetector,
  anizmDetector,
  animeWorldDetector,
  animeUnityDetector,
  animeflvDetector,
  jkanimeDetector,
  tioAnimeDetector,
  latanimeDetector,
  monosChinosDetector,
  betterAnimeDetector,
  animeFireDetector,
  animeSamaDetector,
  frAnimeDetector,
  frenchAnimeDetector,
  voirAnimeDetector,
  otakuFRDetector,
  animeOdcinkiDetector,
  frixySubsDetector,
  fumetsuDetector,
  docchiDetector,
  ogladajAnimeDetector,
  animeZoneDetector,
  desuOnlineDetector,
  shindenDetector,
  turkAnimeDetector,
  trAnimeizleDetector,
  witAnimeDetector,
  okAnimeDetector,
  animeGODetector,
  animeLibDetector,
  animeBuffDetector,
  sovetRomanticaDetector,
  animeVostDetector,
  anime365Detector,
  hdRezkaDetector,
  hinataSoulDetector,
  animesOnlineDetector,
  otakusTVDetector,
  toonAnimeDetector,
  topAnimesDetector,
  aniWorldDetector,
  bsToDetector,
  fireAnimeDetector,
  gojoDetector,
  kaguyaDetector,
  luciferDonghuaDetector,
  moeclipDetector,
  adkamiDetector,
} from './anime/community';

import { genericAnimeDetector } from './anime/generic';

// ─── Manga — Community ────────────────────────────────────────────────────────
import { mangaBatDetector, mangakakalotDetector, tcbScansDetector } from './manga/community';

// ─── Manga — Legal ────────────────────────────────────────────────────────────
import { mangaDexDetector, webtoonDetector, mangaplusDetector } from './manga/legal';

import { genericMangaDetector } from './manga/generic';

import type { DetectedMedia } from '@/lib/types';
import type { PlatformDetector } from './helpers';

// ─── Registry ─────────────────────────────────────────────────────────────────
// Order matters: specific detectors first, generic fallbacks last.

export const ALL_DETECTORS: PlatformDetector[] = [
  // ── Legal anime (specific) ────────────────────────────────────────────────
  crunchyrollDetector,
  netflixDetector,
  hidiveDetector,
  huluDetector,
  adnDetector,
  animeOnegaiDetector,
  animeOnsenDetector,
  bstationDetector,
  proxerDetector,
  // ── Community anime — .to watch pages ────────────────────────────────────
  zoroDetector,
  hiAnimeDetector,
  aniCrushDetector,
  an1meDetector,
  aniGoDetector,
  aniNexusDetector,
  aniXLDetector,
  kuudereDetector,
  miruroDetector,
  aniDreamDetector,
  anoBoyeDetector,
  animeKAIDetector,
  animeNoSubDetector,
  animeWhoDetector,
  aniziumDetector,
  fireAnimeDetector,
  gojoDetector,
  // ── Community anime — engine-specific ─────────────────────────────────────
  nineAnimeDetector,
  gogoanimeDetector,
  animesugeDetector,
  kickAssAnimeDetector,
  // ── Community anime — language/region ─────────────────────────────────────
  animeWorldDetector,     // IT
  animeUnityDetector,     // IT
  animeflvDetector,       // ES
  jkanimeDetector,        // ES
  tioAnimeDetector,       // ES
  latanimeDetector,       // ES
  monosChinosDetector,    // ES
  animeSamaDetector,      // FR
  frAnimeDetector,        // FR
  frenchAnimeDetector,    // FR
  voirAnimeDetector,      // FR
  otakuFRDetector,        // FR
  animeOdcinkiDetector,   // PL
  frixySubsDetector,      // PL
  fumetsuDetector,        // PL
  docchiDetector,         // PL
  ogladajAnimeDetector,   // PL
  animeZoneDetector,      // PL
  desuOnlineDetector,     // PL
  shindenDetector,        // PL
  turkAnimeDetector,      // TR
  trAnimeizleDetector,    // TR
  anizmDetector,          // TR
  witAnimeDetector,       // AR
  okAnimeDetector,        // AR
  animeGODetector,        // RU
  animeLibDetector,       // RU
  animeBuffDetector,      // RU
  sovetRomanticaDetector, // RU
  animeVostDetector,      // RU
  anime365Detector,       // RU
  hdRezkaDetector,        // RU
  betterAnimeDetector,    // PT/BR
  animeFireDetector,      // PT/BR
  hinataSoulDetector,     // PT/BR
  animesOnlineDetector,   // PT/BR
  aniWorldDetector,       // DE
  bsToDetector,           // DE
  animelonDetector,       // JP/EN
  // ── Community anime — misc ────────────────────────────────────────────────
  animeHeavenDetector,
  animeIdDetector,
  animeKhorDetector,
  animeKODetector,
  animeToastDetector,
  animeXinDetector,
  animeAv1Detector,
  aniYanDetector,
  otakusTVDetector,
  toonAnimeDetector,
  topAnimesDetector,
  kaguyaDetector,
  luciferDonghuaDetector,
  moeclipDetector,
  adkamiDetector,
  // ── Generic anime fallback (LAST) ─────────────────────────────────────────
  genericAnimeDetector,
  // ── Community manga (specific first) ─────────────────────────────────────
  mangaBatDetector,
  mangakakalotDetector,
  tcbScansDetector,
  // ── Legal manga ───────────────────────────────────────────────────────────
  mangaDexDetector,
  webtoonDetector,
  mangaplusDetector,
  // ── Generic manga fallback (LAST) ─────────────────────────────────────────
  genericMangaDetector,
];

export function detectCurrentPage(): DetectedMedia | null {
  const url = location.href;
  for (const detector of ALL_DETECTORS) {
    if (detector.matches.some(re => re.test(url))) {
      try {
        const result = detector.detect();
        if (result) return result;
        // detector matched URL but couldn't extract data — try next detector
      } catch (err) {
        console.warn(`[Tsugi] Detector "${detector.platform}" threw: `, err);
        // continue to next detector
      }
    }
  }
  return null;
}
