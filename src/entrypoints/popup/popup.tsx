import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { TrackerEntry, TrackerType, AppSettings, TrackedItem, PlatformType, MediaType, MediaStatus } from '@/lib/types';
import { PLATFORM_LABELS, ANIME_PLATFORMS, MANGA_PLATFORMS } from '@/lib/migrations/index';
import { slugify } from '@/lib/utils/storage';

// ─── Messaging ────────────────────────────────────────────────────────────────

function msg<T = null>(message: any): Promise<T> {
  return chrome.runtime.sendMessage(message).then((r) => {
    if (!r?.success) throw new Error(r?.error ?? 'Unknown error');
    return r.data as T;
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'home' | 'search' | 'migrate' | 'settings' | 'login';

const TRACKER_COLORS: Record<TrackerType, string> = {
  mal: '#2e51a2',
  anilist: '#02a9ff',
  shikimori: '#2e7d32',
  bangumi: '#f09199',
};

const TRACKER_LABELS: Record<TrackerType, string> = {
  mal: 'MyAnimeList',
  anilist: 'AniList',
  shikimori: 'Shikimori',
  bangumi: 'Bangumi',
};

// ─── Shared Components ────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div className={`pill-toggle ${on ? 'active' : ''}`} onClick={onChange}>
      <div className="toggle-thumb" />
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="badge" style={{ color, borderColor: `${color}44`, background: `${color}15` }}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <div className="ring-loader" />
    </div>
  );
}

function Section({ title, children, isLive }: { title: string; children: React.ReactNode; isLive?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="settings-section-header">
        {isLive && <span className="live-indicator" />}
        {title}
        <div className="section-line" />
      </div>
      {children}
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="view-header">
      <button onClick={onBack} className="migrate-btn" style={{ opacity: 1, visibility: 'visible', fontSize: 16 }}>←</button>
      <span className="header-title">{title}</span>
    </div>
  );
}

// ─── Login View ───────────────────────────────────────────────────────────────

function LoginView({ settings, onBack, onAuthSuccess }: {
  settings: AppSettings;
  onBack: () => void;
  onAuthSuccess: () => void;
}) {
  const [loading, setLoading] = useState<TrackerType | null>(null);
  const [error, setError] = useState('');

  async function handleAuth(tracker: TrackerType) {
    setLoading(tracker);
    setError('');
    try {
      await msg({ type: 'INITIATE_AUTH', payload: { tracker } });
      onAuthSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleLogout(tracker: TrackerType) {
    await msg({ type: 'LOGOUT', payload: { tracker } });
    onAuthSuccess();
  }

  return (
    <div className="view-container">
      <Header title="Accounts" onBack={onBack} />
      <div className="scroll-area">
        {error && <div className="error-banner">{error}</div>}
        <p className="status-text" style={{ padding: '8px 4px 16px' }}>Sign in to sync your progress across trackers.</p>

        {(['mal', 'anilist', 'shikimori', 'bangumi'] as TrackerType[]).map((tracker) => {
          const auth = settings.auth[tracker];
          const isLoading = loading === tracker;
          return (
            <div key={tracker} className="settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="dot-indicator" style={{ background: TRACKER_COLORS[tracker] }} />
                <div>
                  <div className="track-title" style={{ fontSize: 14 }}>{TRACKER_LABELS[tracker]}</div>
                  {auth?.username && (
                    <div className="status-text" style={{ marginTop: 1 }}>@{auth.username}</div>
                  )}
                </div>
              </div>
              {auth ? (
                <button onClick={() => handleLogout(tracker)} className="migrate-btn" style={{ opacity: 1, visibility: 'visible' }}>
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => handleAuth(tracker)}
                  disabled={!!loading}
                  className="btn-accent"
                  style={{ background: TRACKER_COLORS[tracker], padding: '6px 14px', fontSize: 12 }}
                >
                  {isLoading ? '...' : 'Connect'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Search View ──────────────────────────────────────────────────────────────

function SearchView({ settings, platformKey, initialQuery, onBack }: {
  settings: AppSettings;
  platformKey: string | null;
  initialQuery: string | null;
  onBack: () => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tracker, setTracker] = useState<TrackerType>(
    settings.defaultTracker ?? settings.activeTrackers[0] ?? 'mal'
  );
  const [mediaType, setMediaType] = useState<MediaType>('manga');
  const [status, setStatus] = useState<MediaStatus>('reading');

  const authedTrackers = settings.activeTrackers.filter(t => !!settings.auth[t]);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await msg<TrackerEntry[]>({
        type: 'SEARCH_TRACKER',
        payload: { tracker, query, mediaType },
      });
      setResults(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-trigger search if initial query provided
  useEffect(() => {
    if (initialQuery) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function link(entry: TrackerEntry) {
    // Standardize key to match detected prefix
    const key = platformKey || `generic_${mediaType}:${slugify(entry.title)}`;
    await msg({ type: 'LINK_ENTRY', payload: { platformKey: key, tracker, entryId: entry.id, status } });
    onBack();
  }

  if (authedTrackers.length === 0) {
    return (
      <div className="view-container">
        <Header title="Search" onBack={onBack} />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No trackers connected.<br />Go to Settings → Accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="search-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onBack} className="migrate-btn" style={{ opacity: 1, visibility: 'visible' }}>←</button>
          <input
            className="full-bleed-search" autoFocus placeholder="Search titles..."
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>

        <div className="pill-list" style={{ padding: '0 0 8px' }}>
          {(['anime', 'manga'] as MediaType[]).map(t => (
            <button key={t} onClick={() => setMediaType(t)}
              className={`search-pill ${mediaType === t ? 'active' : ''}`}>
              {t === 'anime' ? '▶ Anime' : '📖 Manga'}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />
          {authedTrackers.map(t => (
            <button key={t} onClick={() => setTracker(t)}
              className={`search-pill ${tracker === t ? 'active' : ''}`}>
              {TRACKER_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="status-text" style={{ padding: '4px 0 8px' }}>INITIAL STATUS:</div>
        <div className="pill-list" style={{ padding: '0 0 12px' }}>
          {(['watching', 'reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'] as MediaStatus[]).map(s => {
            // Filter out watching for manga, reading for anime if needed, but let's just make it context-aware
            if (mediaType === 'manga' && s === 'watching') return null;
            if (mediaType === 'anime' && s === 'reading') return null;
            return (
              <button key={s} onClick={() => setStatus(s)}
                className={`search-pill ${status === s ? 'active' : ''}`}
                style={{ fontSize: 10, padding: '4px 8px' }}>
                {s.toUpperCase().replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '8px 16px' }}>
        {loading && <Spinner />}
        {!loading && results.map(entry => (
          <div key={entry.id} className="track-card" style={{ height: 72, cursor: 'pointer' }} onClick={() => link(entry)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              {entry.coverImage
                ? <img src={entry.coverImage} alt="" className="cover-art" style={{ width: 42, height: 60 }} />
                : <div className="cover-art" style={{ width: 42, height: 60, background: 'var(--bg-surface-hover)' }} />
              }
              <div className="track-info">
                <div className="track-title">{entry.title}</div>
                <div className="status-text">
                  {entry.type} · {entry.totalChapters ?? entry.totalEpisodes ?? '?'} {entry.type === 'anime' ? 'eps' : 'ch'}
                  {entry.score ? ` · ★ ${entry.score.toFixed(1)}` : ''}
                </div>
              </div>
            </div>
            <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', padding: '4px 10px' }}>Link</span>
          </div>
        ))}
        {!loading && results.length === 0 && query && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No results found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Migrate View ─────────────────────────────────────────────────────────────

function MigrateView({ item, onBack, onDone }: {
  item: TrackedItem;
  onBack: () => void;
  onDone: () => void;
}) {
  const [toPlatform, setToPlatform] = useState<PlatformType | ''>('');
  const [toPlatformTitle, setToPlatformTitle] = useState(item.platformTitle);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const platformOptions = item.type === 'anime' ? ANIME_PLATFORMS : [...ANIME_PLATFORMS, ...MANGA_PLATFORMS];

  async function handleMigrate() {
    if (!toPlatform || !toPlatformTitle.trim()) return;
    setLoading(true);
    try {
      await msg({
        type: 'MIGRATE_PLATFORM',
        payload: {
          fromPlatformKey: item.platformKey,
          toPlatform,
          toPlatformTitle: toPlatformTitle.trim(),
          reason: reason.trim() || undefined,
        },
      });
      onDone();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view-container">
      <Header title="Migrate Entry" onBack={onBack} />
      <div className="scroll-area">
        <div className="pipeline-flow">
          {/* From Node */}
          <div className="pipeline-node faded">
            <div className="status-text" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Source</div>
            <div className="track-title">{item.platformTitle}</div>
            <div className="status-text">{PLATFORM_LABELS[item.platform]} · {item.type}</div>
          </div>

          <div className="pipeline-connector">
            <div style={{ height: 20, width: 1, background: 'var(--text-ghost)', marginBottom: 4 }} />
            <div style={{ fontSize: 14 }}>⇄</div>
            <div style={{ height: 20, width: 1, background: 'var(--border-subtle)', marginTop: 4 }} />
          </div>

          {/* To Node */}
          <div className="pipeline-node">
            <div className="status-text" style={{ marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)' }}>Destination</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select
                className="full-bleed-search"
                style={{ padding: '8px 12px', fontSize: 14 }}
                value={toPlatform}
                onChange={e => setToPlatform(e.target.value as PlatformType)}
              >
                <option value="">Select platform...</option>
                {platformOptions
                  .filter(p => p !== item.platform)
                  .map(p => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
              </select>

              <input
                className="full-bleed-search"
                style={{ padding: '8px 12px', fontSize: 14 }}
                value={toPlatformTitle}
                onChange={e => setToPlatformTitle(e.target.value)}
                placeholder="Title on new platform..."
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div className="status-text" style={{ marginBottom: 8 }}>Reason (optional)</div>
          <input
            className="full-bleed-search"
            style={{ padding: '8px 12px', fontSize: 13 }}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Broken links, better quality..."
          />
        </div>
      </div>

      <div className="sticky-bottom">
        <button
          onClick={handleMigrate}
          disabled={!toPlatform || !toPlatformTitle || loading}
          className="btn-accent"
          style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 15 }}
        >
          {loading ? 'Moving...' : 'Migrate & Archive'}
        </button>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView({ settings, onBack, onOpenLogin, onUpdate }: {
  settings: AppSettings;
  onBack: () => void;
  onOpenLogin: () => void;
  onUpdate: () => void;
}) {
  async function toggle(key: 'updateAfterReading' | 'autoSyncHistory') {
    await msg({ type: 'SAVE_SETTINGS', payload: { [key]: !settings[key] } });
    onUpdate();
  }

  async function setDefault(tracker: TrackerType) {
    const next = settings.defaultTracker === tracker ? null : tracker;
    await msg({ type: 'SAVE_SETTINGS', payload: { defaultTracker: next } });
    onUpdate();
  }

  const authedTrackers = (['mal', 'anilist', 'shikimori', 'bangumi'] as TrackerType[])
    .filter(t => !!settings.auth[t]);

  return (
    <div className="view-container">
      <Header title="Settings" onBack={onBack} />
      <div className="scroll-area">
        <Section title="ACCOUNTS">
          {authedTrackers.length === 0 ? (
            <div style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No trackers connected.</div>
          ) : (
            authedTrackers.map(t => (
              <div key={t} className="settings-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="dot-indicator" style={{ background: TRACKER_COLORS[t] }} />
                  <div>
                    <div className="track-title" style={{ fontSize: 14 }}>{TRACKER_LABELS[t]}</div>
                    {settings.auth[t]?.username && (
                      <div className="status-text" style={{ marginTop: 1 }}>@{settings.auth[t]!.username}</div>
                    )}
                  </div>
                </div>
                <button onClick={() => setDefault(t)} className={`search-pill ${settings.defaultTracker === t ? 'active' : ''}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                  {settings.defaultTracker === t ? '★ Default' : 'Set default'}
                </button>
              </div>
            ))
          )}
          <div style={{ padding: '8px 20px' }}>
            <button onClick={onOpenLogin} className="migrate-btn" style={{ opacity: 1, visibility: 'visible', width: '100%', borderStyle: 'dashed' }}>
              {authedTrackers.length === 0 ? '+ Connect a tracker' : '+ Manage accounts'}
            </button>
          </div>
        </Section>

        <Section title="PREFERENCES">
          <div className="settings-row">
            <div style={{ flex: 1 }}>
              <div className="track-title" style={{ fontSize: 13 }}>Update After Reading</div>
              <div className="status-text">Auto-sync progress when you finish a chapter/episode</div>
            </div>
            <Toggle on={settings.updateAfterReading} onChange={() => toggle('updateAfterReading')} />
          </div>
          <div className="settings-row">
            <div style={{ flex: 1 }}>
              <div className="track-title" style={{ fontSize: 13 }}>Auto Sync History</div>
              <div className="status-text">Pull progress from tracker into local history</div>
            </div>
            <Toggle on={settings.autoSyncHistory} onChange={() => toggle('autoSyncHistory')} />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────────

function HomeView({ settings, trackedItems, currentKey, onSearch, onSettings, onMigrate, onUpdate }: {
  settings: AppSettings;
  trackedItems: TrackedItem[];
  currentKey: string | null;
  onSearch: (platformKey?: string, title?: string) => void;
  onSettings: () => void;
  onMigrate: (item: TrackedItem) => void;
  onUpdate: () => void;
}) {
  const hasAuth = settings.activeTrackers.length > 0 && Object.keys(settings.auth).length > 0;

  const currentlyViewing = trackedItems.find(item => item.platformKey === currentKey);
  const animeHistory = trackedItems.filter(item =>
    item.type === 'anime' &&
    item !== currentlyViewing &&
    Object.keys(item.trackerIds).length > 0
  );
  const mangaHistory = trackedItems.filter(item =>
    item.type !== 'anime' &&
    item !== currentlyViewing &&
    Object.keys(item.trackerIds).length > 0
  );

  const renderItem = (item: TrackedItem, isLive = false) => {
    const isUnlinked = Object.keys(item.trackerIds).length === 0;
    const progressLabel = `${item.type === 'anime' ? 'EP' : 'CH'} ${item.lastProgress}`;

    return (
      <div key={item.platformKey} className={`track-card ${isLive ? 'active' : ''}`}>
        <div className="track-info">
          <div className="track-title">{item.platformTitle}</div>
          <div className="track-meta">
            <Badge label={PLATFORM_LABELS[item.platform]} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>•</span>
            <span style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 700 }}>{progressLabel}</span>
            {!isUnlinked && (
              <div className="status-select-wrapper">
                <select
                  className="status-select"
                  value={item.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value as MediaStatus;
                    const tracker = Object.keys(item.trackerIds)[0] as TrackerType;
                    await msg({ type: 'LINK_ENTRY', payload: { platformKey: item.platformKey, tracker, entryId: item.trackerIds[tracker]!, status: newStatus } });
                    onUpdate();
                  }}
                >
                  <option value="watching">WATCHING</option>
                  <option value="reading">READING</option>
                  <option value="completed">COMPLETED</option>
                  <option value="on_hold">ON HOLD</option>
                  <option value="dropped">DROPPED</option>
                  <option value="plan_to_read">PLAN TO READ</option>
                </select>
              </div>
            )}
            {Object.keys(item.trackerIds).map(t => (
              <div key={t} className="dot-indicator" style={{ background: TRACKER_COLORS[t as TrackerType] }} title={TRACKER_LABELS[t as TrackerType]} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isUnlinked ? (
            <button onClick={() => onSearch(item.platformKey, item.platformTitle)} className="btn-accent" style={{ padding: '4px 10px', fontSize: 10, background: 'var(--accent)' }}>
              Link
            </button>
          ) : (
            <button onClick={() => onMigrate(item)} className="migrate-btn" title="Migrate">
              ⇄
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="app-header">
        <div className="logo-container" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <img src="/app-icon.svg" alt="" style={{ width: 32, height: 32 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="logo-text" style={{ fontSize: '18px', lineHeight: '1.2', marginBottom: '2px' }}>
              Tsugi
            </h1>
            <div className="status-text">
              {hasAuth
                ? `${settings.activeTrackers.map(t => TRACKER_LABELS[t]).join(' · ')}`
                : 'No trackers connected'}
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="migrate-btn" style={{ opacity: 1, visibility: 'visible' }}>⚙</button>
      </div>

      {/* No auth banner */}
      {!hasAuth && (
        <div className="error-banner" style={{ borderStyle: 'dashed', background: 'transparent' }}>
          Connect a tracker in Settings to start syncing.
        </div>
      )}

      {/* Active tracking list */}
      <div className="scroll-area">
        {currentlyViewing && (
          <Section title="CURRENTLY VIEWING" isLive>
            {renderItem(currentlyViewing, true)}
          </Section>
        )}

        {animeHistory.length > 0 && (
          <Section title="ANIME">
            {animeHistory.map(item => renderItem(item))}
          </Section>
        )}

        {mangaHistory.length > 0 && (
          <Section title="MANGA">
            {mangaHistory.map(item => renderItem(item))}
          </Section>
        )}

        {animeHistory.length === 0 && mangaHistory.length === 0 && !currentlyViewing && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nothing tracked yet.<br />
            <span style={{ fontSize: 11, opacity: 0.6 }}>Visit a manga/anime page to start.</span>
          </div>
        )}
      </div>

      {/* Add button sticky */}
      <div className="sticky-bottom">
        <button onClick={() => onSearch()} className="btn-accent" style={{ width: '100%', height: 48, fontSize: 15 }}>
          + Search & Track New Title
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [migrateTarget, setMigrateTarget] = useState<TrackedItem | null>(null);
  const [searchCtx, setSearchCtx] = useState<{ platformKey: string | null, query: string | null } | null>(null);
  const [currentlyViewingKey, setCurrentlyViewingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [s, items] = await Promise.all([
      msg<AppSettings>({ type: 'GET_SETTINGS' }),
      msg<{ active: TrackedItem[]; archived: TrackedItem[]; currentlyViewingKey: string | null }>({ type: 'GET_TRACKED_ITEMS' }),
    ]);
    setSettings(s);
    setTrackedItems(items.active);
    setCurrentlyViewingKey(items.currentlyViewingKey);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!settings) return (
    <div className="view-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Spinner />
    </div>
  );

  if (view === 'login') return (
    <LoginView settings={settings} onBack={() => { setView('settings'); loadAll(); }} onAuthSuccess={loadAll} />
  );
  if (view === 'settings') return (
    <SettingsView settings={settings} onBack={() => setView('home')} onOpenLogin={() => setView('login')} onUpdate={loadAll} />
  );
  if (view === 'search') return (
    <SearchView
      settings={settings}
      platformKey={searchCtx?.platformKey ?? null}
      initialQuery={searchCtx?.query ?? null}
      onBack={() => { setView('home'); loadAll(); }}
    />
  );
  if (view === 'migrate' && migrateTarget) return (
    <MigrateView item={migrateTarget} onBack={() => setView('home')} onDone={() => { setView('home'); loadAll(); }} />
  );

  return (
    <HomeView
      settings={settings}
      trackedItems={trackedItems}
      currentKey={currentlyViewingKey}
      onSearch={(key, title) => { setSearchCtx({ platformKey: key || null, query: title || null }); setView('search'); }}
      onSettings={() => setView('settings')}
      onMigrate={(item) => { setMigrateTarget(item); setView('migrate'); }}
      onUpdate={loadAll}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Inline styles removed. Using style.css

// ─── Mount ────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(<App />);
