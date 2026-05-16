'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type InviteInput = {
  email: string;
  displayName: string;
  scope: 'all_clients' | 'per_client';
  clientIds?: string[]; // required if scope = per_client
};

export async function inviteOrgTeamMember(
  _prev: { error?: string; sent?: boolean },
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const scope = String(formData.get('scope') ?? '') as InviteInput['scope'];
  const clientIds = (formData.getAll('clientIds') as string[]) ?? [];

  if (!email || !displayName) return { error: 'Email and display name are required.' };
  if (scope === 'per_client' && clientIds.length === 0)
    return { error: 'Pick at least one client.' };

  // Verify caller is super_admin (RLS will also enforce, but fail fast with a clear error)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user!.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  if (!isAdmin) return { error: 'Not authorized.' };

  // Use admin client to invite + create profile + insert role
  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  await admin.from('profiles').upsert({ id: invited.user.id, email, display_name: displayName });

  if (scope === 'all_clients') {
    await admin.from('org_roles').insert({ user_id: invited.user.id, role: 'org_team_all' });
  } else {
    await admin.from('client_memberships').insert(
      clientIds.map((client_id) => ({
        user_id: invited.user.id,
        client_id,
        role: 'org_team_per_client',
      }))
    );
  }

  revalidatePath('/settings/team');
  return { sent: true };
}
