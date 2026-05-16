'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendMagicLink(
  _prev: { error?: string; sent?: boolean },
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Enter an email' };

  const supabase = await createClient();

  // shouldCreateUser=false → Supabase refuses if no user exists for this email,
  // so we don't have to pre-check profiles ourselves (and pre-checks would fail
  // anyway because the login caller isn't authenticated yet → RLS blocks read).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Generic message — don't leak whether the email exists or not.
    return { error: 'No access — ask Janelle for an invite.' };
  }
  return { sent: true };
}
