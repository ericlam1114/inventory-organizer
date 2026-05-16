'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { signSession } from '@/lib/shares/cookie';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function authShare(
  token: string,
  _prev: { error?: string },
  formData: FormData,
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Enter your email address' };

  const admin = createAdminClient();

  // Rate limit by (token, IP). Vercel sets x-forwarded-for; fall back to 'unknown'.
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await admin
    .from('share_auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('token', token)
    .eq('ip', ip)
    .gt('attempted_at', since);
  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { error: 'Too many attempts. Try again in 15 minutes.' };
  }

  // Validate share is active + email matches recipients
  const { data: share } = await admin
    .from('shares')
    .select('id, token, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!share || share.revoked_at || new Date(share.expires_at).getTime() < Date.now()) {
    // Don't leak whether the token exists
    await admin.from('share_auth_attempts').insert({ token, ip });
    return { error: "This email isn't authorized for this link." };
  }

  const { data: recipient } = await admin
    .from('share_recipients')
    .select('email')
    .eq('share_id', share.id)
    .eq('email', email)
    .maybeSingle();

  if (!recipient) {
    await admin.from('share_auth_attempts').insert({ token, ip });
    return { error: "This email isn't authorized for this link." };
  }

  // Success — set the signed cookie
  const cookieExpiry = Math.min(
    new Date(share.expires_at).getTime(),
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  const sealed = signSession({ token, email, expires: cookieExpiry });

  const cookieStore = await cookies();
  cookieStore.set(`share-session`, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/share/${token}`,
    expires: new Date(cookieExpiry),
  });

  redirect(`/share/${token}`);
}
