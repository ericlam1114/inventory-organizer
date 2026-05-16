'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function inviteClientAdmin(
  clientId: string,
  _prev: { error?: string; sent?: boolean },
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!email || !displayName) return { error: 'Email and display name are required.' };

  // Authz: super_admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user!.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  if (!isAdmin) return { error: 'Not authorized.' };

  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  await admin.from('profiles').upsert({ id: invited.user.id, email, display_name: displayName });
  await admin.from('client_memberships').insert({
    user_id: invited.user.id,
    client_id: clientId,
    role: 'client_admin',
  });

  revalidatePath(`/clients/${clientId}`);
  return { sent: true };
}
