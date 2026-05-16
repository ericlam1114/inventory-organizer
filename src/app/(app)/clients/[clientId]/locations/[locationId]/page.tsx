import Link from 'next/link';
import { Plus, ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LocationPage({
  params,
}: { params: Promise<{ clientId: string; locationId: string }> }) {
  const { clientId, locationId } = await params;
  const supabase = await createClient();

  const { data: location } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('id', locationId)
    .maybeSingle();
  if (!location) notFound();

  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-8">
      <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]">
        <ChevronLeft size={14} /> Back
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-medium leading-[40px]">{location.name}</h1>
        <Link
          href={`/clients/${clientId}/locations/new?parent=${locationId}`}
          className="inline-flex items-center gap-2 bg-surface border border-rule text-ink px-4 py-2.5 rounded-[2px] hover:bg-paper text-[13px] font-medium"
        >
          <Plus size={14} /> Sub-location
        </Link>
      </div>
      <p className="text-ink3 text-[15px]">
        Items + photos for this location land here. Capture some via the Capture tab below.
      </p>
    </div>
  );
}
