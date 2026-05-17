'use client';

import { useActionState, use } from 'react';
import { createLocationAction } from './actions';

export default function NewLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ parent?: string; name?: string }>;
}) {
  const { clientId } = use(params);
  const sp = use(searchParams);
  const bound = createLocationAction.bind(null, clientId);
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(bound, {});

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">New location</h1>
      </div>
      <div className="max-w-md bg-surface border border-rule rounded-[4px] p-6 lg:p-8">
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium mb-2">Name</label>
            <input
              id="name" name="name" type="text" required
              defaultValue={sp.name ?? ''}
              placeholder="e.g. Bentley · Pink closet"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
          {sp.parent && (
            <input type="hidden" name="parentLocationId" value={sp.parent} />
          )}
          {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {pending ? 'Creating…' : 'Create location'}
          </button>
        </form>
      </div>
    </div>
  );
}
