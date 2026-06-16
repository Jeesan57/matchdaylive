// components/ScoresPanel.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Wifi, CircleDot, ChevronDown } from 'lucide-react';
import type { MatchScore } from '@/app/api/scores/route';

const LEAGUES = [
  { key: 'premierleague', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
  { key: 'ucl', label: '⭐ Champions League' },
  { key: 'football', label: '🏆 World Cup 2026' },
  { key: 'laliga', label: '🇪🇸 La Liga' },
  { key: 'bundesliga', label: '🇩🇪 Bundesliga' },
  { key: 'seriea', label: '🇮🇹 Serie A' },
  { key: 'ligue1', label: '🇫🇷 Ligue 1' },
  { key: 'nba', label: '🏀 NBA' },
  { key: 'cricket', label: '🏏 Cricket' },
];

const REFRESH_MS = 30_000;

// ── Sub-components ─────────────────────────────────────────────────────────────

function TeamCrest({ src, name }: { src?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className="w-5 h-5 object-contain"
      />
    );
  }
  // Fallback: initials
  return (
    <div className="w-5 h-5 rounded-sm bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/40">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatusChip({ match }: { match: MatchScore }) {
  const { isLive, isFinished, status } = match;
  if (isLive) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 shrink-0 tabular-nums">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
      {status}
    </span>
  );
  if (isFinished) return (
    <span className="text-[9px] font-semibold text-white/20 shrink-0">FT</span>
  );
  return (
    <span className="text-[9px] font-medium text-white/30 shrink-0 tabular-nums">{status}</span>
  );
}

function MatchCard({ match }: { match: MatchScore }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const homeWin = hasScore && Number(match.homeScore) > Number(match.awayScore);
  const awayWin = hasScore && Number(match.awayScore) > Number(match.homeScore);

  return (
    <div className={`px-3 py-2.5 transition-all border-b border-white/[0.04] last:border-0 ${match.isLive ? 'bg-red-500/[0.04]' : 'hover:bg-white/[0.02]'
      }`}>
      {/* Home row */}
      <div className="flex items-center gap-2 mb-1.5">
        <TeamCrest src={match.homeCrest} name={match.homeTeam} />
        <span className={`flex-1 text-[11px] font-semibold truncate ${homeWin ? 'text-white/90' : 'text-white/55'
          }`}>
          {match.homeTeam}
        </span>
        {hasScore && (
          <span className={`text-sm font-bold tabular-nums w-4 text-right ${homeWin ? 'text-white/90' : 'text-white/45'
            }`}>
            {match.homeScore}
          </span>
        )}
      </div>

      {/* Away row */}
      <div className="flex items-center gap-2">
        <TeamCrest src={match.awayCrest} name={match.awayTeam} />
        <span className={`flex-1 text-[11px] font-semibold truncate ${awayWin ? 'text-white/90' : 'text-white/55'
          }`}>
          {match.awayTeam}
        </span>
        {hasScore && (
          <span className={`text-sm font-bold tabular-nums w-4 text-right ${awayWin ? 'text-white/90' : 'text-white/45'
            }`}>
            {match.awayScore}
          </span>
        )}
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between mt-1.5">
        <StatusChip match={match} />
        {match.venue && (
          <span className="text-[8px] text-white/15 truncate ml-2 max-w-[120px]">{match.venue}</span>
        )}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function ScoresPanel() {
  const [league, setLeague] = useState('premierleague');
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [leagueLabel, setLeagueLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const liveCount = scores.filter(s => s.isLive).length;

  const fetchScores = useCallback(async (lg: string) => {
    setLoading(true);
    setError(false);
    setCountdown(REFRESH_MS / 1000);
    try {
      const res = await fetch(`/api/scores?sport=${lg}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScores(data.scores ?? []);
      setLeagueLabel(data.league ?? '');
      setUpdatedAt(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    fetchScores(league);

    timerRef.current = setInterval(() => fetchScores(league), REFRESH_MS);
    countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);

    return () => {
      clearInterval(timerRef.current!);
      clearInterval(countRef.current!);
    };
  }, [league, fetchScores]);

  const switchLeague = (lg: string) => {
    setLeague(lg);
    setScores([]);
    setDropOpen(false);
    clearInterval(timerRef.current!);
    clearInterval(countRef.current!);
  };

  const live = scores.filter(s => s.isLive);
  const upcoming = scores.filter(s => !s.isLive && !s.isFinished);
  const finished = scores.filter(s => s.isFinished);

  return (
    <div className="flex flex-col h-full bg-[#07070f] border-l border-white/[0.05]">

      {/* ── Header ── */}
      <div className="px-3 pt-3 pb-2 shrink-0 border-b border-white/[0.05]">

        {/* Title row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <CircleDot className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-bold text-white/70">Live Scores</span>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {liveCount} LIVE
              </span>
            )}
          </div>
          <button
            onClick={() => { clearInterval(timerRef.current!); clearInterval(countRef.current!); fetchScores(league); timerRef.current = setInterval(() => fetchScores(league), REFRESH_MS); countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000); }}
            disabled={loading}
            className="p-1 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            title="Refresh now"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* League picker */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(v => !v)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
          >
            <span>{LEAGUES.find(l => l.key === league)?.label ?? 'Select league'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${dropOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[#0e0e1c] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/70 z-30 overflow-hidden">
              <div className="max-h-56 overflow-y-auto py-1">
                {LEAGUES.map(l => (
                  <button
                    key={l.key}
                    onClick={() => switchLeague(l.key)}
                    className={`w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center justify-between ${league === l.key
                        ? 'bg-emerald-600/15 text-emerald-300'
                        : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'
                      }`}
                  >
                    {l.label}
                    {league === l.key && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Meta row */}
        {updatedAt && !loading && (
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[9px] text-white/15 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" />
              {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[9px] text-white/15">
              refresh in {countdown}s
            </p>
          </div>
        )}
      </div>

      {/* ── Scores list ── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">

        {/* Loading */}
        {loading && scores.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/20">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-[10px]">Loading {LEAGUES.find(l => l.key === league)?.label}…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="m-3 p-3 rounded-xl bg-red-500/8 border border-red-500/12 text-center">
            <p className="text-[11px] text-red-400/70 font-medium">Failed to load scores</p>
            <p className="text-[10px] text-white/20 mt-1">Check your connection</p>
            <button onClick={() => fetchScores(league)} className="mt-2 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* No matches */}
        {!loading && !error && scores.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-[11px] text-white/25">No matches today</p>
            <p className="text-[10px] text-white/15 mt-1">Try a different league</p>
          </div>
        )}

        {/* ── Live ── */}
        {live.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-2 sticky top-0 bg-[#07070f]/95 backdrop-blur-sm z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-bold text-red-400/70 uppercase tracking-widest">Live Now · {live.length}</span>
            </div>
            {live.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}

        {/* ── Upcoming ── */}
        {upcoming.length > 0 && (
          <div>
            <div className="px-3 py-2 sticky top-0 bg-[#07070f]/95 backdrop-blur-sm z-10">
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Upcoming · {upcoming.length}</span>
            </div>
            {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}

        {/* ── Results ── */}
        {finished.length > 0 && (
          <div>
            <div className="px-3 py-2 sticky top-0 bg-[#07070f]/95 backdrop-blur-sm z-10">
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Results · {finished.length}</span>
            </div>
            {finished.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
