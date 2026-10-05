import Image from 'next/image';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { JoinForm } from './JoinForm';

type InviteState = { expires_at: string; revoked_at: string | null; used_at: string | null } | null;

function isUsable(invite: InviteState): boolean {
  return !!invite && !invite.revoked_at && !invite.used_at && new Date(invite.expires_at).getTime() > Date.now();
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('team_invites')
    .select('label, expires_at, revoked_at, used_at')
    .eq('token', token)
    .maybeSingle();
  const valid = isUsable(invite);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Image src="/logo-dark.svg" alt="Straighten Up" width={180} height={53} style={{ width: '180px', height: '53px', margin: '0 auto' }} priority />
        <p className="text-ink3 text-[12px] tracking-wide">Archive · Straighten Up</p>
      </div>
      {valid ? (
        <>
          <div className="text-center space-y-1">
            <h1 className="text-[22px] font-medium">You&apos;re invited</h1>
            <p className="text-ink3 text-[13px]">Create your login. You&apos;ll use this email and password to sign in next time.</p>
          </div>
          <JoinForm token={token} />
        </>
      ) : (
        <div className="text-center space-y-3">
          <h1 className="text-[20px] font-medium">This invite link no longer works</h1>
          <p className="text-ink3 text-[14px]">It may have been used already or expired. Ask Janelle to text you a new one.</p>
          <Link href="/login" className="inline-block text-[13px] text-ink2 underline">Already have a login? Sign in</Link>
        </div>
      )}
    </div>
  );
}
