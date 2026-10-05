'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { sendMagicLink, signInWithPassword } from './actions';

const inputCls = 'w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[16px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10';

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [pwState, pwAction, pwPending] = useActionState<{ error?: string }, FormData>(signInWithPassword, {});
  const [linkState, linkAction, linkPending] = useActionState<{ error?: string; sent?: boolean }, FormData>(sendMagicLink, {});

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Image
          src="/logo-dark.svg"
          alt="Straighten Up"
          width={180}
          height={53}
          style={{ width: '180px', height: '53px', margin: '0 auto' }}
          priority
        />
        <p className="text-ink3 text-[12px] tracking-wide">
          Archive · Straighten Up
        </p>
      </div>

      {mode === 'password' ? (
        <form action={pwAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
          </div>
          <div>
            <label htmlFor="password" className="block text-[13px] font-medium mb-2">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
          </div>
          {pwState.error && <p className="text-danger text-[13px]">{pwState.error}</p>}
          <button type="submit" disabled={pwPending} className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {pwPending ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={() => setMode('link')} className="w-full text-ink3 hover:text-ink text-[13px]">
            No password yet? Email me a sign-in link
          </button>
        </form>
      ) : linkState.sent ? (
        <p className="text-center text-ink2 text-[15px]">
          Check your email (and junk folder) for a sign-in link.
        </p>
      ) : (
        <form action={linkAction} className="space-y-5">
          <div>
            <label htmlFor="link-email" className="block text-[13px] font-medium mb-2">Email</label>
            <input id="link-email" name="email" type="email" required autoComplete="email" className={inputCls} />
          </div>
          {linkState.error && <p className="text-danger text-[13px]">{linkState.error}</p>}
          <button type="submit" disabled={linkPending} className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {linkPending ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <button type="button" onClick={() => setMode('password')} className="w-full text-ink3 hover:text-ink text-[13px]">
            Sign in with a password instead
          </button>
        </form>
      )}
    </div>
  );
}
