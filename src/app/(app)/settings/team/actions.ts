'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const INVITE_DAYS = 14;

export type InviteRole = 'org_team_all' | 'org_team_per_client' | 'client_admin' | 'client_team';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  return isAdmin ? { supabase, user } : null;
}

/** Creates a single-use signup link Janelle can text to someone. */
export async function createInviteLink(
  _prev: { error?: string; path?: string },
  formData: FormData,
): Promise<{ error?: string; path?: string }> {
  const role = String(formData.get('role') ?? '') as InviteRole;
  const label = String(formData.get('label') ?? '').trim() || null;
  const clientIds = (formData.getAll('clientIds') as string[]).filter(Boolean);

  if (!['org_team_all', 'org_team_per_client', 'client_admin', 'client_team'].includes(role)) {
    return { error: 'Pick who this invite is for.' };
  }
  if (role !== 'org_team_all' && clientIds.length === 0) return { error: 'Pick a client.' };

  const ctx = await requireSuperAdmin();
  if (!ctx) return { error: 'Not authorized.' };

  const token = randomBytes(24).toString('base64url');
  const { error } = await ctx.supabase.from('team_invites').insert({
    token,
    role,
    client_ids: role === 'org_team_all' ? [] : clientIds,
    label,
    created_by: ctx.user.id,
    expires_at: new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath('/settings/team');
  return { path: `/join/${token}` };
}

export async function revokeInviteLink(inviteId: string) {
  const ctx = await requireSuperAdmin();
  if (!ctx) throw new Error('Not authorized.');
  const { error } = await ctx.supabase
    .from('team_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId);
  if (error) throw error;
  revalidatePath('/settings/team');
}

/**
 * One-time login link for an existing member (no email sent). Opens a page where they
 * set a new password — used for first-time password setup and "I forgot my password".
 */
export async function createLoginLink(userId: string): Promise<{ error?: string; path?: string }> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { error: 'Not authorized.' };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle();
  if (!profile?.email) return { error: 'Member not found.' };

  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: profile.email });
  if (error || !data.properties?.hashed_token) return { error: error?.message ?? 'Could not create link.' };

  const qs = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'recovery',
    next: '/settings/password',
  });
  return { path: `/auth/callback?${qs.toString()}` };
}
