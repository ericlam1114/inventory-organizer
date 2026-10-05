import { cookies } from 'next/headers';
import { signSession } from '@/lib/shares/cookie';

/** Grants a share recipient access by setting the signed share-session cookie. */
export async function setShareSessionCookie(token: string, email: string, shareExpiresAt: string) {
  const cookieExpiry = Math.min(
    new Date(shareExpiresAt).getTime(),
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  const sealed = signSession({ token, email, expires: cookieExpiry });

  const cookieStore = await cookies();
  cookieStore.set('share-session', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/share/${token}`,
    expires: new Date(cookieExpiry),
  });
}

/** Personal one-tap link path for one recipient, valid until the share expires. */
export function personalSharePath(token: string, email: string, shareExpiresAt: string): string {
  const k = signSession({ token, email, expires: new Date(shareExpiresAt).getTime() });
  return `/share/${token}/auth/link?k=${encodeURIComponent(k)}`;
}

/** "sarah@gmail.com" → "s•••@gmail.com" — enough for someone to recognize their own address. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 1)}•••@${domain}`;
}
