import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ClientDetailPage({
  params,
}: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">{client.name}</h1>
      <p className="text-ink2 text-[15px]">
        Locations + inventory will land here in slice 02. For now, this is just proof RLS is working.
      </p>
    </div>
  );
}
