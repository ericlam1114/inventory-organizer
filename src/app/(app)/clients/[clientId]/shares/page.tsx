import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShareDashboardClient } from './ShareDashboardClient';

export default async function SharesPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase.from('clients').select('id, name').eq('id', clientId).maybeSingle();
  if (!client) notFound();

  const { data: shares } = await supabase
    .from('shares')
    .select('id, root_location_id, token, expires_at, revoked_at, note, created_at, created_by')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  // Recipients per share
  const shareIds = (shares ?? []).map((s) => s.id);
  const { data: recipients } = shareIds.length > 0
    ? await supabase.from('share_recipients').select('share_id, email, view_count, last_viewed_at').in('share_id', shareIds)
    : { data: [] };
  const recipientsByShare = new Map<string, Array<{ email: string; viewCount: number; lastViewed: string | null }>>();
  for (const r of recipients ?? []) {
    const list = recipientsByShare.get(r.share_id) ?? [];
    list.push({ email: r.email, viewCount: r.view_count, lastViewed: r.last_viewed_at });
    recipientsByShare.set(r.share_id, list);
  }

  // Location names for root_location_id
  const locIds = Array.from(new Set((shares ?? []).map((s) => s.root_location_id)));
  const { data: locs } = locIds.length > 0
    ? await supabase.from('locations').select('id, name').in('id', locIds)
    : { data: [] };
  const locNameById = new Map((locs ?? []).map((l) => [l.id, l.name] as const));

  // For the create form: full location list
  const { data: allLocations } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('client_id', clientId)
    .order('name');

  const now = Date.now();
  const active = (shares ?? []).filter((s) => !s.revoked_at && new Date(s.expires_at).getTime() > now);
  const inactive = (shares ?? []).filter((s) => s.revoked_at || new Date(s.expires_at).getTime() <= now);

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-12 space-y-6">
      <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]">
        <ChevronLeft size={14} /> Back
      </Link>
      <ShareDashboardClient
        clientId={clientId}
        clientName={client.name}
        active={active.map((s) => ({
          id: s.id,
          token: s.token,
          locationName: locNameById.get(s.root_location_id) ?? '(unknown)',
          recipients: recipientsByShare.get(s.id) ?? [],
          expiresAt: s.expires_at,
          createdAt: s.created_at,
        }))}
        inactive={inactive.map((s) => ({
          id: s.id,
          token: s.token,
          locationName: locNameById.get(s.root_location_id) ?? '(unknown)',
          recipients: recipientsByShare.get(s.id) ?? [],
          expiresAt: s.expires_at,
          revokedAt: s.revoked_at,
          createdAt: s.created_at,
        }))}
        locations={(allLocations ?? []).map((l) => ({ id: l.id, name: l.name, parentLocationId: l.parent_location_id }))}
      />
    </div>
  );
}
