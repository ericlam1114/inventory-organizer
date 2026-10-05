'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { reportError } from '@/lib/friendly-errors';

const inputCls = 'w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[16px] sm:text-[14px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10';

export default function SetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) { setError(reportError(error)); return; }
    toast.success('Password saved — use it to sign in next time');
    router.push('/clients');
  }

  return (
    <div className="w-full max-w-md px-6 lg:px-12 py-8 lg:py-12 space-y-6">
      <div>
        <h1 className="font-display text-[36px] sm:text-[42px] font-medium leading-[1.05] tracking-[-0.01em]">Set your password</h1>
        <p className="text-ink3 text-[14px] mt-1">You&apos;ll sign in with your email and this password from now on.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-surface border border-rule rounded-[4px] p-5 space-y-4">
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium mb-2">New password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required className={inputCls} />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-[13px] font-medium mb-2">Type it again</label>
          <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required className={inputCls} />
        </div>
        {error && <p className="text-danger text-[13px]">{error}</p>}
        <button type="submit" disabled={pending} className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[14px] font-medium">
          {pending ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
