import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RestoreLocationButton } from './RestoreLocationButton';

export default async function LocationTrashPage({ params }: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, deleted_at, deleted_group_id')
    .eq('client_id', clientId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  const roots = (locations ?? []).filter((location) => location.id === location.deleted_group_id);

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-6">
      <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]">
        <ChevronLeft size={14} /> Back
      </Link>
      <div>
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Location Trash</h1>
        <p className="text-ink3 text-[13px] mt-2">Restore a location and everything inside it to your inventory.</p>
      </div>
      {roots.length === 0 ? (
        <p className="bg-surface border border-rule rounded-[4px] p-6 text-ink3 text-[14px]">No locations in Trash.</p>
      ) : (
        <ul className="space-y-2">
          {roots.map((location) => (
            <li key={location.id} className="flex items-center justify-between gap-4 bg-surface border border-rule rounded-[4px] p-4">
              <div>
                <p className="text-ink font-medium">{location.name}</p>
                {location.deleted_at && <p className="text-ink3 text-[12px] mt-1">Moved to Trash {new Date(location.deleted_at).toLocaleDateString()}</p>}
              </div>
              <RestoreLocationButton clientId={clientId} locationId={location.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
