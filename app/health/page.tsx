'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Database, Trash2 } from 'lucide-react';
import { PLAYLISTS, parseM3U, type PlaylistKey } from '@/playlists';
import { syncStreams } from '@/lib/supabase';

const TIMEOUT_MS = 8000;
const CONCURRENCY = 20;

type Status = 'pending' | 'checking' | 'ok' | 'dead' | 'timeout' | 'dash';

interface StreamResult {
  name: string;
  url: string;
  group: string;
  backups?: string[];
  status: Status;
  totalSources?: number;
}

const cacheKey = (playlist: PlaylistKey | 'custom') => `mdHealth_${playlist}`;

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { icon: React.ReactNode; label: string; cls: string }> = {
    pending: { icon: <Clock className="w-3 h-3" />, label: 'Pending', cls: 'bg-white/5 text-white/30' },
    checking: { icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: 'Checking…', cls: 'bg-white/5 text-white/40' },
    ok: { icon: <CheckCircle className="w-3 h-3" />, label: 'Live', cls: 'bg-emerald-500/15 text-emerald-400' },
    dead: { icon: <XCircle className="w-3 h-3" />, label: 'Dead', cls: 'bg-red-500/15 text-red-400' },
    timeout: { icon: <Clock className="w-3 h-3" />, label: 'Timeout', cls: 'bg-red-500/15 text-red-400' },
    dash: { icon: <AlertTriangle className="w-3 h-3" />, label: 'DASH', cls: 'bg-amber-500/15 text-amber-400' },
  };
  const { icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

async function checkStream(url: string): Promise<Status> {
  if (url.endsWith('.mpd')) return 'dash';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store', mode: 'no-cors' });
    clearTimeout(timer);
    if (res.type === 'opaque' || res.ok) return 'ok';
    return 'dead';
  } catch (e: unknown) {
    clearTimeout(timer);
    if (!(e instanceof Error)) return 'dead';
    if (e.name === 'AbortError') return 'timeout';
    if (e.message?.includes('Failed to fetch')) {
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), TIMEOUT_MS);
      try {
        await fetch(url, { method: 'GET', signal: ctrl2.signal, cache: 'no-store', mode: 'cors', headers: { Range: 'bytes=0-1023' } });
        clearTimeout(timer2);
        return 'ok';
      } catch (e2: unknown) {
        clearTimeout(timer2);
        if (e2 instanceof Error) {
          if (e2.name === 'AbortError') return 'timeout';
          if (e2.message?.includes('CORS') || e2.message?.includes('cross-origin')) return 'ok';
        }
        return 'dead';
      }
    }
    return 'dead';
  }
}

export default function HealthPage() {
  const [results, setResults] = useState<StreamResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<PlaylistKey | 'custom'>('sports');
  const [customM3U, setCustomM3U] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [fromCache, setFromCache] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncStats, setSyncStats] = useState({ saved: 0, removed: 0 });
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const stats = {
    total: results.length,
    ok: results.filter(r => r.status === 'ok').length,
    dead: results.filter(r => r.status === 'dead' || r.status === 'timeout').length,
    dash: results.filter(r => r.status === 'dash').length,
    pending: results.filter(r => r.status === 'pending' || r.status === 'checking').length,
  };

  const loadCache = useCallback(() => {
    if (activePlaylist === 'custom') return false;
    try {
      const raw = sessionStorage.getItem(cacheKey(activePlaylist));
      if (!raw) return false;
      const { results: cached, ts } = JSON.parse(raw);
      if (Date.now() - ts > 10 * 60 * 1000) return false;
      setResults(cached);
      setDone(true);
      setFromCache(true);
      setFilterStatus('all');
      return true;
    } catch { return false; }
  }, [activePlaylist]);

  const saveCache = (res: StreamResult[]) => {
    if (activePlaylist === 'custom') return;
    try { sessionStorage.setItem(cacheKey(activePlaylist), JSON.stringify({ results: res, ts: Date.now() })); }
    catch { /* ignore */ }
  };

  const syncToSupabase = useCallback(async (res: StreamResult[]) => {
    if (activePlaylist === 'custom') return;
    setSyncing(true);
    setSyncDone(false);
    try {
      const { saved, removed } = await syncStreams(res, activePlaylist);
      setSyncStats({ saved, removed });
    } catch (err) {
      console.error('Sync error:', err);
    }
    setSyncing(false);
    setSyncDone(true);
  }, [activePlaylist]);

  const startCheck = useCallback(async (forceRefresh = false) => {
    if (running) return;
    setSyncDone(false);
    if (!forceRefresh && loadCache()) return;

    let raw = '';
    if (activePlaylist === 'custom') {
      raw = customM3U.trim();
      if (!raw) return alert('Paste a custom M3U playlist first.');
    } else {
      raw = PLAYLISTS[activePlaylist];
    }

    const streams = parseM3U(raw);
    if (!streams.length) return alert('No streams found in this playlist.');

    const initial: StreamResult[] = streams.map(s => ({
      name: s.name,
      url: s.url,
      group: s.group || '',
      backups: s.backups,
      status: 'pending',
      totalSources: (s.backups?.length ?? 0) + 1,
    }));

    setResults(initial);
    setRunning(true);
    setDone(false);
    setFromCache(false);
    setFilterStatus('all');

    const queue = [...streams];
    let idx = 0;

    const worker = async () => {
      while (true) {
        const stream = queue.shift();
        if (!stream) break;
        const i = idx++;
        setResults(prev => { const n = [...prev]; n[i] = { ...n[i], status: 'checking' }; return n; });
        const status = await checkStream(stream.url);
        setResults(prev => { const n = [...prev]; n[i] = { ...n[i], status }; return n; });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setResults(prev => {
      saveCache(prev);
      syncToSupabase(prev);
      return prev;
    });
    setRunning(false);
    setDone(true);
  }, [running, activePlaylist, customM3U, loadCache, syncToSupabase]);

  const deleteStream = useCallback(async (url: string) => {
    setDeletingUrl(url);
    try {
      await fetch('/api/sync-streams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      setResults(prev => prev.filter(r => r.url !== url));
      setResults(prev => { saveCache(prev); return prev; });
    } catch (err) {
      console.error('Delete error:', err);
    }
    setDeletingUrl(null);
  }, [activePlaylist]);

  const visible = filterStatus === 'all' ? results : results.filter(r => r.status === filterStatus);
  const progress = results.length > 0 ? Math.round(((results.length - stats.pending) / results.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col">

      {/* Header */}
      <header className="h-14 shrink-0 border-b border-white/[0.06] flex items-center px-5 gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm shrink-0">⚽</div>
        <span className="font-bold tracking-tight">
          Matchday<span className="text-emerald-400">Live</span>
          <span className="text-white/30 font-normal ml-2 text-sm">/ stream health</span>
        </span>

        {(syncing || syncDone) && (
          <div className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${syncing
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
            <Database className={`w-3.5 h-3.5 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing
              ? 'Syncing to Supabase…'
              : `Supabase synced · ${syncStats.saved} saved · ${syncStats.removed} removed`}
          </div>
        )}
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">

        {/* Playlist selector */}
        <div className="mb-6">
          <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Select playlist to check</p>
          <div className="flex flex-wrap gap-2">
            {(['sports', 'worldcup', 'custom'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setActivePlaylist(p); setResults([]); setDone(false); setFromCache(false); setSyncDone(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${activePlaylist === p
                  ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/[0.06] text-white/40 hover:text-white/70'
                  }`}
              >
                {p === 'sports' ? '⚽ Sports' : p === 'worldcup' ? '🏆 World Cup' : '📋 Custom M3U'}
              </button>
            ))}
          </div>

          {activePlaylist === 'custom' && (
            <textarea
              value={customM3U}
              onChange={e => setCustomM3U(e.target.value)}
              placeholder="Paste your M3U playlist here (#EXTM3U …)"
              className="mt-3 w-full h-32 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs font-mono text-white/70 placeholder:text-white/20 outline-none focus:border-white/20 resize-y"
            />
          )}
        </div>

        {/* Info banner */}
        {!done && !running && (
          <div className="mb-5 flex items-start gap-3 bg-blue-500/8 border border-blue-500/15 rounded-xl px-4 py-3">
            <Database className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/50 leading-relaxed">
              After checking, working streams are <span className="text-emerald-400">automatically saved</span> to Supabase and dead ones are <span className="text-red-400">removed</span>. You can also manually delete any stream using the <span className="text-white/60">trash icon</span>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => startCheck(false)}
            disabled={running || syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Checking…' : 'Check & sync streams'}
          </button>

          {fromCache && (
            <button
              onClick={() => startCheck(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/40 text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />Re-check
            </button>
          )}

          {fromCache && (
            <span className="text-[11px] text-white/20 ml-1">Cached results · under 10 min old</span>
          )}
        </div>

        {/* Progress */}
        {results.length > 0 && !fromCache && (
          <div className="mb-5">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-white/30">
              {running ? `Checking ${results.length - stats.pending} of ${stats.total}…` : `Done — checked ${stats.total} streams`}
            </p>
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total', value: stats.total, cls: 'text-white' },
              { label: 'Live', value: stats.ok, cls: 'text-emerald-400' },
              { label: 'Dead', value: stats.dead, cls: 'text-red-400' },
              { label: 'DASH', value: stats.dash, cls: 'text-amber-400' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                <p className="text-[11px] text-white/30 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit mb-4">
            {(['all', 'ok', 'dead', 'timeout', 'dash'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === f ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {f === 'all' ? `All (${stats.total})` : f === 'ok' ? `Live (${stats.ok})` : f === 'dead' ? `Dead (${stats.dead})` : f === 'timeout' ? 'Timeout' : `DASH (${stats.dash})`}
              </button>
            ))}
          </div>
        )}

        {/* Results table */}
        {visible.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">

            {/* Table header */}
            <div className="grid text-[11px] text-white/25 uppercase tracking-wider font-medium px-4 py-3 border-b border-white/[0.04]"
              style={{ gridTemplateColumns: '120px 200px 1fr 60px 40px' }}>
              <span>Status</span>
              <span>Channel</span>
              <span>URL</span>
              <span className="text-center">Srcs</span>
              <span></span>
            </div>

            {/* Scrollable rows */}
            <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto scrollable-table">
              {visible.map((r, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                  style={{ gridTemplateColumns: '120px 200px 1fr 60px 40px' }}
                >
                  {/* Status */}
                  <div className="pr-4">
                    <StatusBadge status={r.status} />
                  </div>

                  {/* Channel name + group */}
                  <div className="min-w-0 pr-6">
                    <p className="text-xs font-medium text-white/80 truncate">{r.name}</p>
                    {r.group && <p className="text-[10px] text-white/25 truncate mt-0.5">{r.group}</p>}
                  </div>

                  {/* URL — horizontally scrollable on hover */}
                  <div className="min-w-0 pr-4 overflow-x-auto url-cell">
                    <p className="text-[10px] text-white/30 font-mono whitespace-nowrap">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-400 transition-colors"
                      >
                        {r.url}
                      </a>
                    </p>
                  </div>

                  {/* Sources */}
                  <div className="text-center">
                    <span className="text-[10px]">
                      {r.totalSources && r.totalSources > 1
                        ? <span className="text-emerald-400/60 font-semibold">{r.totalSources}</span>
                        : <span className="text-white/15">—</span>}
                    </span>
                  </div>

                  {/* Delete */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => deleteStream(r.url)}
                      disabled={deletingUrl === r.url || running}
                      title="Remove from database"
                      className="flex items-center justify-center text-white/0 group-hover:text-white/25 hover:!text-red-400 transition-colors disabled:opacity-30"
                    >
                      {deletingUrl === r.url
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-white/30" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-sm">Select a playlist and hit Check &amp; sync streams</p>
            <p className="text-xs mt-1 text-white/15">Working streams will be saved to Supabase automatically</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* Vertical scrollbar for the results table — expands on hover */
        .scrollable-table::-webkit-scrollbar {
          width: 3px;
          transition: width 0.2s ease;
        }
        .scrollable-table:hover::-webkit-scrollbar {
          width: 6px;
        }
        .scrollable-table::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollable-table::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .scrollable-table:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.18);
        }

        /* Horizontal scrollbar for URL cells — only visible on row hover */
        .url-cell {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.2s;
        }
        .url-cell::-webkit-scrollbar {
          height: 2px;
        }
        .url-cell::-webkit-scrollbar-track {
          background: transparent;
        }
        .url-cell::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
          transition: background 0.2s;
        }
        /* Show URL scrollbar when hovering the row */
        .group:hover .url-cell {
          scrollbar-color: rgba(255,255,255,0.15) transparent;
        }
        .group:hover .url-cell::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
        }
        .group:hover .url-cell:hover::-webkit-scrollbar-thumb {
          background: rgba(52,211,153,0.4);
        }
        .group:hover .url-cell::-webkit-scrollbar {
          height: 3px;
        }

        /* Global thin scrollbar */
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>
    </div>
  );
}
