'use client';

import { use } from 'react';
import { useActionState } from 'react';
import { inviteClientAdmin } from './actions';

export default function InviteAdminPage({
  params,
}: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const bound = inviteClientAdmin.bind(null, clientId);
  const [state, action, pending] = useActionState<{ error?: string; sent?: boolean }, FormData>(
    bound,
    {}
  );

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Invite client admin</h1>
      </div>
      {state.sent ? (
        <p className="text-ink2">Invite sent.</p>
      ) : (
        <div className="max-w-md mx-auto bg-surface border border-rule rounded-[4px] p-6 lg:p-8">
          <form action={action} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-[13px] font-medium mb-2">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
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
              {pending ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
