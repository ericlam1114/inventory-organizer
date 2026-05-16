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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-medium leading-[40px]">Clients</h1>
        {isSuperAdmin && (
          <Link
            href="/clients/new"
            className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
          >
            + New client
          </Link>
        )}
      </div>
      {clients && clients.length === 0 ? (
        <p className="text-ink3">You have no access. Ask Janelle for an invite.</p>
      ) : (
        <ul className="space-y-3">
          {clients?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="block bg-surface border border-rule rounded-[4px] p-6 hover:bg-paper"
              >
                <span className="text-[18px] font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
