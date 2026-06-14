'use client';

import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import parser from 'iptv-playlist-parser';
import { Heart, Search, Tv, X, Signal, RefreshCw } from 'lucide-react';

interface Stream {
  name: string;
  url: string;
  tvgLogo?: string;
  group?: string;
}

type Playlist = 'sports' | 'worldcup';

export default function MatchdayLive() {
  const [activePlaylist, setActivePlaylist] = useState<Playlist>('sports');
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [activeGroup, setActiveGroup] = useState('All');
  const [bufferState, setBufferState] = useState<'loading' | 'playing' | 'error'>('loading');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mdFavorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('mdFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Load playlist whenever activePlaylist changes
  useEffect(() => {
    (async () => {
      setLoading(true);
      setStreams([]);
      setSelectedStream(null);
      setSearchTerm('');
      setActiveGroup('All');
      setActiveTab('all');
      try {
        const url = activePlaylist === 'sports' ? '/playlist.m3u' : '/WorldCup.m3u';
        const res = await fetch(url);
        const text = await res.text();
        const result = parser.parse(text);
        const parsed: Stream[] = result.items.map(item => ({
          name: item.name || 'Unknown',
          url: item.url,
          tvgLogo: item.tvg?.logo,
          group: item.group?.title,
        }));
        setStreams(parsed);
        if (parsed.length > 0) setSelectedStream(parsed[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [activePlaylist]);

  // HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedStream) return;

    setBufferState('loading');
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        backBufferLength: 30,
        startLevel: -1,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => { }); });
      hls.on(Hls.Events.FRAG_BUFFERED, () => { setBufferState('playing'); });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { setBufferState('error'); hls.destroy(); }
        }
      });

      hls.loadSource(selectedStream.url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = selectedStream.url;
      video.play().catch(() => { });
      setBufferState('playing');
    } else {
      setBufferState('error');
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [selectedStream]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'f') { document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen(); }
      if (e.key === ' ') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
      if (e.key === 'm') video.muted = !video.muted;
      if (e.key === 'ArrowUp') { e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFavorite = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => prev.includes(url) ? prev.filter(f => f !== url) : [...prev, url]);
  };

  const groups = ['All', ...Array.from(new Set(streams.map(s => s.group).filter(Boolean) as string[]))];

  const visibleStreams = streams.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = activeGroup === 'All' || s.group === activeGroup;
    const matchTab = activeTab === 'all' || favorites.includes(s.url);
    return matchSearch && matchGroup && matchTab;
  });

  return (
    <div className="h-screen bg-[#080810] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-white/[0.06] flex items-center px-5 gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm shrink-0">⚽</div>
        <span className="font-bold tracking-tight">Matchday<span className="text-emerald-400">Live</span></span>

        {/* Playlist switcher */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl ml-4">
          <button
            onClick={() => setActivePlaylist('sports')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activePlaylist === 'sports' ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60'}`}
          >
            ⚽ Sports
          </button>
          <button
            onClick={() => setActivePlaylist('worldcup')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activePlaylist === 'worldcup' ? 'bg-amber-500/80 text-white' : 'text-white/35 hover:text-white/60'}`}
          >
            🏆 World Cup
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-xs text-white/20">
          <span>F · fullscreen</span>
          <span className="mx-1">·</span>
          <span>Space · play/pause</span>
          <span className="mx-1">·</span>
          <span>M · mute</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="px-3 pt-3 pb-2 flex gap-1 shrink-0">
            {(['all', 'favorites'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {tab === 'all' ? `All · ${streams.length}` : `❤️ · ${favorites.length}`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 h-9">
              <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/20"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}><X className="w-3 h-3 text-white/30" /></button>
              )}
            </div>
          </div>

          {/* Group Pills */}
          {groups.length > 2 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${activeGroup === g ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/35 hover:text-white/70'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-white/20">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <p className="text-xs">Loading channels...</p>
              </div>
            ) : visibleStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/20">
                <Tv className="w-6 h-6" />
                <p className="text-xs">No channels found</p>
              </div>
            ) : (
              visibleStreams.map(stream => {
                const isActive = selectedStream?.url === stream.url;
                const isFav = favorites.includes(stream.url);
                return (
                  <div
                    key={stream.url}
                    onClick={() => setSelectedStream(stream)}
                    className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 border ${isActive ? 'bg-emerald-600/15 border-emerald-500/20' : 'hover:bg-white/[0.04] border-transparent'}`}
                  >
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                      {stream.tvgLogo
                        ? <img src={stream.tvgLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <Tv className="w-3.5 h-3.5 text-white/15" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-emerald-300' : 'text-white/70'}`}>{stream.name}</p>
                      {stream.group && <p className="text-[10px] text-white/25 truncate">{stream.group}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && <Signal className="w-3 h-3 text-emerald-400" />}
                      <button
                        onClick={e => toggleFavorite(stream.url, e)}
                        className={`transition-colors ${isFav ? 'text-red-400' : 'text-white/0 group-hover:text-white/20 hover:!text-red-400'}`}
                      >
                        <Heart className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Player */}
        <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden min-w-0">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/[0.06] flex-1">
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="w-full h-full"
            />

            {bufferState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                  <p className="text-xs text-white/40">Connecting to stream...</p>
                </div>
              </div>
            )}

            {bufferState === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <X className="w-8 h-8 text-red-400/50" />
                  <p className="text-sm text-white/40">Stream unavailable</p>
                  <p className="text-xs text-white/20">Pick another channel</p>
                </div>
              </div>
            )}

            {bufferState === 'playing' && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/60 tracking-widest">LIVE</span>
              </div>
            )}
          </div>

          {/* Now playing */}
          {selectedStream && (
            <div className="shrink-0 flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                {selectedStream.tvgLogo
                  ? <img src={selectedStream.tvgLogo} alt="" className="w-full h-full object-contain p-0.5" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <Tv className="w-4 h-4 text-white/15" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedStream.name}</p>
                {selectedStream.group && <p className="text-xs text-emerald-400/70">{selectedStream.group}</p>}
              </div>
              <button
                onClick={() => toggleFavorite(selectedStream.url)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
              >
                <Heart
                  className={`w-4 h-4 ${favorites.includes(selectedStream.url) ? 'text-red-400' : 'text-white/25'}`}
                  fill={favorites.includes(selectedStream.url) ? 'currentColor' : 'none'}
                />
              </button>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>
    </div>
  );
}
