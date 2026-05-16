import Link from 'next/link';
import { ChevronLeft, Plus, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSignedPhotoUrlsServer } from '@/lib/photos/public-url.server';
import { LocationItemsView } from './LocationItemsView';

export default async function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; locationId: string }>;
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  const { clientId, locationId } = await params;
  const sp = await searchParams;
  const view: 'grid' | 'sheet' = sp.view === 'sheet' ? 'sheet' : 'grid';
  const filterNeeds = sp.filter === 'needs';

  const supabase = await createClient();
  const { data: location } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('id', locationId)
    .maybeSingle();
  if (!location) notFound();

  const { data: childLocations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('parent_location_id', locationId)
    .order('name');

  const { data: fields } = await supabase
    .from('custom_field_definitions')
    .select('id, name, key, type, options, required, position')
    .eq('client_id', clientId)
    .order('position');

  let itemsQuery = supabase
    .from('items_with_status')
    .select('id, title, description, status, metadata, cover_photo_id, needs_metadata, created_at')
    .eq('location_id', locationId);
  if (filterNeeds) itemsQuery = itemsQuery.eq('needs_metadata', true);
  const { data: items } = await itemsQuery.order('created_at', { ascending: false });

  // Pre-sign cover photos
  const coverIds = (items ?? []).map((i) => i.cover_photo_id).filter(Boolean) as string[];
  let coverPathByItemId = new Map<string, string>();
  let signedByPath = new Map<string, string>();
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

  const needsCount = (items ?? []).filter((i) => i.needs_metadata).length;

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-6">
      <Link
        href={location.parent_location_id ? `/clients/${clientId}/locations/${location.parent_location_id}` : `/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]"
      >
        <ChevronLeft size={14} /> Back
      </Link>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-medium leading-[40px]">{location.name}</h1>
        <Link
          href={`/clients/${clientId}/locations/new?parent=${locationId}`}
          className="inline-flex items-center gap-2 bg-surface border border-rule text-ink px-3 py-2 rounded-[2px] hover:bg-paper text-[13px]"
        >
          <Plus size={14} /> Sub-location
        </Link>
      </div>

      {(childLocations && childLocations.length > 0) && (
        <div className="bg-surface border border-rule rounded-[4px] p-4">
          <p className="text-[13px] text-ink3 mb-3 uppercase tracking-wide">Sub-locations</p>
          <ul className="flex flex-wrap gap-2">
            {childLocations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${clientId}/locations/${c.id}`}
                  className="inline-block bg-sand2 text-ink2 hover:text-ink px-3 py-1.5 rounded-[2px] text-[13px]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <Link
            href={`/clients/${clientId}/locations/${locationId}?view=grid${filterNeeds ? '&filter=needs' : ''}`}
            className={`px-3 py-1.5 rounded-[2px] text-[13px] ${view === 'grid' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
          >
            Grid
          </Link>
          <Link
            href={`/clients/${clientId}/locations/${locationId}?view=sheet${filterNeeds ? '&filter=needs' : ''}`}
            className={`px-3 py-1.5 rounded-[2px] text-[13px] ${view === 'sheet' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
          >
            Sheet
          </Link>
        </div>

        {needsCount > 0 && (
          <Link
            href={filterNeeds
              ? `/clients/${clientId}/locations/${locationId}?view=${view}`
              : `/clients/${clientId}/locations/${locationId}?view=${view}&filter=needs`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${filterNeeds ? 'bg-warning text-paper' : 'bg-sand2 text-warning hover:bg-warning hover:text-paper'}`}
          >
            <AlertTriangle size={12} />
            {filterNeeds ? 'Showing incomplete' : `Needs metadata (${needsCount})`}
          </Link>
        )}
      </div>

      <LocationItemsView
        clientId={clientId}
        view={view}
        items={(items ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description ?? '',
          status: i.status as 'active' | 'donated' | 'archived',
          metadata: (i.metadata ?? {}) as Record<string, string>,
          needsMetadata: i.needs_metadata as boolean,
          createdAt: i.created_at,
          coverSignedUrl: i.cover_photo_id ? (signedByPath.get(coverPathByItemId.get(i.id) ?? '') ?? null) : null,
        }))}
        fields={(fields ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          key: f.key,
          type: f.type as 'text' | 'date' | 'select',
          options: (f.options as string[] | null) ?? null,
          required: f.required,
        }))}
      />
    </div>
  );
}
