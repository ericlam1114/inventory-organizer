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
    <div className="max-w-md mx-auto p-8 space-y-8">
      <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2]">New location</h1>
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
  );
}
