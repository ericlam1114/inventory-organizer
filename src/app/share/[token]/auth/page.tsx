'use client';

import { useActionState, use } from 'react';
import Image from 'next/image';
import { authShare } from './actions';

export default function ShareAuthPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const bound = authShare.bind(null, token);
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(bound, {});

  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Image src="/logo-light.svg" alt="Straighten Up" width={96} height={28} style={{ height: 'auto', width: 'auto' }} priority />
      </header>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px] bg-surface border border-rule rounded-[4px] p-8 lg:p-12 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-[24px] font-medium leading-[32px]">Janelle Lam shared an inventory with you.</h1>
            <p className="text-ink3 text-[13px]">Enter the email address this link was sent to.</p>
          </div>
          <form action={action} className="space-y-4">
            <input
              name="email" type="email" required autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
            {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
            <button type="submit" disabled={pending}
              className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
              {pending ? 'Verifying…' : 'View inventory →'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
