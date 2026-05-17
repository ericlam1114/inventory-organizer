import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  if (error) throw error;

  // If user has access to exactly 1 client, jump straight in.
  if (clients && clients.length === 1) {
    redirect(`/clients/${clients[0].id}`);
  }

  // Check super_admin for "+ New client" link
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roles } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user!.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  const isSuperAdmin = !!roles;

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12 space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Clients</h1>
          <p className="text-ink3 text-[14px] mt-1">
            {(clients ?? []).length} client{(clients ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            href="/clients/new"
            className="shrink-0 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
          >
            + New client
          </Link>
        )}
      </div>
      {clients && clients.length === 0 ? (
        isSuperAdmin ? (
          <p className="text-ink3">No clients yet. Click <strong>+ New client</strong> to add your first one.</p>
        ) : (
          <p className="text-ink3">You have no access. Ask Janelle for an invite.</p>
        )
      ) : (
        <ul className="divide-y divide-rule rounded-[4px] border border-rule bg-surface">
          {clients?.map((c) => (
            <li key={c.id} className="group">
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-paper min-h-[48px]"
              >
                <span className="text-[15px] font-medium flex-1">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
