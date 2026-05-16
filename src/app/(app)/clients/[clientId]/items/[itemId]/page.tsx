import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSignedPhotoUrlsServer } from '@/lib/photos/public-url.server';
import { ItemMetadataForm } from './ItemMetadataForm';
import { ItemPhotos } from './ItemPhotos';
import { ItemActions } from './ItemActions';
import { HistoryPanel } from './HistoryPanel';

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; itemId: string }>;
}) {
  const { clientId, itemId } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('items')
    .select('id, title, description, metadata, status, location_id, cover_photo_id, created_at')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) notFound();

  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('id', item.location_id)
    .maybeSingle();

  const { data: photos } = await supabase
    .from('item_photos')
    .select('id, storage_path, created_at')
    .eq('item_id', itemId)
    .order('created_at');

  const { data: fields } = await supabase
    .from('custom_field_definitions')
    .select('id, name, key, type, options, required, position')
    .eq('client_id', clientId)
    .order('position');

  const { data: locationsForClient } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('client_id', clientId)
    .order('name');

  const { data: history } = await supabase
    .from('audit_log')
    .select('id, action, before, after, created_at, user_id')
    .eq('target_type', 'item')
    .eq('target_id', itemId)
    .order('created_at', { ascending: false });

  // Look up display names for any user_ids in history
  const historyUserIds = Array.from(
    new Set((history ?? []).map((h) => h.user_id).filter(Boolean) as string[]),
  );
  const { data: historyProfiles } = historyUserIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, deleted_at')
        .in('id', historyUserIds)
    : { data: [] };
  const profilesById = new Map(
    (historyProfiles ?? []).map((p) => [p.id, p] as const),
  );

  // Look up location names referenced in history (move actions)
  const historyLocIds = new Set<string>();
  for (const h of history ?? []) {
    const before = (h.before ?? {}) as Record<string, unknown>;
    const after = (h.after ?? {}) as Record<string, unknown>;
    if (typeof before.location_id === 'string') historyLocIds.add(before.location_id);
    if (typeof after.location_id === 'string') historyLocIds.add(after.location_id);
  }
  const { data: historyLocations } = historyLocIds.size > 0
    ? await supabase
        .from('locations')
        .select('id, name')
        .in('id', Array.from(historyLocIds))
    : { data: [] };
  const locationNameById = new Map(
    (historyLocations ?? []).map((l) => [l.id, l.name] as const),
  );

  // Pre-sign all photo URLs (server-side)
  const signedUrls = await getSignedPhotoUrlsServer(
    (photos ?? []).map((p) => p.storage_path),
  );

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-12 space-y-8">
      <Link
        href={`/clients/${clientId}/locations/${item.location_id}`}
        className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]"
      >
        <ChevronLeft size={14} /> {location?.name ?? 'Back'}
      </Link>

      <ItemPhotos
        clientId={clientId}
        itemId={itemId}
        photos={(photos ?? []).map((p) => ({
          id: p.id,
          storagePath: p.storage_path,
          signedUrl: signedUrls.get(p.storage_path) ?? null,
        }))}
        coverPhotoId={item.cover_photo_id}
      />

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[32px] font-medium leading-[40px] flex-1">{item.title}</h1>
        <ItemActions
          itemId={itemId}
          clientId={clientId}
          currentStatus={item.status as 'active' | 'donated' | 'archived'}
          currentLocationId={item.location_id}
          locations={(locationsForClient ?? []).map((l) => ({
            id: l.id,
            name: l.name,
            parent_location_id: l.parent_location_id,
          }))}
        />
      </div>

      <ItemMetadataForm
        itemId={itemId}
        clientId={clientId}
        initialDescription={item.description ?? ''}
        initialMetadata={(item.metadata ?? {}) as Record<string, string>}
        fields={(fields ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          key: f.key,
          type: f.type as 'text' | 'date' | 'select',
          options: (f.options as string[] | null) ?? null,
          required: f.required,
        }))}
      />

      <section className="bg-surface border border-rule rounded-[4px] p-6 space-y-3">
        <h2 className="text-[18px] font-medium">Comments</h2>
        <p className="text-ink3 text-[13px]">Coming in slice 04.</p>
      </section>

      <HistoryPanel
        entries={(history ?? []).map((h) => ({
          id: h.id,
          action: h.action,
          before: h.before as Record<string, unknown> | null,
          after: h.after as Record<string, unknown> | null,
          createdAt: h.created_at,
          actor: h.user_id ? profilesById.get(h.user_id) ?? null : null,
        }))}
        locationNameById={locationNameById}
      />
    </div>
  );
}
