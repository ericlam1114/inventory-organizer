import Link from 'next/link';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LocationTree } from '@/components/LocationTree';

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

  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-medium leading-[40px]">{client.name}</h1>
        <Link
          href={`/clients/${clientId}/locations/new`}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
        >
          <Plus size={14} /> New location
        </Link>
      </div>

      <LocationTree clientId={clientId} locations={locations ?? []} />
    </div>
  );
}
