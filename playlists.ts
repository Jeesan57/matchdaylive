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
#EXTINF:-1 group-title="Brazil" backups="https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/720p-vtt/index.m3u8|https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8",Caze TV
https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/1080p-vtt/index.m3u8
#EXTINF:-1 group-title="Brazil" backups="https://video07.logicahost.com.br/rssports02/rssports02/playlist.m3u8|https://video07.logicahost.com.br/rssports03/rssports03/playlist.m3u8|https://video07.logicahost.com.br/rssports04/rssports04/playlist.m3u8",RS Sports 1
https://video07.logicahost.com.br/rssports01/rssports01/playlist.m3u8
#EXTINF:-1 group-title="Brazil",RS Sports 5
https://video03.logicahost.com.br/rssports5/rssports5/playlist.m3u8
#EXTINF:-1 group-title="Brazil",RS TV
https://video07.logicahost.com.br/rstv1/rstv1/playlist.m3u8
#EXTINF:-1 group-title="Sports" backups="https://rmtv.akamaized.net/hls/live/2043154/rmtv-en-web/master.m3u8|https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8",REAL MADRID TV ES
https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/bitrate_3.m3u8
#EXTINF:-1 group-title="Sports" backups="https://bein-esp-xumo.amagi.tv/playlistR720P.m3u8|https://amg01334-beinsportsllc-beinxtraesp-localnow-aekzc.amagi.tv/playlist.m3u8|https://bein-esp-xumo.amagi.tv/playlist.m3u8",BEIN SPORT EXTRA ES
https://bein-esp-xumo.amagi.tv/playlistR1080p.m3u8
#EXTINF:-1 group-title="Sports",IDMAN TV TR
https://str2.yodacdn.net/idman_300_to_small/tracks-v1a1/mono.m3u8
#EXTINF:-1 group-title="Sports",2TV Sport NO
https://tv.cdn.xsg.ge/gpb-2tv/index.m3u8
#EXTINF:-1 group-title="Sports",DAZN COMBAT
https://dazn-combat-rakuten.amagi.tv/hls/amagi_hls_data_rakutenAA-dazn-combat-rakuten/CDN/master.m3u8
#EXTINF:-1 group-title="Sports" backups="https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",Red Bull TV
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master_3360.m3u8
#EXTINF:-1 group-title="Sports",NBC Team USA
https://amg01416-amg01416c4-firetv-us-4522.playouts.now.amagi.tv/playlist.m3u8
#EXTINF:-1 group-title="Sports",AYM Sports
https://aym-as.otteravision.com/aym/as/as.m3u8
#EXTINF:-1 group-title="Sports",BEK Sports West USA
https://cdn3.wowza.com/5/ZWQ1K2NYTmpFbGsr/BEK-WOWZA-1/smil:BEKPRIMEW.smil/.m3u8
#EXTINF:-1 group-title="Sports",Garage TV
https://stream1.sersat.com/hls/garagetv.m3u8
#EXTINF:-1 group-title="Sports",FIGHT NETWORK
https://amg00966-amg00966c10-amgplt0201.playout.now3.amagi.tv/playlist/amg00966-amg00966c10-amgplt0201/playlist.m3u8
#EXTINF:-1 group-title="Sports",FUEL TV
https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01074-fueltv-fueltvemeaen-sportstribal/playlist.m3u8
#EXTINF:-1 group-title="Sports",Horse and Country
https://hncfree-sportstribal.amagi.tv/hls/amagi_hls_data_sportstri-hncfree-sportstribal/CDN/playlist.m3u8
#EXTINF:-1 group-title="Sports",MTR Sports-1 GB
https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg02873-kravemedia-mtrspt1-distrotv/playlist.m3u8
#EXTINF:-1 group-title="Sports",Sportdigital DE
https://jmp2.uk/stvp-ATAJ0500433A
#EXTINF:-1 group-title="Sports",L Equipe FR
https://jmp2.uk/stvp-FR200016Y5
#EXTINF:-1 group-title="Sports",SPORT ITALIA IT
https://amg01370-italiansportcom-sportitalia-rakuten-3hmdb.amagi.tv/amRdirect/ads_pod_type=playerpage_midroll&ads_env=prod&ads_ppid=&ads_rtvid=271861&ads_streaming_id=4f185419-74f6-4564-8ea9-4cdc60746e2f&ads_amagi_channel=781&ads_device_type=web&ads_device_model=&ads_device_year=&ads_player_width=&ads_rtv_content_language=ita&ads_market=it&ads_rtv_content_id=3741&ads_device_make=&ads_user_type=visitor&ads_content_classification=6&ads_gdpr_consent=&ads_device_lmt=1&ads_player_height=&uid=1gnmqg5gu-qsvc-bfo-gaq3-3dgjgexshpe/hls/amagi_hls_data_rakutenAA-sportitalia-rakuten/CDN/1920x1080_4540800/chunklist.m3u8
#EXTINF:-1 group-title="Sports",MASR QA
https://shls-masr-ak.akamaized.net/out/v1/d5036cabf11e45bf9d0db410ca135c18/index.m3u8
#EXTINF:-1 group-title="Sports",Susp Kiev Sport UA
https://tva.in.ua/live/susp-sport.m3u8
#EXTINF:-1 group-title="Sports",TVRI Sport 720p
https://ott-balancer.tvri.go.id/live/eds/SportHD/hls/SportHD-avc1_1500000=10003-mp4a_96000=20002.m3u8
#EXTINF:-1 group-title="Sports" backups="https://nbculocallive.akamaized.net/hls/live/2037499/puertorico/stream1/master.m3u8",Telemundo
https://nbculocallive.akamaized.net/hls/live/2037499/puertorico/stream1/master_720.m3u8
#EXTINF:-1 group-title="Sports",FOX NY
https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg00488-foxdigital-wnyw-lgus/playlist.m3u8
#EXTINF:-1 group-title="Bangladesh",BTV
https://owrcovcrpy.gpcdn.net/bpk-tv/1709/output/index.m3u8
#EXTINF:-1 group-title="Bangladesh",T Sports
http://luckonline.eu/live/y49sz6KMQs/6115263489/1142.ts
#EXTINF:-1 group-title="Latin" backups="https://1nyaler.streamhostingcdn.top/stream/84/index.m3u8",TyC Sports ARG
https://1nyaler.streamhostingcdn.top/stream/84/index.m3u8
#EXTINF:-1 group-title="Latin" backups="https://1nyaler.streamhostingcdn.top/stream/30/index.m3u8",TNT Sports ARG
https://1nyaler.streamhostingcdn.top/stream/30/index.m3u8
#EXTINF:-1 group-title="Latin" backups="http://181.78.71.71:18000/play/a03p/index.m3u8|http://190.60.39.195:8000/play/a0ug/index.m3u8",Win Sports
http://181.78.17.52:8000/play/a0pw/index.m3u8
#EXTINF:-1 group-title="Latin" backups="https://estrellatv-roku.amagi.tv/playlist.m3u8",Azteca 7
https://tv91.hostingnuclear.com:19360/xhunestv/xhunestv.m3u8
#EXTINF:-1 group-title="Latin",CLARO SPORTS
https://dai.google.com/linear/hls/event/_OKWx76jT7mivD6d-25QAw/master.m3u8`,

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
