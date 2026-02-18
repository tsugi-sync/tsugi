import { detectCurrentPage } from '@/lib/detectors';
import type { Message, DetectedMedia } from '@/lib/types';

export default defineContentScript({
  matches: [
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
    // Community manga
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
    const overlays = new OverlayManager();
    let lastKey: string | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg: Message) => {
      if (msg.type === 'SHOW_TOAST') {
        overlays.showToast(msg.payload.title, msg.payload.subtitle, msg.payload.type, msg.payload.duration);
      } else if (msg.type === 'SHOW_MODAL') {
        const { modalType, data } = msg.payload;
        if (modalType === 'link') {
          overlays.showModal(
            '📖 Track this manga?',
            `<div><b>${data.title}</b> · Chapter ${data.progress}</div>`,
            () => chrome.runtime.sendMessage({ type: 'CONFIRM_TRACKING', payload: { platformKey: data.platformKey, confirmed: true } }),
            () => chrome.runtime.sendMessage({ type: 'CONFIRM_TRACKING', payload: { platformKey: data.platformKey, confirmed: false } })
          );
        }
      }
    });

    async function tryDetect() {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (!resp?.success || (resp.data.activeTrackers?.length ?? 0) === 0) {
        overlays.setFab(null, () => { });
        return;
      }

      const detected = detectCurrentPage();
      if (!detected) {
        overlays.setFab(null, () => { });
        return;
      }

      console.log(`[Tsugi] Detected: ${detected.title} (${detected.type}) - Ch/Ep: ${detected.progress}`);

      const key = `${detected.platform}:${detected.title}:${detected.progress}`;
      if (key === lastKey) return;
      lastKey = key;

      chrome.runtime.sendMessage({
        type: 'MEDIA_DETECTED',
        payload: { ...detected, hostname: window.location.hostname }
      }).catch(() => { });

      // Show FAB for quick confirmation
      overlays.setFab(detected, () => {
        const platformKey = `${detected.platform}:${detected.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
        chrome.runtime.sendMessage({ type: 'SYNC_PROGRESS', payload: { platformKey } });
        overlays.showToast('Tsugi', `✓ Synced: ${detected.title} Ch.${detected.progress}`, 'success');
        overlays.setFab(null, () => { }); // Hide after click
      });
    }

    function scheduledDetect() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryDetect, 800);
    }

    tryDetect();
    const observer = new MutationObserver(scheduledDetect);
    observer.observe(document.body, { childList: true, subtree: true });

    // Scenario 1: Intercept clicks on chapter links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const text = (anchor.textContent || '').trim();
      // Heuristic: looks like "Chapter X" or "Ch. X"
      if (text.match(/^(?:Chapter|Ch\.)\s*\d+/i)) {
        console.log('[Tsugi] Potential Chapter click:', text);
        // More logic can be added here to block navigation if needed
      }
    }, true);
  },
});

/**
 * OverlayManager handles all UI elements injected into the host page.
 */
class OverlayManager {
  private container: HTMLElement;
  private shadow: ShadowRoot;
  private toastContainer: HTMLElement;
  private modalContainer: HTMLElement;
  private fabContainer: HTMLElement;

  constructor() {
    this.container = document.createElement('tsugi-overlay');
    this.container.style.cssText = 'all: initial; pointer-events: none;';
    this.shadow = this.container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --accent: #7c3aed;
        --bg: #111122;
        --bg-dark: #0d0d14;
        --border: #1e1e2e;
        --text: #f0f0fb;
        --text-muted: #a1a1b8;
        --success: #16a34a;
        --font-body: 'DM Sans', sans-serif;
        --font-header: 'Syne', sans-serif;
        
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
      }

      .toast-area {
        position: fixed;
        top: 80px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: flex-end;
        pointer-events: auto;
        z-index: 2147483647;
      }

      .toast {
        background: var(--bg);
        border: 1px solid var(--border);
        border-left: 4px solid var(--accent);
        border-radius: 12px;
        padding: 12px 16px;
        color: var(--text);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        min-width: 240px;
        animation: slideIn 0.3s ease-out;
        font-family: var(--font-body);
      }

      @keyframes slideIn {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .fab-area {
        position: fixed;
        top: 24px;
        right: 24px;
        pointer-events: auto;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 2147483647;
      }

      .fab {
        background: rgba(13, 13, 20, 0.95);
        backdrop-filter: blur(24px);
        border: 1px solid var(--accent-light, #2e2e4e);
        border-radius: 12px;
        padding: 10px 20px;
        color: var(--text);
        box-shadow: 0 16px 48px rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        gap: 18px;
        cursor: pointer;
        font-family: var(--font-body);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: -0.01em;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        min-width: 320px;
      }

      .fab:hover {
        background: var(--bg);
        border-color: var(--accent);
        transform: scale(1.04) translateY(-2px);
        box-shadow: 0 16px 48px rgba(124, 58, 237, 0.2);
      }

      .fab .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-right: 16px;
        border-right: 1px solid rgba(255,255,255,0.1);
        color: var(--accent);
        font-family: var(--font-header);
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.12em;
      }

      .fab .close-btn {
        margin-left: auto;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;
        transition: all 0.2s ease;
      }

      .fab .close-btn:hover {
        opacity: 1;
        background: rgba(255,255,255,0.1);
        color: var(--accent);
      }

      .modal-area {
        position: absolute;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }

      .modal-area.active { display: flex; }

      .modal {
        background: var(--bg-dark);
        border: 1px solid var(--border);
        border-radius: 16px;
        width: 380px;
        padding: 24px;
        color: var(--text);
        font-family: var(--font-body);
      }

      .btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-family: var(--font-header);
        font-weight: 700;
        cursor: pointer;
      }

      .btn-primary { background: var(--accent); color: #fff; }
      .btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
    `;
    this.shadow.appendChild(style);

    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-area';
    this.shadow.appendChild(this.toastContainer);

    this.fabContainer = document.createElement('div');
    this.fabContainer.className = 'fab-area';
    this.shadow.appendChild(this.fabContainer);

    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal-area';
    this.shadow.appendChild(this.modalContainer);

    document.documentElement.appendChild(this.container);
  }

  showToast(title: string, msg: string, type: string = 'info', duration: number = 8000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.minWidth = '280px';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <img src="${chrome.runtime.getURL('tsugi-icon-16.png')}" style="width:14px;height:14px" />
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.6;font-weight:800">Tsugi</div>
      </div>
      <div style="font-weight:700;font-size:14px">${title}</div>
      <div style="font-size:12px;opacity:0.8;margin-top:2px">${msg}</div>
    `;
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  setFab(media: DetectedMedia | null, onConfirm: () => void) {
    this.fabContainer.innerHTML = '';
    if (!media) return;
    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.style.animation = 'slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    fab.innerHTML = `
      <div class="brand">
        <img src="${chrome.runtime.getURL('tsugi-icon-32.png')}" style="width:20px;height:20px" />
        <span>Tsugi</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
        <span style="opacity:0.6;font-size:10px;text-transform:uppercase;letter-spacing:0.06em">Currently Reading</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${media.title}</span>
        <span style="font-size:11px;opacity:0.8;font-weight:600">Ch. ${media.progress}</span>
      </div>
      <div class="close-btn" title="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
    `;
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      onConfirm();
    });
    fab.querySelector('.close-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fabContainer.innerHTML = '';
    });
    this.fabContainer.appendChild(fab);
  }

  showModal(title: string, content: string, onConfirm: () => void, onCancel?: () => void) {
    this.modalContainer.innerHTML = '';
    this.modalContainer.classList.add('active');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div style="font-size:20px;font-weight:800;margin-bottom:12px">${title}</div>
      <div>${content}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px">
        <button class="btn btn-ghost" id="m-cancel">Skip</button>
        <button class="btn btn-primary" id="m-confirm">Track & Read</button>
      </div>
    `;
    modal.querySelector('#m-confirm')!.addEventListener('click', () => { this.modalContainer.classList.remove('active'); onConfirm(); });
    modal.querySelector('#m-cancel')!.addEventListener('click', () => { this.modalContainer.classList.remove('active'); if (onCancel) onCancel(); });
    this.modalContainer.appendChild(modal);
  }
}
