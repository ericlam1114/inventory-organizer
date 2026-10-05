import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamClient, type Member, type PendingInvite } from './TeamClient';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Owner',
  org_team_all: 'Team · all clients',
  org_team_per_client: 'Team',
  client_admin: 'Client admin',
  client_team: "Client's team",
};

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: isAdmin } = await supabase
    .from('org_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle();
  if (!isAdmin) redirect('/clients');

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [{ data: clients }, { data: invites }, { data: orgRoles }, { data: memberships }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('team_invites')
      .select('id, token, role, client_ids, label, expires_at, created_at')
      .is('used_at', null).is('revoked_at', null).gt('expires_at', now)
      .order('created_at', { ascending: false }),
    admin.from('org_roles').select('user_id, role'),
    admin.from('client_memberships').select('user_id, client_id, role'),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name] as const));
  const accessByUser = new Map<string, string[]>();
  for (const r of orgRoles ?? []) {
    accessByUser.set(r.user_id, [...(accessByUser.get(r.user_id) ?? []), ROLE_LABEL[r.role] ?? r.role]);
  }
  for (const m of memberships ?? []) {
    const label = `${ROLE_LABEL[m.role] ?? m.role} · ${clientName.get(m.client_id) ?? 'client'}`;
    accessByUser.set(m.user_id, [...(accessByUser.get(m.user_id) ?? []), label]);
  }

  const userIds = Array.from(accessByUser.keys());
  const { data: profiles } = userIds.length > 0
    ? await admin.from('profiles').select('id, email, display_name, deleted_at').in('id', userIds)
    : { data: [] };

  const members: Member[] = (profiles ?? [])
    .filter((p) => !p.deleted_at)
    .map((p) => ({
      id: p.id,
      name: p.display_name,
      email: p.email,
      access: accessByUser.get(p.id) ?? [],
      isSelf: p.id === user.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pending: PendingInvite[] = (invites ?? []).map((i) => ({
    id: i.id,
    path: `/join/${i.token}`,
    label: i.label,
    access: i.role === 'org_team_all'
      ? ROLE_LABEL.org_team_all
      : `${ROLE_LABEL[i.role]} · ${(i.client_ids as string[]).map((id) => clientName.get(id) ?? 'client').join(', ')}`,
    expiresAt: i.expires_at,
  }));

  return <TeamClient clients={clients ?? []} members={members} pending={pending} />;
}
