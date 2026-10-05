'use client';

import { useActionState } from 'react';
import { redeemInvite } from './actions';

const inputCls = 'w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[16px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10';

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redeemInvite.bind(null, token), {});

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-[13px] font-medium mb-2">Your name</label>
        <input id="name" name="name" type="text" required autoComplete="name" className={inputCls} />
      </div>
      <div>
        <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className="block text-[13px] font-medium mb-2">Choose a password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
        <p className="text-ink3 text-[12px] mt-1">At least 8 characters.</p>
      </div>
      {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
        {pending ? 'Creating your login…' : 'Create login'}
      </button>
    </form>
  );
}
