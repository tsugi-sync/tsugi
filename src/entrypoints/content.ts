import { detectCurrentPage } from '@/lib/detectors';
import type { Message } from '@/lib/types';

export default defineContentScript({
  matches: [
    // Piracy anime
    // Piracy anime
    '*://*.zoro.to/*',
    '*://*.aniwatch.to/*',
    '*://*.aniwatchtv.to/*',
    '*://*.9anime.to/*',
    '*://*.9anime.me/*',
    '*://*.aniwave.to/*',
    '*://*.gogoanime.me/*',
    '*://*.gogoanime.vc/*',
    '*://*.animesuge.to/*',
    // Legal anime
    '*://*.crunchyroll.com/*',
    '*://*.netflix.com/*',
    // Piracy manga
    '*://*.mangabat.com/*',
    '*://*.mangakakalot.com/*',
    '*://*.chapmanganato.to/*',
    '*://*.tcbscans.com/*',
    // Legal manga
    '*://*.mangadex.org/*',
    '*://*.webtoons.com/*',
    '*://mangaplus.shueisha.co.jp/*',
    // Community manga (Aidoku)
    '*://*.promanga.net/*', '*://*.silentquill.net/*', '*://*.batcave.biz/*', '*://*.comix.to/*', '*://*.flamecomics.xyz/*', '*://*.flamecomics.com/*',
    '*://*.hivetoons.org/*', '*://*.manga.madokami.al/*', '*://*.magustoon.org/*', '*://*.mangabats.com/*', '*://*.mangadistrict.com/*', '*://*.mangago.me/*',
    '*://*.mangakakalot.gg/*', '*://*.manganato.gg/*', '*://*.nelomanga.net/*', '*://*.mangaread.org/*', '*://*.mangasect.net/*', '*://*.mangatx.cc/*',
    '*://*.manhuagold.top/*', '*://*.manhuaplus.org/*', '*://*.manhwax.top/*', '*://*.novelbuddy.com/*', '*://*.nyxscans.com/*', '*://*.qiscans.org/*',
    '*://*.readcomiconline.li/*', '*://*.rizzfables.com/*', '*://*.tcbonepiecechapters.com/*', '*://*.toonily.com/*', '*://*.toonily.me/*', '*://*.vortexscans.org/*',
    '*://*.webtoon.xyz/*', '*://*.weebcentral.com/*', '*://*.mangafire.to/*', '*://*.nhentai.net/*', '*://*.cubari.moe/*', '*://*.xbat.si/*',
    '*://*.kanzenin.info/*', '*://*.komiksin.net/*', '*://*.komiktap.info/*', '*://*.01.komiku.asia/*', '*://*.mangasusuku.com/*', '*://*.manhwalist02.site/*',
    '*://*.natsu.tv/*', '*://*.bigsolo.org/*', '*://*.sushiscan.net/*', '*://*.catharsisworld.dig-it.info/*', '*://*.eternalmangas.org/*', '*://*.flowermanga.net/*',
    '*://*.mangalivre.tv/*', '*://*.hentailib.me/*', '*://*.mangalib.me/*', '*://*.ranobelib.me/*', '*://*.slashlib.me/*', '*://*.mangaworld.mx/*',
    '*://*.mangaworld.net/*', '*://*.comic-action.com/*', '*://*.comic-days.com/*', '*://*.manga.io.vn/*', '*://*.manga1000.top/*', '*://*.mangamura.net/*',
    '*://*.manga.nicovideo.jp/*', '*://*.raw1001.net/*', '*://*.rawfree.at/*', '*://*.rawkuma.net/*', '*://*.rawkuro.net/*', '*://*.rawotaku.com/*',
    '*://*.shonenjumpplus.com/*', '*://*.go-manga.com/*', '*://*.pretty-frank.com/*', '*://*.up-manga.com/*', '*://*.cmangax12.com/*', '*://*.cuutruyen.net/*',
    '*://*.dilib.vn/*', '*://*.foxtruyen2.com/*', '*://*.nettruyenviet1.com/*', '*://*.manhua3q.com/*', '*://*.truyenqqno.com/*', '*://*.truyenqq.online/*',
    '*://*.zettruyen.space/*', '*://*.baozimh.com/*', '*://*.bilimanga.net/*', '*://*.boylove.cc/*', '*://*.2026copy.com/*', '*://*.godamh.com/*',
    '*://*.happymh.com/*', '*://*.mangabz.com/*', '*://*.manhuagui.com/*', '*://*.mycomic.com/*', '*://*.manhuabika.com/*', '*://*.manga2026.com/*',
    '*://*.wnacg.com/*', '*://*.zaimanhua.com/*',
  ],
  main() {
    let lastKey: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function tryDetect() {
      const detected = detectCurrentPage();
      if (!detected) return;

      console.log(`[Tsugi] Detected: ${detected.title} (${detected.type}) - Ch/Ep: ${detected.progress}`);

      const key = `${detected.platform}:${detected.title}:${detected.progress}`;
      if (key === lastKey) return;
      lastKey = key;

      chrome.runtime.sendMessage({
        type: 'MEDIA_DETECTED',
        payload: { ...detected, hostname: window.location.hostname }
      }).catch(() => {
        // Background may not be ready yet — ignore
      });
    }

    // Debounced detect to avoid firing on every tiny DOM change
    function scheduledDetect() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryDetect, 800);
    }

    // Initial detect
    tryDetect();

    // Watch for SPA navigation & DOM updates
    const observer = new MutationObserver(scheduledDetect);
    observer.observe(document.body, { childList: true, subtree: true });
  },
});
