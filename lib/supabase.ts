import { createClient } from '@supabase/supabase-js';

// Lazy — called at runtime, not at module load / build time
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

export interface DBStream {
  id?: string;
  name: string;
  url: string;
  group_name?: string;
  backups?: string[];
  playlist: string;
  last_checked?: string;
}

/** Load all working streams for a given playlist key */
export async function loadStreams(playlist: string): Promise<DBStream[]> {
  const { data, error } = await getSupabase()
    .from('streams')
    .select('*')
    .eq('playlist', playlist)
    .order('name');
  if (error) { console.error('loadStreams error:', error.message); return []; }
  return data ?? [];
}

/** Sync results to Supabase via API route (keeps service key server-side) */
export async function syncStreams(
  results: { name: string; url: string; group: string; backups?: string[]; status: string }[],
  playlist: string
): Promise<{ saved: number; removed: number }> {
  const res = await fetch('/api/sync-streams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, playlist }),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`);
  return res.json();
}
