// app/api/sync-streams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StreamResult {
  name: string;
  url: string;
  group: string;
  backups?: string[];
  status: string;
}

export async function POST(req: NextRequest) {
  const { results, playlist } = (await req.json()) as {
    results: StreamResult[];
    playlist: string;
  };

  let saved = 0;
  let removed = 0;

  // Upsert working streams
  await Promise.all(
    results.map(async (r) => {
      if (r.status === 'ok') {
        const { error } = await supabaseAdmin.from('streams').upsert(
          {
            name: r.name,
            url: r.url,
            group_name: r.group || null,
            backups: r.backups ?? [],
            playlist,
            last_checked: new Date().toISOString(),
          },
          { onConflict: 'url' }
        );
        if (error) console.error('upsert error:', r.url, error.message);
        else saved++;
      }
    })
  );

  // Delete DB rows for this playlist whose URL is no longer in the playlist at all
  const currentUrls = results.map(r => r.url);
  const { data: dbRows } = await supabaseAdmin
    .from('streams')
    .select('url')
    .eq('playlist', playlist);

  const urlsToDelete = (dbRows ?? [])
    .map((row: { url: string }) => row.url)
    .filter((url: string) => !currentUrls.includes(url));

  if (urlsToDelete.length > 0) {
    const { error } = await supabaseAdmin
      .from('streams')
      .delete()
      .in('url', urlsToDelete);
    if (error) console.error('bulk delete error:', error.message);
    else removed += urlsToDelete.length;
  }

  return NextResponse.json({ saved, removed });
}

// ── DELETE: remove a single stream by URL ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { url } = (await req.json()) as { url: string };

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('streams')
    .delete()
    .eq('url', url);

  if (error) {
    console.error('delete error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
