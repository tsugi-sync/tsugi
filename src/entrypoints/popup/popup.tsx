import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { isOfficial, getPlatformLabel } from '@/lib/utils/platforms';
import type { TrackerEntry, TrackerType, AppSettings, TrackedItem, PlatformType, MediaType, MediaStatus, MessageResponse, AidokuSource } from '@/lib/types';
import { ANIME_PLATFORMS, MANGA_PLATFORMS } from '@/lib/migrations/index';
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

const STATUS_CONFIG: Record<MediaStatus, { label: string; color: string }> = {
  watching: { label: 'Watching', color: '#3b82f6' },
  reading: { label: 'Reading', color: '#10b981' },
  completed: { label: 'Completed', color: '#10b981' },
  on_hold: { label: 'On Hold', color: '#f59e0b' },
  dropped: { label: 'Dropped', color: '#f43f5e' },
  plan_to_watch: { label: 'Planning', color: '#6b7280' },
  plan_to_read: { label: 'Planning', color: '#6b7280' },
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
    <div style={{ marginBottom: 16 }}>
      <div className="settings-section-header">
        {isLive && <span className="live-indicator" />}
        {title}
        <div className="section-line" />
      </div>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="view-header">
      <button onClick={onBack} className="btn-icon">←</button>
      <span className="header-title">{title}</span>
    </div>
  );
}

function PendingUpdatesBanner({ items, onSync }: { items: TrackedItem[], onSync: () => Promise<void> }) {
  const [dismissed, setDismissed] = useState(false);
  if (items.length === 0 || dismissed) return null;
  return (
    <div className="error-banner" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--text-primary)', marginBottom: 20, marginTop: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 4, letterSpacing: '0.05em', color: 'var(--accent)' }}>⚠ PENDING UPDATES</div>
          <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(i => (
                <div key={i.platformKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{i.platformTitle}</span>
                  <span style={{ flexShrink: 0, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>Ch. {i.pendingProgress?.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setDismissed(true)}
            className="btn-icon"
            title="Dismiss"
            style={{ fontSize: 11, padding: '4px 8px' }}
          >✕</button>
          <button
            onClick={async () => { await onSync(); setDismissed(true); }}
            className="btn-accent"
            style={{ padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}
          >Sync All</button>
        </div>
      </div>
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
      <div className="scroll-area" style={{ padding: 0 }}>
        {error && <div className="error-banner">{error}</div>}
        <p className="status-text" style={{ padding: '16px 16px 8px', fontSize: 13 }}>
          Sign in to sync your progress across trackers.
        </p>

        {(['mal', 'anilist', 'shikimori', 'bangumi'] as TrackerType[]).map((tracker) => {
          const auth = settings.auth[tracker];
          const isLoading = loading === tracker;
          const isSoon = tracker === 'shikimori' || tracker === 'bangumi';

          return (
            <div key={tracker} className="account-row" style={isSoon ? { opacity: 0.6 } : {}}>
              <div className="account-info">
                <div className="account-dot" style={{ background: TRACKER_COLORS[tracker] }} />
                <span className="account-name">{TRACKER_LABELS[tracker]}</span>
                {auth?.username && (
                  <span className="status-text" style={{ fontSize: 11, opacity: 0.6 }}>@{auth.username}</span>
                )}
                {isSoon && (
                  <span className="badge" style={{ fontSize: 9, padding: '2px 6px', marginLeft: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>SOON</span>
                )}
              </div>
              {auth ? (
                <button onClick={() => handleLogout(tracker)} className="btn-accent" style={{ width: 84, height: 32, fontSize: 11, background: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => !isSoon && handleAuth(tracker)}
                  disabled={!!loading || isSoon}
                  className="btn-accent btn-connect"
                  style={{
                    background: isSoon ? 'var(--bg-surface-hover)' : TRACKER_COLORS[tracker],
                    color: isSoon ? 'var(--text-muted)' : '#fff',
                    border: isSoon ? '1px solid var(--border-subtle)' : 'none',
                    cursor: isSoon ? 'default' : 'pointer'
                  }}
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

function SearchView({ settings, platformKey, initialQuery, initialMediaType, onBack }: {
  settings: AppSettings;
  platformKey: string | null;
  initialQuery: string | null;
  initialMediaType?: MediaType;
  onBack: () => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tracker, setTracker] = useState<TrackerType>(
    settings.defaultTracker ?? settings.activeTrackers[0] ?? 'mal'
  );
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType ?? 'manga');
  const [status, setStatus] = useState<MediaStatus>((initialMediaType ?? 'manga') === 'anime' ? 'watching' : 'reading');

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery) {
      search();
    }
  }, []);

  async function link(entry: TrackerEntry) {
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
          <button onClick={onBack} className="btn-icon">←</button>
          <input
            className="full-bleed-search" autoFocus placeholder="Search titles..."
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>

        <div className="pill-list" style={{ padding: '0 0 8px' }}>
          {(['anime', 'manga'] as MediaType[]).map(t => (
            <button key={t} onClick={() => {
              setMediaType(t);
              setStatus(t === 'anime' ? 'watching' : 'reading');
            }}
              className={`search-pill ${mediaType === t ? 'active' : ''}`}>
              {t === 'anime' ? '▶ Anime' : '📖 Manga'}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />
          {authedTrackers.map(t => {
            const isSoon = t === 'shikimori' || t === 'bangumi';
            return (
              <button key={t} onClick={() => !isSoon && setTracker(t)}
                className={`search-pill ${tracker === t ? 'active' : ''}`}
                style={isSoon ? { opacity: 0.5, cursor: 'default' } : {}}
              >
                {TRACKER_LABELS[t]} {isSoon && '(Soon)'}
              </button>
            );
          })}
        </div>

        <div className="status-text" style={{ padding: '4px 0 8px' }}>INITIAL STATUS:</div>
        <div className="pill-list" style={{ padding: '0 0 12px' }}>
          {(mediaType === 'anime'
            ? ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'] as MediaStatus[]
            : ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'] as MediaStatus[]
          ).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`search-pill ${status === s ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 8px' }}>
              {s.toUpperCase().replace(/_/g, ' ')}
            </button>
          ))}
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
                </div>
              </div>
            </div>
            <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', padding: '4px 10px' }}>Link</span>
          </div>
        ))}
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view-container">
      <Header title="Migrate Entry" onBack={onBack} />
      <div className="scroll-area">
        <div className="pipeline-flow">
          <div className="pipeline-node faded">
            <div className="status-text" style={{ marginBottom: 4, textTransform: 'uppercase' }}>Source</div>
            <div className="track-title">{item.platformTitle}</div>
            <div className="status-text">{getPlatformLabel(item.platform)}</div>
          </div>
          <div className="pipeline-connector">⇄</div>
          <div className="pipeline-node">
            <div className="status-text" style={{ marginBottom: 12, textTransform: 'uppercase', color: 'var(--accent)' }}>Destination</div>
            <select
              className="full-bleed-search"
              value={toPlatform}
              onChange={e => setToPlatform(e.target.value as PlatformType)}
            >
              <option value="">Select platform...</option>
              {(item.type === 'anime' ? ANIME_PLATFORMS : MANGA_PLATFORMS)
                .filter(p => p !== item.platform)
                .map(p => (
                  <option key={p} value={p}>{getPlatformLabel(p)}</option>
                ))}
            </select>
          </div>
        </div>
      </div>
      <div className="sticky-bottom">
        <button onClick={handleMigrate} disabled={!toPlatform || loading} className="btn-accent" style={{ width: '100%' }}>
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
  const [sourcesCount, setSourcesCount] = useState<number>(0);

  useEffect(() => {
    msg<MessageResponse<AidokuSource[]>>({ type: 'GET_AIDOKU_SOURCES' }).then(res => {
      if (res.success && Array.isArray(res.data)) setSourcesCount(res.data.length);
    });
  }, []);

  const toggle = async (key: keyof AppSettings) => {
    await msg({ type: 'SAVE_SETTINGS', payload: { [key]: !settings[key] } });
    onUpdate();
  };

  const setDefault = async (tracker: TrackerType) => {
    const next = settings.defaultTracker === tracker ? null : tracker;
    await msg({ type: 'SAVE_SETTINGS', payload: { defaultTracker: next } });
    onUpdate();
  };

  const authedTrackers = (['mal', 'anilist', 'shikimori', 'bangumi'] as TrackerType[])
    .filter(t => !!settings.auth[t]);

  return (
    <div className="view-container">
      <Header title="Settings" onBack={onBack} />
      <div className="scroll-area" style={{ padding: '0 16px' }}>
        <Section title="ACCOUNTS">
          {authedTrackers.length === 0 ? (
            <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              No trackers connected.
            </div>
          ) : (
            authedTrackers.map(t => (
              <div key={t} className="settings-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="account-dot" style={{ background: TRACKER_COLORS[t] }} />
                  <div className="settings-label">
                    <span className="settings-title" style={{ fontSize: 13 }}>{TRACKER_LABELS[t]}</span>
                    {settings.auth[t]?.username && (
                      <span className="settings-desc">@{settings.auth[t]!.username}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDefault(t)}
                  className={`search-pill ${settings.defaultTracker === t ? 'active' : ''}`}
                  style={{ fontSize: 10, padding: '4px 8px', borderRadius: 4 }}
                >
                  {settings.defaultTracker === t ? '★ Default' : 'Set default'}
                </button>
              </div>
            ))
          )}
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={onOpenLogin}
              className="btn-accent"
              style={{ width: '100%', height: 32, fontSize: 11, background: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              {authedTrackers.length === 0 ? '+ Connect a tracker' : 'Manage Accounts'}
            </button>
          </div>
        </Section>

        <Section title="PREFERENCES">
          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-title">Update After Reading</span>
              <span className="settings-desc">Auto-sync progress when you finish a chapter/episode</span>
            </div>
            <Toggle on={settings.updateAfterReading} onChange={() => toggle('updateAfterReading')} />
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-title">Auto Sync History</span>
              <span className="settings-desc">Pull progress from tracker into local history</span>
            </div>
            <Toggle on={settings.autoSyncHistory} onChange={() => toggle('autoSyncHistory')} />
          </div>

          <div className="settings-row" style={{ padding: '12px 16px' }}>
            <div className="settings-label">
              <span className="settings-title">Confirmation Mode</span>
              <span className="settings-desc">How community sources should track progress</span>
            </div>
            <select
              className="status-select"
              value={settings.confirmationMode}
              onChange={e => msg({ type: 'SAVE_SETTINGS', payload: { confirmationMode: e.target.value as any } }).then(onUpdate)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              <option value="ask">BLOCKING</option>
              <option value="quick">QUICK (5s)</option>
              <option value="auto">ALWAYS</option>
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-title">Batch Sync Pending</span>
              <span className="settings-desc">Notify about unsynced chapters in popup</span>
            </div>
            <Toggle on={settings.batchSyncPending} onChange={() => toggle('batchSyncPending')} />
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-title">Show Chapter Badge</span>
              <span className="settings-desc">Show count on extension icon</span>
            </div>
            <Toggle on={settings.showChapterBadge} onChange={() => toggle('showChapterBadge')} />
          </div>
        </Section>

        <Section title="AUTOMATION">
          <div className="settings-row" style={{ borderBottom: 'none' }}>
            <div className="settings-label">
              <span className="settings-title">Community Sources</span>
              <span className="settings-desc">Auto-track {sourcesCount || '115+'} manga sites</span>
            </div>
            <div className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>ACTIVE</div>
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
  onSearch: (platformKey?: string, title?: string, mediaType?: MediaType) => void;
  onSettings: () => void;
  onMigrate: (item: TrackedItem) => void;
  onUpdate: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);

  const hasAuth = settings.activeTrackers.length > 0 && Object.keys(settings.auth).length > 0;

  // 1. Efficient Filtering (Memoized)
  const filteredItems = React.useMemo(() => {
    if (!localQuery) return trackedItems;
    const q = localQuery.toLowerCase();
    return trackedItems.filter(i => i.platformTitle.toLowerCase().includes(q));
  }, [trackedItems, localQuery]);

  // 2. Intersection Observer for Infinite Scroll
  const observerTarget = React.useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setDisplayLimit(prev => prev + 20);
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, []);

  // Reset limit when query changes
  useEffect(() => setDisplayLimit(20), [localQuery]);

  const currentlyViewing = filteredItems.find(item => item.platformKey === currentKey);

  const animeHistoryOfficial = filteredItems.filter(item => item.type === 'anime' && isOfficial(item.platform) && item !== currentlyViewing && Object.keys(item.trackerIds).length > 0);
  const animeHistoryCommunity = filteredItems.filter(item => item.type === 'anime' && !isOfficial(item.platform) && item !== currentlyViewing && Object.keys(item.trackerIds).length > 0);

  const mangaHistoryOfficial = filteredItems.filter(item => item.type !== 'anime' && isOfficial(item.platform) && item !== currentlyViewing && Object.keys(item.trackerIds).length > 0);
  const mangaHistoryCommunity = filteredItems.filter(item => item.type !== 'anime' && !isOfficial(item.platform) && item !== currentlyViewing && Object.keys(item.trackerIds).length > 0);

  // Helper to cap rendered items
  let renderedCount = 0;
  const shouldRender = () => {
    if (renderedCount < displayLimit) {
      renderedCount++;
      return true;
    }
    return false;
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await msg({ type: 'SYNC_ALL_HISTORY' });
      onUpdate();
    } finally {
      setSyncing(false);
    }
  };

  const renderItem = (item: TrackedItem, isLive = false) => {
    const isUnlinked = Object.keys(item.trackerIds).length === 0;
    const latestPending = (item.pendingProgress?.length ?? 0) > 0 ? Math.max(...item.pendingProgress!) : null;
    const progressLabel = `${item.type === 'anime' ? 'EP' : 'CH'} ${item.lastProgress}`;

    const statusInfo = STATUS_CONFIG[item.status] || { label: item.status, color: 'var(--text-muted)' };
    const mediaCondition = item.publishingStatus?.toLowerCase().replace(/_/g, ' ');

    return (
      <div key={item.platformKey} className={`track-card ${isLive ? 'active' : ''}`}>
        <div className="track-info" style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div className="track-title" style={{ flex: 1 }}>{item.platformTitle}</div>
            <div style={{ flexShrink: 0 }}>
              <Badge label={statusInfo.label} color={statusInfo.color} />
            </div>
            <div className="track-meta">
              <Badge label={getPlatformLabel(item.platform)} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>•</span>
              <span style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 700 }}>
                {progressLabel}
                {latestPending && latestPending > item.lastProgress && (
                  <span className="unsynced-info" style={{ color: 'var(--accent)', marginLeft: 6, opacity: 0.9 }}>
                    → {item.type === 'anime' ? 'Ep.' : 'Ch.'}{latestPending} <span style={{ fontSize: 9, fontStyle: 'italic', fontWeight: 500 }}>(Unsynced)</span>
                  </span>
                )}
              </span>
              {mediaCondition && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>•</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'capitalize' }}>{mediaCondition}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isUnlinked && latestPending && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await msg({ type: 'SYNC_PROGRESS', payload: { platformKey: item.platformKey } });
                  onUpdate();
                }}
                className="btn-icon"
                title="Sync Now"
                style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)', background: 'var(--accent-soft)' }}
              >
                ↑
              </button>
            )}
            {isUnlinked ? (
              <button onClick={() => onSearch(item.platformKey, item.platformTitle, item.type)} className="btn-accent" style={{ padding: '3px 8px', fontSize: 10 }}>Link</button>
            ) : (
              <button onClick={() => onMigrate(item)} className="btn-icon">⇄</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view-container">
      <div className="app-header">
        <div className="logo-container">
          <img src="/app-icon.svg" alt="" style={{ width: 28, height: 28 }} />
          <div>
            <h1 className="logo-text" style={{ margin: 0 }}>Tsugi</h1>
            <div className="status-text">{hasAuth ? 'Trackers Active' : 'No Trackers Connected'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasAuth && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className={`btn-icon ${syncing ? 'syncing-spin' : ''}`}
              title="Sync from Trackers"
            >
              ↻
            </button>
          )}
          <button onClick={onSettings} className="btn-icon">⚙</button>
        </div>
      </div>

      {!hasAuth && (
        <div className="error-banner" style={{ borderStyle: 'dashed', background: 'transparent' }}>
          Connect a tracker in Settings to start.
        </div>
      )}

      <div className="scroll-area">
        {settings.batchSyncPending && (
          <PendingUpdatesBanner
            items={filteredItems.filter(i => (i.pendingProgress?.length ?? 0) > 0)}
            onSync={async () => {
              await Promise.all(
                filteredItems
                  .filter(i => (i.pendingProgress?.length ?? 0) > 0)
                  .map(i => msg({ type: 'SYNC_PROGRESS', payload: { platformKey: i.platformKey } }))
              );
              onUpdate();
            }}
          />
        )}

        <div style={{ paddingBottom: 12 }}>
          <input
            className="full-bleed-search"
            placeholder="Search history..."
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            style={{ fontSize: 13, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {currentlyViewing && (
          <Section title="CURRENTLY VIEWING" isLive>
            {renderItem(currentlyViewing, true)}
          </Section>
        )}

        {animeHistoryOfficial.length > 0 && <Section title="OFFICIAL ANIME">{animeHistoryOfficial.map(item => shouldRender() && renderItem(item))}</Section>}
        {animeHistoryCommunity.length > 0 && <Section title="COMMUNITY ANIME">{animeHistoryCommunity.map(item => shouldRender() && renderItem(item))}</Section>}

        {mangaHistoryOfficial.length > 0 && <Section title="OFFICIAL MANGA">{mangaHistoryOfficial.map(item => shouldRender() && renderItem(item))}</Section>}
        {mangaHistoryCommunity.length > 0 && <Section title="COMMUNITY MANGA">{mangaHistoryCommunity.map(item => shouldRender() && renderItem(item))}</Section>}

        {filteredItems.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {localQuery ? 'No results found.' : 'Visit a site to track.'}
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        <div ref={observerTarget} style={{ height: 20, width: '100%' }} />
      </div>

      <div className="sticky-bottom">
        <button onClick={() => onSearch()} className="btn-accent" style={{ width: '100%', height: 36, fontSize: 13 }}>+ Search & Track</button>
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
  const [searchCtx, setSearchCtx] = useState<{ platformKey: string | null, query: string | null, mediaType?: MediaType } | null>(null);
  const [currentlyViewingKey, setCurrentlyViewingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [s, items] = await Promise.all([
        msg<AppSettings>({ type: 'GET_SETTINGS' }),
        msg<{ active: TrackedItem[]; currentlyViewingKey: string | null }>({ type: 'GET_TRACKED_ITEMS' }),
      ]);
      setSettings(s);
      setTrackedItems(items.active);
      setCurrentlyViewingKey(items.currentlyViewingKey);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!settings) return <div className="view-container"><Spinner /></div>;
  if (view === 'login') return <LoginView settings={settings} onBack={() => { setView('settings'); loadAll(); }} onAuthSuccess={loadAll} />;
  if (view === 'settings') return <SettingsView settings={settings} onBack={() => setView('home')} onOpenLogin={() => setView('login')} onUpdate={loadAll} />;
  if (view === 'search') return <SearchView settings={settings} platformKey={searchCtx?.platformKey ?? null} initialQuery={searchCtx?.query ?? null} initialMediaType={searchCtx?.mediaType} onBack={() => { setView('home'); loadAll(); }} />;
  if (view === 'migrate' && migrateTarget) return <MigrateView item={migrateTarget} onBack={() => setView('home')} onDone={() => { setView('home'); loadAll(); }} />;

  return (
    <HomeView
      settings={settings}
      trackedItems={trackedItems}
      currentKey={currentlyViewingKey}
      onSearch={(key, title, type) => { setSearchCtx({ platformKey: key || null, query: title || null, mediaType: type }); setView('search'); }}
      onSettings={() => setView('settings')}
      onMigrate={(item) => { setMigrateTarget(item); setView('migrate'); }}
      onUpdate={loadAll}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
