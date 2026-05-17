import Link from 'next/link';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSignedPhotoUrlsServer } from '@/lib/photos/public-url.server';
import { QuickStartTemplates } from '@/components/QuickStartTemplates';
import { TimeGroupedItems, groupItemsByTime } from '@/components/TimeGroupedItems';

export default async function ClientHomePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', clientId).maybeSingle();
  if (!client) notFound();

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('client_id', clientId)
    .order('name');

  const locationIds = (locations ?? []).map((l) => l.id);

  // Recent items across all locations (last 30 days, max 40)
  const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  let items: Array<{
    id: string;
    title: string;
    description: string;
    status: 'active' | 'donated' | 'archived';
    metadata: Record<string, string>;
    needsMetadata: boolean;
    createdAt: string;
    coverSignedUrl: string | null;
  }> = [];

  if (locationIds.length > 0) {
    const { data: rawItems } = await supabase
      .from('items_with_status')
      .select('id, title, description, status, metadata, cover_photo_id, needs_metadata, created_at, location_id')
      .in('location_id', locationIds)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(40);

    // Pre-sign cover photos
    const coverIds = (rawItems ?? []).map((i) => i.cover_photo_id).filter(Boolean) as string[];
    let signedByPath = new Map<string, string>();
    let coverPathByItemId = new Map<string, string>();
    if (coverIds.length > 0) {
      const { data: coverRows } = await supabase
        .from('item_photos')
        .select('id, storage_path, item_id')
        .in('id', coverIds);
      if (coverRows) {
        for (const row of coverRows) coverPathByItemId.set(row.item_id, row.storage_path);
        signedByPath = await getSignedPhotoUrlsServer(coverRows.map((r) => r.storage_path));
      }
    }

    items = (rawItems ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description ?? '',
      status: i.status as 'active' | 'donated' | 'archived',
      metadata: (i.metadata ?? {}) as Record<string, string>,
      needsMetadata: i.needs_metadata as boolean,
      createdAt: i.created_at,
      coverSignedUrl: i.cover_photo_id
        ? (signedByPath.get(coverPathByItemId.get(i.id) ?? '') ?? null)
        : null,
    }));
  }

  const groups = groupItemsByTime(items);
  const totalItems = locationIds.length > 0 ? (await supabase
    .from('items_with_status')
    .select('id', { count: 'exact', head: true })
    .in('location_id', locationIds)).count ?? 0 : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">
            {client.name}
          </h1>
          <p className="text-ink3 text-[13px] mt-1">
            {(locations ?? []).length} location{(locations ?? []).length !== 1 ? 's' : ''}{' '}
            · {totalItems} item{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href={`/clients/${clientId}/locations/new`}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium shrink-0"
        >
          <Plus size={14} /> New location
        </Link>
      </div>

      {(locations ?? []).length === 0 ? (
        <QuickStartTemplates clientId={clientId} />
      ) : items.length === 0 ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <h3 className="text-[16px] font-medium mb-1">No recent items</h3>
          <p className="text-ink3 text-[14px] max-w-xs mx-auto">
            Use Capture to photograph items, or browse a location in the sidebar.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium">Recently captured</h2>
          </div>
          <TimeGroupedItems clientId={clientId} groups={groups} />
        </div>
      )}
    </div>
  );
}
