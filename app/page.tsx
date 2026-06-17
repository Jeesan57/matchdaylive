'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import Link from 'next/link';
import {
  Heart, Search, Tv, X, Signal, RefreshCw, ChevronRight,
  Activity, AlertTriangle, Database, ChevronDown, Wifi, WifiOff,
  Loader2, UploadCloud, CircleDot,
} from 'lucide-react';
import { type Stream, type PlaylistKey } from '@/playlists';
import ScoresPanel from '@/components/ScoresPanel';
import { loadStreams, type DBStream } from '@/lib/supabase';

const HLS_CONFIG: Partial<Hls['config']> = {
  enableWorker: true,
  lowLatencyMode: true,
  maxBufferLength: 20,
  maxMaxBufferLength: 40,
  maxBufferSize: 20 * 1000 * 1000,
  maxBufferHole: 0.3,
  backBufferLength: 10,
  startLevel: -1,
  fragLoadingTimeOut: 6000,
  fragLoadingMaxRetry: 2,
  fragLoadingRetryDelay: 500,
  manifestLoadingTimeOut: 5000,
  manifestLoadingMaxRetry: 2,
  levelLoadingTimeOut: 5000,
  levelLoadingMaxRetry: 2,
};

const STREAM_TIMEOUT_MS = 8000;

type BufferState = 'loading' | 'playing' | 'error' | 'dash' | 'trying-backup';

function dbToStream(db: DBStream): Stream {
  return {
    name: db.name,
    url: db.url,
    group: db.group_name,
    backups: db.backups?.length ? db.backups : undefined,
  };
}

export default function MatchdayLive() {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistKey>('sports');
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamCount, setStreamCount] = useState<number | null>(null); // null = loading
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [activeGroup, setActiveGroup] = useState('All');
  const [bufferState, setBufferState] = useState<BufferState>('loading');
  const [quality, setQuality] = useState<string>('');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [groupOpen, setGroupOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceIndexRef = useRef(0);

  // ── Favorites ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem('mdFavorites'); if (s) setFavorites(JSON.parse(s)); } catch { }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('mdFavorites', JSON.stringify(favorites)); } catch { }
  }, [favorites]);

  // ── Load from Supabase ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStreamCount(null);
    setStreams([]);
    setSelectedStream(null);
    setSearchTerm('');
    setActiveGroup('All');
    setActiveTab('all');
    setGroupOpen(false);

    loadStreams(activePlaylist).then(rows => {
      if (cancelled) return;
      const parsed = rows.map(dbToStream);
      setStreams(parsed);
      setStreamCount(parsed.length);
      setSelectedStream(parsed[0] ?? null);
    });

    return () => { cancelled = true; };
  }, [activePlaylist]);

  // ── URL helpers ──────────────────────────────────────────────────────────────
  const getAllUrls = (s: Stream) => [s.url, ...(s.backups ?? [])];

  // ── HLS player ───────────────────────────────────────────────────────────────
  const loadUrl = useCallback((url: string, stream: Stream, srcIdx: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (url.endsWith('.mpd')) { setBufferState('dash'); return; }

    setQuality('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    video.removeAttribute('src');

    const allUrls = getAllUrls(stream);
    const hasMore = srcIdx < allUrls.length - 1;

    const tryNext = () => {
      if (hasMore) {
        const next = srcIdx + 1;
        sourceIndexRef.current = next;
        setSourceIndex(next);
        setBufferState('trying-backup');
        loadUrl(allUrls[next], stream, next);
      } else {
        setBufferState('error');
      }
    };

    timeoutRef.current = setTimeout(tryNext, STREAM_TIMEOUT_MS);

    if (Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG as Hls['config']);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeoutRef.current!);
        video.play().catch(() => { });
        const lvl = hls.levels[hls.currentLevel];
        if (lvl?.height) setQuality(`${lvl.height}p`);
      });
      hls.on(Hls.Events.FRAG_BUFFERED, () => setBufferState('playing'));
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl?.height) setQuality(`${lvl.height}p`);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) { clearTimeout(timeoutRef.current!); hls.destroy(); hlsRef.current = null; tryNext(); }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.onloadeddata = () => { clearTimeout(timeoutRef.current!); setBufferState('playing'); };
      video.onerror = () => { clearTimeout(timeoutRef.current!); tryNext(); };
      video.play().catch(() => { });
    } else {
      clearTimeout(timeoutRef.current!);
      setBufferState('error');
    }
  }, []);

  const startPlayer = useCallback((stream: Stream) => {
    sourceIndexRef.current = 0;
    setSourceIndex(0);
    setBufferState('loading');
    loadUrl(stream.url, stream, 0);
    return () => { clearTimeout(timeoutRef.current!); hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [loadUrl]);

  useEffect(() => {
    if (!selectedStream) return;
    return startPlayer(selectedStream);
  }, [selectedStream, startPlayer]);

  const handleRetry = useCallback(() => {
    if (selectedStream) startPlayer(selectedStream);
  }, [selectedStream, startPlayer]);

  const getVisibleStreams = useCallback(() => streams.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = activeGroup === 'All' || s.group === activeGroup;
    const matchTab = activeTab === 'all' || favorites.includes(s.url);
    return matchSearch && matchGroup && matchTab;
  }), [streams, searchTerm, activeGroup, activeTab, favorites]);

  const handleNextChannel = useCallback(() => {
    const vs = getVisibleStreams();
    const i = vs.findIndex(s => s.url === selectedStream?.url);
    if (i >= 0 && i < vs.length - 1) setSelectedStream(vs[i + 1]);
  }, [selectedStream, getVisibleStreams]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen();
      if (e.key === ' ') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
      if (e.key === 'm') video.muted = !video.muted;
      if (e.key === 'ArrowUp') { e.preventDefault(); video.volume = Math.min(1, +(video.volume + 0.1).toFixed(1)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); video.volume = Math.max(0, +(video.volume - 0.1).toFixed(1)); }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const vs = getVisibleStreams();
        const i = vs.findIndex(s => s.url === selectedStream?.url);
        if (i < vs.length - 1) setSelectedStream(vs[i + 1]);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const vs = getVisibleStreams();
        const i = vs.findIndex(s => s.url === selectedStream?.url);
        if (i > 0) setSelectedStream(vs[i - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedStream, getVisibleStreams]);

  const toggleFavorite = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => prev.includes(url) ? prev.filter(f => f !== url) : [...prev, url]);
  };

  const groups = ['All', ...Array.from(new Set(streams.map(s => s.group).filter(Boolean) as string[]))];
  const visible = getVisibleStreams();
  const isFav = selectedStream ? favorites.includes(selectedStream.url) : false;
  const allUrls = selectedStream ? getAllUrls(selectedStream) : [];
  const totalSources = allUrls.length;
  const currentSourceNum = sourceIndex + 1;
  const isLoading = streamCount === null;
  const isEmpty = streamCount === 0;

  return (
    <div className="h-screen bg-[#07070f] text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="h-12 shrink-0 border-b border-white/[0.06] flex items-center px-4 gap-2 bg-[#07070f]/95 backdrop-blur-md">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm shrink-0 shadow-lg shadow-emerald-900/40">⚽</div>
          <span className="font-bold tracking-tight text-sm">
            Matchday<span className="text-emerald-400">Live</span>
          </span>
        </div>

        <div className="w-px h-4 bg-white/[0.08] mx-1" />

        {/* Playlist tabs */}
        <div className="flex gap-0.5 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.05]">
          {(['sports', 'worldcup'] as PlaylistKey[]).map(pl => (
            <button
              key={pl}
              onClick={() => setActivePlaylist(pl)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${activePlaylist === pl
                  ? pl === 'worldcup'
                    ? 'bg-amber-500/25 text-amber-300 shadow-sm'
                    : 'bg-white/10 text-white shadow-sm'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
            >
              {pl === 'sports' ? '⚽ Sports' : '🏆 World Cup'}
            </button>
          ))}
        </div>

        <Link
          href="/health"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
        >
          <Activity className="w-3 h-3" />Health
        </Link>

        <button
          onClick={() => setScoresOpen(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${scoresOpen
              ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400/80'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
            }`}
        >
          <CircleDot className="w-3 h-3" />Scores
        </button>

        {/* DB status pill */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${isLoading ? 'bg-white/[0.03] border-white/[0.05] text-white/20' :
            isEmpty ? 'bg-amber-500/8 border-amber-500/12 text-amber-500/60' :
              'bg-emerald-500/8 border-emerald-500/12 text-emerald-500/60'
          }`}>
          {isLoading
            ? <><Loader2 className="w-2.5 h-2.5 animate-spin" />Loading…</>
            : isEmpty
              ? <><UploadCloud className="w-2.5 h-2.5" />No streams — run Health check</>
              : <><Database className="w-2.5 h-2.5" />{streamCount} verified</>
          }
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-3 text-[10px] text-white/15">
          {[['F', 'fullscreen'], ['Space', 'play/pause'], ['M', 'mute'], ['← →', 'channel']].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.06] font-mono text-white/25 text-[9px]">{k}</kbd>
              <span>{v}</span>
            </span>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-[268px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#070710]" style={{ overflow: 'visible' }}>

          {/* All / Favorites tabs */}
          <div className="px-3 pt-3 pb-2.5 flex gap-1 shrink-0">
            {(['all', 'favorites'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${t === 'all'
                    ? activeTab === 'all' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
                    : activeTab === 'favorites' ? 'bg-red-500/10 text-red-300' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
              >
                {t === 'all' ? 'All' : '❤ Saved'}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === t
                    ? t === 'favorites' ? 'bg-red-500/15 text-red-400/70' : 'bg-white/10 text-white/50'
                    : 'bg-white/5 text-white/20'
                  }`}>
                  {t === 'all' ? streams.length : favorites.length}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 pb-2 shrink-0">
            <div className={`flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 h-8 border transition-colors ${searchTerm ? 'border-white/10' : 'border-transparent'}`}>
              <Search className="w-3 h-3 text-white/20 shrink-0" />
              <input
                type="text"
                placeholder="Search channels…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-white/20 text-white/70"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-white/25 hover:text-white/50 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Group dropdown */}
          {groups.length > 2 && (
            <div className="px-3 pb-2 shrink-0 relative z-10">
              <button
                onClick={() => setGroupOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60" />
                  {activeGroup === 'All' ? 'All groups' : activeGroup}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupOpen && (
                <div className="absolute left-3 right-3 top-full mt-1 bg-[#0f0f1a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {groups.map(g => (
                      <button
                        key={g}
                        onClick={() => { setActiveGroup(g); setGroupOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center justify-between ${activeGroup === g ? 'bg-emerald-600/15 text-emerald-300' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'
                          }`}
                      >
                        {g}
                        {activeGroup === g && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && visible.length > 0 && (
            <div className="px-4 pb-1.5 shrink-0">
              <p className="text-[10px] text-white/15">{visible.length} channel{visible.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Channel list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 sidebar-scroll">

            {/* Loading skeleton */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40 gap-2.5 text-white/20">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="text-[11px]">Loading streams…</p>
              </div>
            )}

            {/* Empty — no streams synced yet */}
            {!isLoading && isEmpty && (
              <div className="flex flex-col items-center justify-center h-52 gap-3 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-white/15" />
                </div>
                <div>
                  <p className="text-[11px] text-white/30 font-medium">No streams yet</p>
                  <p className="text-[10px] text-white/15 mt-1 leading-relaxed">
                    Upload an M3U on the<br />Health page to get started
                  </p>
                </div>
                <Link
                  href="/health"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-600/12 border border-emerald-500/20 hover:bg-emerald-600/20 transition-colors"
                >
                  <Activity className="w-3 h-3" />Go to Health page
                </Link>
              </div>
            )}

            {/* No results after filter */}
            {!isLoading && !isEmpty && visible.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/20">
                <Tv className="w-5 h-5" />
                <p className="text-[11px]">No channels found</p>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-[10px] text-emerald-500/50 hover:text-emerald-400/70 transition-colors mt-1">
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Channel rows */}
            {!isLoading && visible.map(stream => {
              const isActive = selectedStream?.url === stream.url;
              const isFavItem = favorites.includes(stream.url);
              const backupCount = stream.backups?.length ?? 0;
              return (
                <div
                  key={stream.url}
                  onClick={() => setSelectedStream(stream)}
                  className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 ${isActive
                      ? 'bg-emerald-600/12 ring-1 ring-emerald-500/15'
                      : 'hover:bg-white/[0.03] ring-1 ring-transparent hover:ring-white/[0.04]'
                    }`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center overflow-hidden transition-colors ${isActive ? 'bg-emerald-900/30' : 'bg-white/[0.04]'}`}>
                    {stream.tvgLogo
                      ? <img src={stream.tvgLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <Tv className="w-3.5 h-3.5 text-white/15" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate leading-tight ${isActive ? 'text-emerald-300' : 'text-white/65 group-hover:text-white/80'}`}>
                      {stream.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {stream.group && <p className="text-[9px] text-white/20 truncate">{stream.group}</p>}
                      {backupCount > 0 && <span className="text-[8px] bg-white/[0.06] text-white/20 px-1 py-0.5 rounded shrink-0">+{backupCount}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isActive && <Signal className={`w-3 h-3 ${bufferState === 'playing' ? 'text-emerald-400' : 'text-white/20'}`} />}
                    <button
                      onClick={e => toggleFavorite(stream.url, e)}
                      className={`p-0.5 rounded transition-colors ${isFavItem ? 'text-red-400' : 'text-transparent group-hover:text-white/15 hover:!text-red-400'}`}
                    >
                      <Heart className="w-3 h-3" fill={isFavItem ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Player ── */}
        <main className="flex-1 flex flex-col p-3 gap-3 overflow-hidden min-w-0 bg-[#050509]">
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 ring-1 ring-white/[0.05]">
            <video ref={videoRef} controls autoPlay playsInline className="w-full h-full" />

            {bufferState === 'loading' && selectedStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full border border-emerald-500/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/50 font-medium">Connecting…</p>
                  <p className="text-[10px] text-white/20 mt-0.5">{selectedStream.name}</p>
                </div>
              </div>
            )}

            {/* No-streams placeholder in player area */}
            {!isLoading && isEmpty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-white/15" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/35 font-medium">No verified streams</p>
                  <p className="text-xs text-white/20 mt-1">Upload an M3U on the Health page and run a check</p>
                </div>
                <Link
                  href="/health"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-600/12 border border-emerald-500/20 hover:bg-emerald-600/20 transition-colors"
                >
                  <Activity className="w-4 h-4" />Open Health Page
                </Link>
              </div>
            )}

            {bufferState === 'trying-backup' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full border border-amber-500/20 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-amber-300/80 font-medium">Switching source…</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Trying source {currentSourceNum} of {totalSources}</p>
                </div>
              </div>
            )}

            {(bufferState === 'error' || bufferState === 'dash') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-red-400/70" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/50 font-medium">
                    {bufferState === 'dash' ? 'Unsupported format' : 'Stream unavailable'}
                  </p>
                  <p className="text-[11px] text-white/25 mt-1">
                    {bufferState === 'error' && totalSources > 1 ? `Tried all ${totalSources} sources` :
                      bufferState === 'dash' ? 'DASH streams are not supported' : 'Try another channel'}
                  </p>
                </div>
                {bufferState === 'error' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-600/12 border border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-600/20 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />Retry
                    </button>
                    <button
                      onClick={handleNextChannel}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-white/35 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 hover:bg-white/[0.08] transition-colors"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {bufferState === 'playing' && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-md rounded-lg px-2 py-1 pointer-events-none ring-1 ring-white/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold text-white/55 tracking-[0.12em] uppercase">Live</span>
              </div>
            )}

            {bufferState === 'playing' && quality && (
              <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-md rounded-lg px-2 py-1 pointer-events-none ring-1 ring-white/[0.06]">
                <span className="text-[9px] font-bold text-white/45 tracking-wide">{quality}</span>
              </div>
            )}

            {bufferState === 'playing' && sourceIndex > 0 && (
              <div className="absolute bottom-16 left-3 flex items-center gap-1.5 bg-amber-950/60 backdrop-blur-md border border-amber-500/15 rounded-lg px-2.5 py-1 pointer-events-none">
                <AlertTriangle className="w-3 h-3 text-amber-400/70" />
                <span className="text-[9px] text-amber-300/70 font-medium">Backup {currentSourceNum}/{totalSources}</span>
              </div>
            )}
          </div>

          {/* Now playing bar */}
          {selectedStream && (
            <div className="shrink-0 flex items-center gap-3 bg-white/[0.025] border border-white/[0.05] rounded-xl px-3.5 py-2.5">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-white/[0.04] flex items-center justify-center overflow-hidden">
                {selectedStream.tvgLogo
                  ? <img src={selectedStream.tvgLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <Tv className="w-4 h-4 text-white/15" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate text-white/85">{selectedStream.name}</p>
                  {bufferState === 'playing' && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/12 rounded-full px-1.5 py-0.5">
                      <Wifi className="w-2.5 h-2.5" />ON AIR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedStream.group && <p className="text-[10px] text-white/25">{selectedStream.group}</p>}
                  {totalSources > 1 && <p className="text-[10px] text-white/15">· {totalSources} sources</p>}
                  <span className="text-[9px] text-emerald-500/35 flex items-center gap-0.5">
                    <Database className="w-2 h-2" />verified
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(selectedStream.url)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isFav
                    ? 'bg-red-500/12 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-white/50 hover:bg-white/[0.06]'
                  }`}
              >
                <Heart className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
        </main>

        {/* ── Scores sidebar ── */}
        {scoresOpen && (
          <aside className="w-[280px] shrink-0 border-l border-white/[0.05] overflow-hidden flex flex-col">
            <ScoresPanel />
          </aside>
        )}
      </div>

      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar { width: 2px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }
        .sidebar-scroll:hover::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 3px; }
      `}</style>
    </div>
  );
}
