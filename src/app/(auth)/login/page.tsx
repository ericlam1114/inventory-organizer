'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { sendMagicLink } from './actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState<
    { error?: string; sent?: boolean },
    FormData
  >(sendMagicLink, {});

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Image
          src="/logo-dark.svg"
          alt="Straighten Up"
          width={180}
          height={48}
          priority
        />
        <p className="text-ink3 text-[12px] tracking-wide">
          Inventory · Straighten Up Home
        </p>
      </div>

      {state.sent ? (
        <p className="text-center text-ink2 text-[15px]">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form action={action} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
          {state.error && (
            <p className="text-danger text-[13px]">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  );
}
