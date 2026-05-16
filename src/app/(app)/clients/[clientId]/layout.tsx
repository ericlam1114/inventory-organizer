import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientBottomNav } from '@/components/ClientBottomNav';

export default async function ClientLayout({
  params,
  children,
}: {
  params: Promise<{ clientId: string }>;
  children: React.ReactNode;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  // Verify the user can see this client; otherwise 404 (RLS will return null for inaccessible)
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle();

  if (!client) notFound();

  return (
    <>
      <div style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>{children}</div>
      <ClientBottomNav />
    </>
  );
}
