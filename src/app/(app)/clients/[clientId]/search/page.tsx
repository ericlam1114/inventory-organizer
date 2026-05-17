import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSignedPhotoUrlsServer } from '@/lib/photos/public-url.server';
import { StatusBadge } from '@/components/StatusBadge';

const STATUS_VALUES = ['active', 'donated', 'archived'] as const;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status = STATUS_VALUES.includes(sp.status as typeof STATUS_VALUES[number])
    ? (sp.status as typeof STATUS_VALUES[number])
    : null;

  const supabase = await createClient();

  // Fetch client name for subtitle
  const { data: clientRow } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .maybeSingle();
  const clientName = clientRow?.name ?? '';

  // Fetch locations for this client first so we can filter items by their location_id
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .eq('client_id', clientId);
  const locationIds = (locations ?? []).map((l) => l.id);
  const locationNameById = new Map((locations ?? []).map((l) => [l.id, l.name] as const));

  let results: Array<{
    id: string;
    title: string;
    description: string | null;
    status: 'active' | 'donated' | 'archived';
    location_id: string;
    cover_photo_id: string | null;
  }> = [];

  if (locationIds.length > 0 && (q || status)) {
    let query = supabase
      .from('items')
      .select('id, title, description, status, location_id, cover_photo_id')
      .in('location_id', locationIds);
    if (q) {
      // Sanitize for ilike — escape % and _ in user input
      const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    const { data } = await query.order('created_at', { ascending: false }).limit(100);
    results = (data ?? []) as typeof results;
  }

  // Sign covers
  const coverIds = results.map((r) => r.cover_photo_id).filter(Boolean) as string[];
  let signedByPath = new Map<string, string>();
  let pathByItemId = new Map<string, string>();
  if (coverIds.length > 0) {
    const { data: covers } = await supabase
      .from('item_photos')
      .select('id, storage_path, item_id')
      .in('id', coverIds);
    if (covers) {
      for (const c of covers) pathByItemId.set(c.item_id, c.storage_path);
      signedByPath = await getSignedPhotoUrlsServer(covers.map((c) => c.storage_path));
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-12 space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]"
      >
        <ChevronLeft size={14} /> Back
      </Link>

      <div>
        <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2]">Search</h1>
        <p className="text-ink3 text-[13px] mt-1">
          {q ? `${results.length} result${results.length !== 1 ? 's' : ''}` : `Across ${clientName}`}
        </p>
      </div>

      <form className="flex gap-2" action="" method="get">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles + descriptions…"
          className="flex-1 bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
        >
          Search
        </button>
      </form>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <ChipLink
          href={`/clients/${clientId}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`}
          active={status === null}
          label="All"
        />
        {STATUS_VALUES.map((s) => (
          <ChipLink
            key={s}
            href={`/clients/${clientId}/search?${q ? `q=${encodeURIComponent(q)}&` : ''}status=${s}`}
            active={status === s}
            label={s}
          />
        ))}
      </div>

      {!q && !status ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
            <Search size={20} />
          </div>
          <h3 className="text-[16px] font-medium mb-1">Search items</h3>
          <p className="text-ink3 text-[14px] max-w-xs mx-auto">
            Type a title or description to search across all locations for this client.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
            <Search size={20} />
          </div>
          <h3 className="text-[16px] font-medium mb-1">No matches</h3>
          <p className="text-ink3 text-[14px] max-w-xs mx-auto">
            Try a different term or clear the status filter.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule rounded-[4px] border border-rule bg-surface">
          {results.map((r) => {
            const cover = r.cover_photo_id
              ? (signedByPath.get(pathByItemId.get(r.id) ?? '') ?? null)
              : null;
            return (
              <li key={r.id} className="group">
                <Link
                  href={`/clients/${clientId}/items/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper min-h-[48px]"
                >
                  <div className="relative w-10 h-10 bg-paper shrink-0">
                    {cover && (
                      <Image src={cover} alt="" fill className="object-cover" sizes="40px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{r.title}</p>
                    <p className="text-ink3 text-[12px] truncate">
                      {locationNameById.get(r.location_id) ?? 'Unknown location'}
                      {r.description ? ` · ${r.description}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ChipLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-block px-3 py-1 rounded-full text-[12px] uppercase tracking-wide transition-colors ${
        active ? 'bg-sand2 text-ink font-medium' : 'bg-surface border border-rule text-ink2 hover:bg-sand2/60 hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}
