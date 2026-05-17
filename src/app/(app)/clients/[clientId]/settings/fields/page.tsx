import Link from 'next/link';
import { Plus, ChevronLeft, Sliders } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function FieldsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Authz: client_admin and client_team are NOT allowed
  const [{ data: orgRoles }, { data: membership }] = await Promise.all([
    supabase.from('org_roles').select('role').eq('user_id', user.id),
    supabase
      .from('client_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle(),
  ]);

  const orgRole = orgRoles?.[0]?.role;
  const memberRole = membership?.role;
  const allowed =
    orgRole === 'super_admin' ||
    orgRole === 'org_team_all' ||
    memberRole === 'org_team_per_client';

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto p-12 text-center">
        <p className="text-ink3 text-[15px]">You don&apos;t have access to manage custom fields for this client.</p>
      </div>
    );
  }

  const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
  if (!client) notFound();

  const { data: fields } = await supabase
    .from('custom_field_definitions')
    .select('id, name, key, type, options, required, position')
    .eq('client_id', clientId)
    .order('position');

  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-8">
      <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]">
        <ChevronLeft size={14} /> Back
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink3 text-[13px] uppercase tracking-wide">Settings · {client.name}</p>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2] mt-1">Custom fields</h1>
          <p className="text-ink3 text-[13px] mt-1">
            {(fields ?? []).length} field{(fields ?? []).length !== 1 ? 's' : ''} defined for {client.name}
          </p>
        </div>
        <Link
          href={`/clients/${clientId}/settings/fields/new`}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
        >
          <Plus size={14} /> New field
        </Link>
      </div>

      {(!fields || fields.length === 0) ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
            <Sliders size={20} />
          </div>
          <h3 className="text-[16px] font-medium mb-1">No custom fields</h3>
          <p className="text-ink3 text-[14px] mb-5 max-w-xs mx-auto">
            Add fields like &ldquo;Designer&rdquo; or &ldquo;When worn&rdquo; to capture richer metadata on items.
          </p>
          <Link
            href={`/clients/${clientId}/settings/fields/new`}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
          >
            <Plus size={14} /> New field
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-rule rounded-[4px] border border-rule bg-surface">
          {fields.map((f) => (
            <li key={f.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-paper min-h-[48px]">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{f.name}</p>
                <p className="text-ink3 text-[12px]">key: <code>{f.key}</code> · {f.type}{f.required ? ' · required' : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/clients/${clientId}/settings/fields/${f.id}`}
                  className="bg-surface border border-rule text-ink px-3 py-1.5 rounded-[2px] hover:bg-paper text-[13px]"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
