// app/api/scores/route.ts
import { NextRequest, NextResponse } from 'next/server';

export interface MatchScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | null;
  awayScore: string | null;
  homeCrest?: string;
  awayCrest?: string;
  status: string;       // "45'", "HT", "FT", "19:00"
  isLive: boolean;
  isFinished: boolean;
  competition: string;
  competitionLogo?: string;
  venue?: string;
  startTime?: string;   // ISO string for upcoming
}

// ── ESPN sport slugs ───────────────────────────────────────────────────────────
const ESPN_SPORTS: Record<string, { sport: string; league: string; label: string }> = {
  football: { sport: 'soccer', league: 'fifa.world', label: 'World Cup 2026' },
  premierleague: { sport: 'soccer', league: 'eng.1', label: 'Premier League' },
  laliga: { sport: 'soccer', league: 'esp.1', label: 'La Liga' },
  seriea: { sport: 'soccer', league: 'ita.1', label: 'Serie A' },
  bundesliga: { sport: 'soccer', league: 'ger.1', label: 'Bundesliga' },
  ligue1: { sport: 'soccer', league: 'fra.1', label: 'Ligue 1' },
  ucl: { sport: 'soccer', league: 'UEFA.CHAMPIONS', label: 'Champions League' },
  nba: { sport: 'basketball', league: 'nba', label: 'NBA' },
  cricket: { sport: 'cricket', league: 'icc.world20', label: 'ICC T20' },
};

function parseESPN(data: any, leagueLabel: string): MatchScore[] {
  const events: any[] = data?.events ?? [];
  return events.map((ev: any): MatchScore => {
    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];
    const statusObj = ev.status ?? {};
    const stateType = statusObj.type?.name ?? '';           // STATUS_IN_PROGRESS / STATUS_FINAL / STATUS_SCHEDULED
    const clock = statusObj.displayClock ?? '';
    const period = statusObj.period ?? 0;
    const isLive = stateType === 'STATUS_IN_PROGRESS';
    const isFinished = stateType === 'STATUS_FINAL';

    // Human-readable status
    let status: string;
    if (isLive && period === 2 && clock === '0:00') status = 'HT';
    else if (isLive) status = clock ? `${clock}'` : 'LIVE';
    else if (isFinished) status = 'FT';
    else {
      // Upcoming — show local time
      const d = new Date(ev.date);
      status = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return {
      id: ev.id,
      homeTeam: home?.team?.shortDisplayName ?? home?.team?.displayName ?? '?',
      awayTeam: away?.team?.shortDisplayName ?? away?.team?.displayName ?? '?',
      homeScore: isLive || isFinished ? (home?.score ?? null) : null,
      awayScore: isLive || isFinished ? (away?.score ?? null) : null,
      homeCrest: home?.team?.logo,
      awayCrest: away?.team?.logo,
      status,
      isLive,
      isFinished,
      competition: ev.season?.slug ? leagueLabel : (data?.leagues?.[0]?.name ?? leagueLabel),
      competitionLogo: data?.leagues?.[0]?.logos?.[0]?.href,
      venue: comp?.venue?.fullName,
      startTime: ev.date,
    };
  });
}

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get('sport') ?? 'premierleague';
  const cfg = ESPN_SPORTS[sport] ?? ESPN_SPORTS['premierleague'];

  // ESPN public scoreboard — no API key needed
  const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    const data = await res.json();
    const scores = parseESPN(data, cfg.label);

    // Sort: live first → upcoming → finished
    scores.sort((a, b) => {
      const rank = (s: MatchScore) => s.isLive ? 0 : !s.isFinished ? 1 : 2;
      return rank(a) - rank(b);
    });

    return NextResponse.json({
      scores,
      league: cfg.label,
      fetchedAt: new Date().toISOString(),
      source: 'ESPN',
    });
  } catch (err) {
    console.error('Scores fetch error:', err);
    return NextResponse.json({ scores: [], error: String(err) }, { status: 500 });
  }
}
