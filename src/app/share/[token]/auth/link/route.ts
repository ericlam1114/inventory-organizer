import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySession } from '@/lib/shares/cookie';
import { setShareSessionCookie } from '@/lib/shares/session';

// One-tap access from the invite email: ?k= is a signed {token, email} for one recipient,
// so they never have to type (or guess) which email the share was sent to.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gate = new URL(`/share/${token}/auth`, request.url);
  const invite = verifySession(request.nextUrl.searchParams.get('k') ?? undefined, token);
  if (!invite) return NextResponse.redirect(gate);

  const admin = createAdminClient();
  const { data: share } = await admin
    .from('shares')
    .select('id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (!share || share.revoked_at || new Date(share.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL(`/share/${token}`, request.url));
  }

  // Recipient may have been removed since the email went out
  const { data: recipient } = await admin
    .from('share_recipients')
    .select('email')
    .eq('share_id', share.id)
    .eq('email', invite.email)
    .maybeSingle();
  if (!recipient) return NextResponse.redirect(gate);

  await setShareSessionCookie(token, invite.email, share.expires_at);
  return NextResponse.redirect(new URL(`/share/${token}`, request.url));
}
