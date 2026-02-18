import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tsugi - Your Watch List',
    description: 'Track anime and manga across any platform and sync to MAL, AniList, Shikimori, Bangumi',
    version: '0.1.0',
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'identity',
    ],
    icons: {
      16: '/tsugi-icon-16.png',
      32: '/tsugi-icon-32.png',
      48: '/tsugi-icon-48.png',
      128: '/tsugi-icon-128.png',
    },
    web_accessible_resources: [
      {
        resources: ['*.png', '*.svg'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_icon: {
        16: '/tsugi-icon-16.png',
        32: '/tsugi-icon-32.png',
      },
      default_title: 'Tsugi - Your Watch List',
    },
    host_permissions: [
      // Tracker APIs
      'https://api.myanimelist.net/*',
      'https://myanimelist.net/*',
      'https://graphql.anilist.co/*',
      'https://anilist.co/*',
      'https://shikimori.one/*',
      'https://api.bgm.tv/*',
      'https://bgm.tv/*',
      // Community anime
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
      '*://*.funimation.com/*',
      '*://*.hidive.com/*',
      // Community manga
      '*://*.mangabat.com/*',
      '*://*.mangakakalot.com/*',
      '*://*.chapmanganato.to/*',
      '*://*.tcbscans.com/*',
      '*://*.tcbonepiecechapters.com/*',
      // Community manga (Aidoku)
      // Aidoku Community Sources
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
      // Legal manga
      '*://*.mangadex.org/*',
      '*://*.webtoons.com/*',
      '*://mangaplus.shueisha.co.jp/*',
    ],
  },
});
