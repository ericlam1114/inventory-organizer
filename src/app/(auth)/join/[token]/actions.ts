'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MIN_PASSWORD = 8;

export async function redeemInvite(
  token: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!name) return { error: 'Enter your name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' };
  if (password.length < MIN_PASSWORD) return { error: `Password needs at least ${MIN_PASSWORD} characters.` };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('team_invites')
    .select('id, role, client_ids, expires_at, revoked_at, used_at')
    .eq('token', token)
    .maybeSingle();
  if (!invite || invite.revoked_at || invite.used_at || new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: 'This invite link no longer works. Ask Janelle for a new one.' };
  }

  // Claim the invite first so a forwarded link can't be used twice concurrently
  const { data: claimed } = await admin
    .from('team_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();
  if (!claimed) return { error: 'This invite link was already used. Ask Janelle for a new one.' };

  const supabase = await createClient();
  let userId: string;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });

  if (created?.user) {
    userId = created.user.id;
    await admin.from('profiles').upsert({ id: userId, email, display_name: name });
  } else if (createErr?.code === 'email_exists') {
    // Already has an account: only attach access if they prove it's theirs
    const { data: signedIn, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr || !signedIn.user) {
      await admin.from('team_invites').update({ used_at: null }).eq('id', invite.id);
      return { error: 'That email already has an account. Use its password, or ask Janelle for a login link.' };
    }
    userId = signedIn.user.id;
  } else {
    await admin.from('team_invites').update({ used_at: null }).eq('id', invite.id);
    console.error('[join] createUser failed', createErr);
    return { error: 'Something went wrong creating your account. Try again.' };
  }

  // Grant access from the invite
  const clientIds = (invite.client_ids ?? []) as string[];
  const grant = invite.role === 'org_team_all'
    ? await admin.from('org_roles').upsert({ user_id: userId, role: 'org_team_all' })
    : await admin.from('client_memberships').upsert(
        clientIds.map((client_id) => ({ user_id: userId, client_id, role: invite.role })),
        { onConflict: 'user_id,client_id', ignoreDuplicates: true },
      );
  if (grant.error) {
    console.error('[join] grant failed', grant.error);
    return { error: 'Your account was created but access could not be added. Ask Janelle to check.' };
  }
  await admin.from('team_invites').update({ used_by: userId }).eq('id', invite.id);

  // Sign in (no-op if the existing-account branch already did)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect('/login');
  }
  redirect('/clients');
}
