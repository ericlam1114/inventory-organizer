'use client';

import { useActionState } from 'react';
import { createClientAction } from './actions';

export default function NewClientPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    createClientAction,
    {}
  );

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-medium leading-[1.15]">New client</h1>
      </div>
      <div className="max-w-md bg-surface border border-rule rounded-[4px] p-6 lg:p-8">
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium mb-2">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
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
            {pending ? 'Creating…' : 'Create client'}
          </button>
        </form>
      </div>
    </div>
  );
}
