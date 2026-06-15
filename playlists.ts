export type PlaylistKey = 'sports' | 'worldcup';

export interface Stream {
  name: string;
  url: string;
  tvgLogo?: string;
  group?: string;
  // fallback URLs tried in order when primary fails
  backups?: string[];
}

// ─── Raw M3U strings ───────────────────────────────────────────────────────────
export const PLAYLISTS: Record<PlaylistKey, string> = {
  sports: `#EXTM3U

  `,

  worldcup: `#EXTM3U
#EXTINF:-1 tvg-id="Somoy" tvg-name="Somoy" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",Somoy
https://live.thebosstv.com:30443/dwlive/Somoy-TV/chunks.m3u8
#EXTINF:-1 tvg-id="Bein_Sports_1" tvg-name="Bein Sports 1" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",Bein Sports 1
https://1nyaler.streamhostingcdn.top/stream/23/index.m3u8
#EXTINF:-1 tvg-id="WIN_Sports" tvg-name="WIN Sports" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",WIN Sports
https://1nyaler.streamhostingcdn.top/stream/32/index.m3u8
#EXTINF:-1 tvg-id="FOX" tvg-name="FOX" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",FOX
https://1nyaler.streamhostingcdn.top/stream/26/index.m3u8
#EXTINF:-1 tvg-id="T sports" tvg-name="T sports" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",T sports
http://198.195.239.50:8095/tsports/tracks-v1a1/mono.m3u8
#EXTINF:-1 tvg-id="DAZN 1" tvg-name="DAZN 1" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",DAZN 1
http://znty.dyndns.org:5010/hls/eleven1.m3u8
#EXTINF:-1 tvg-id="ESPN" tvg-name="ESPN" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",ESPN
https://1nyaler.streamhostingcdn.top/stream/97/index.m3u8
#EXTINF:-1 tvg-id="D Sports" tvg-name="D Sports" tvg-logo="https://i.postimg.cc/Y903JSq8/20260612-095648.jpg" group-title="FIFA",D Sports
https://1nyaler.streamhostingcdn.top/stream/106/index.m3u8
#EXTINF:-1 group-title="World Cup" backups="https://d1211whpimeups.cloudfront.net/smil:rtbgo/chunklist.m3u8|http://starhub.pro/live/farhat-3379/67897-913379/744517.ts|http://202.70.146.135:8000/play/a06s/index.m3u8",FIFA World Cup 2026
https://owrcovcrpy.gpcdn.net/bpk-tv/1702/output/1702-audio_113322_eng=113200-video=2202800.m3u8
#EXTINF:-1 group-title="World Cup" backups="http://starhub.pro/live/farhat-3379/67897-913379/745269.ts|http://starhub.pro/live/farhat-3379/67897-913379/745270.ts|http://ytoxw6un.ottclub.xyz/iptv/KCUHA6DGYYVA8ZZFUPQV3KZH/6408/index.m3u8",World Cup Sky
https://d1211whpimeups.cloudfront.net/smil:rtbgo/chunklist.m3u8
#EXTINF:-1 group-title="World Cup" backups="http://starhub.pro/live/farhat-3379/67897-913379/741567.ts",World Cup BEIN
http://starhub.pro/live/farhat-3379/67897-913379/744517.ts
#EXTINF:-1 group-title="World Cup",World Cup BIOSCOPE
https://streamsportixa.ajmainearafat.workers.dev/live.m3u8
#EXTINF:-1 group-title="India" backups="http://103.157.248.140:8000/play/a00g/index.m3u8",Star Sports 1 HD
http://41.205.93.154/STARSPORTS1/index.m3u8
#EXTINF:-1 group-title="India" backups="http://103.157.248.140:8000/play/a01m/index.m3u8",Star Sports 1 Hindi
http://103.157.248.140:8000/play/a00g/index.m3u8
#EXTINF:-1 group-title="India",Willow Sports 1080p
https://d36r8jifhgsk5j.cloudfront.net/Willow_TV.m3u8
#EXTINF:-1 group-title="Pakistan",PSL GEO SUPER
http://stalker.hakunamata.workers.dev/play/1100/index.m3u8
#EXTINF:-1 group-title="beIN" backups="https://andro.226503.xyz/checklist/androstreamlivebs1.m3u8|https://d9ssxzmclhfo4.cloudfront.net/bein_sports720p.m3u8|https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol1080.m3u8",beIN Sports 4K
http://go8knm.optikl.ink/X/index.php/Besyria3/video.m3u8
#EXTINF:-1 group-title="beIN" backups="https://andro.226503.xyz/checklist/androstreamlivebs2.m3u8|https://wahyu1ptv.pages.dev/AstroBein2.m3u8",BEIN Sports 1
https://andro.226503.xyz/checklist/androstreamlivebs1.m3u8
#EXTINF:-1 group-title="beIN" backups="https://andro.226503.xyz/checklist/androstreamlivebs3.m3u8|https://wahyu1ptv.pages.dev/AstroBein3.m3u8",BEIN Sports 2
https://andro.226503.xyz/checklist/androstreamlivebs2.m3u8
#EXTINF:-1 group-title="beIN",BEIN Sports 3
https://andro.226503.xyz/checklist/androstreamlivebs3.m3u8
#EXTINF:-1 group-title="beIN",BEIN Sports 4
https://andro.226503.xyz/checklist/androstreamlivebs4.m3u8
#EXTINF:-1 group-title="beIN",BEIN Sports 5
https://andro.226503.xyz/checklist/androstreamlivebs5.m3u8
#EXTINF:-1 group-title="beIN" backups="https://dc1644a9jazgj.cloudfront.net/beIN_Sports_Xtra_Espanol1080.m3u8",Bein Xtra 720p
https://d9ssxzmclhfo4.cloudfront.net/bein_sports720p.m3u8
#EXTINF:-1 group-title="FOX" backups="https://d1jzu95oc8fgt3.cloudfront.net/FOX_Sports720p.m3u8",FOX Sports
https://d1jzu95oc8fgt3.cloudfront.net/FOX_Sports720p.m3u8`,
};

// ─── Parser ────────────────────────────────────────────────────────────────────
export function parseM3U(text: string): Stream[] {
  const lines = text.split('\n');
  const items: Stream[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;
    const name = (line.match(/,(.+)$/) || [])[1]?.trim() || 'Unknown';
    const tvgLogo = (line.match(/tvg-logo="([^"]+)"/) || [])[1];
    const group = (line.match(/group-title="([^"]+)"/) || [])[1];
    const backupsRaw = (line.match(/backups="([^"]+)"/) || [])[1];
    const backups = backupsRaw ? backupsRaw.split('|').map(u => u.trim()).filter(Boolean) : undefined;
    const url = (lines[i + 1] || '').trim();
    if (url && !url.startsWith('#')) items.push({ name, url, tvgLogo, group, backups });
  }
  return items;
}
