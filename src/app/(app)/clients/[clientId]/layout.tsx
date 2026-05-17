import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientBottomNav } from '@/components/ClientBottomNav';
import { ClientSidebar } from '@/components/ClientSidebar';

export default async function ClientLayout({
  params,
  children,
}: {
  params: Promise<{ clientId: string }>;
  children: React.ReactNode;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  // Verify access (RLS returns null for inaccessible)
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle();

  if (!client) notFound();

  // Fetch locations for sidebar tree
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, parent_location_id')
    .eq('client_id', clientId)
    .order('name');

  // Fetch item counts for sidebar status pill
  const locationIds = (locations ?? []).map((l) => l.id);
  let itemCount = 0;
  let needsCount = 0;
  if (locationIds.length > 0) {
    const { data: counts } = await supabase
      .from('items_with_status')
      .select('id, needs_metadata')
      .in('location_id', locationIds);
    itemCount = counts?.length ?? 0;
    needsCount = counts?.filter((i) => i.needs_metadata).length ?? 0;
  }

  return (
    <>
      {/* Desktop sidebar — replaces RootSidebar for client routes */}
      <ClientSidebar
        clientName={client.name}
        locations={locations ?? []}
        itemCount={itemCount}
        needsCount={needsCount}
      />
      {/* Mobile: pad bottom for nav; desktop: pad bottom 0 */}
      <div
        className="flex-1 min-w-0"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
      <ClientBottomNav />
    </>
  );
}
