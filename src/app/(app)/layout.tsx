import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { RootSidebar } from '@/components/RootSidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell>
      {/* Root sidebar — hidden on md: when inside a client (ClientSidebar takes over) */}
      <RootSidebar />
      {/* Main content shifts right by sidebar width on desktop */}
      <main className="flex-1 min-w-0 md:pl-64">
        {children}
      </main>
    </AppShell>
  );
}
