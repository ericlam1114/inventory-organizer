// Dev-only one-click login for local testing. Returns 404 in production —
// safe to leave in the repo. Hit /dev/login-as to be signed in as Janelle
// without going through the magic-link email flow.
//
// To sign in as a different user: /dev/login-as?email=someone@example.com
// (the user must already exist in auth.users — this doesn't create accounts).

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('disabled in production', { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email') ?? 'straightenupbyjanelle@gmail.com';

  const admin = createAdminClient();
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.email_otp) {
    return new NextResponse(`generateLink failed: ${linkErr?.message ?? 'no email_otp'}`, {
      status: 500,
    });
  }

  const supabase = await createServerClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'email',
  });
  if (verifyErr) {
    return new NextResponse(`verifyOtp failed: ${verifyErr.message}`, { status: 500 });
  }

  return NextResponse.redirect(new URL('/clients', request.url));
}
