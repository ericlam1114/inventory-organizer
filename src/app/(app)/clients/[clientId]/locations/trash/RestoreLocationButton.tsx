'use client';

import { useActionState } from 'react';
import { RotateCcw } from 'lucide-react';
import { restoreLocationAction } from '../[locationId]/actions';

export function RestoreLocationButton({ clientId, locationId }: {
  clientId: string;
  locationId: string;
}) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    restoreLocationAction.bind(null, clientId, locationId),
    {},
  );

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-surface border border-rule text-ink px-3 py-2 rounded-[2px] hover:bg-paper text-[13px] disabled:opacity-50"
      >
        <RotateCcw size={14} /> {pending ? 'Restoring…' : 'Restore'}
      </button>
      {state.error && <p role="alert" className="text-warning text-[12px] mt-2">{state.error}</p>}
    </form>
  );
}
