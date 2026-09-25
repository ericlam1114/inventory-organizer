'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteLocationAction } from './actions';

export function DeleteLocationButton({ clientId, locationId, name }: {
  clientId: string;
  locationId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(
    deleteLocationAction.bind(null, clientId, locationId),
    {},
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Move "${name}" and everything inside it to Trash? You can restore them later.`)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-surface border border-rule text-warning px-3 py-2 rounded-[2px] hover:bg-paper text-[13px] disabled:opacity-50"
      >
        <Trash2 size={14} /> {pending ? 'Moving…' : 'Move to Trash'}
      </button>
      {state.error && <p role="alert" className="text-warning text-[12px] mt-2 max-w-64">{state.error}</p>}
    </form>
  );
}
