'use client';

import { useActionState, useEffect } from 'react';
import { updateItemMetadata } from './actions';
import { toast } from '@/lib/toast';

type Field = {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'date' | 'select';
  options: string[] | null;
  required: boolean;
};

export function ItemMetadataForm({
  itemId, clientId, initialDescription, initialMetadata, fields,
}: {
  itemId: string;
  clientId: string;
  initialDescription: string;
  initialMetadata: Record<string, string>;
  fields: Field[];
}) {
  const bound = updateItemMetadata.bind(null, clientId, itemId);
  const [state, action, pending] = useActionState<
    { error?: string; saved?: boolean },
    FormData
  >(bound, {});

  useEffect(() => {
    if (state.saved) toast.success('Saved');
    if (state.error) toast.error(state.error);
  }, [state.saved, state.error]);

  return (
    <form action={action} className="bg-surface border border-rule rounded-[4px] p-6 space-y-5">
      <div>
        <label htmlFor="description" className="block text-[13px] font-medium mb-2">Description</label>
        <textarea
          id="description" name="description" rows={3} defaultValue={initialDescription}
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
        />
      </div>

      {fields.map((f) => {
        const fieldName = `meta:${f.key}`;
        const initial = initialMetadata[f.key] ?? '';
        const labelLine = (
          <label htmlFor={fieldName} className="block text-[13px] font-medium mb-2">
            {f.name}{f.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        );

        if (f.type === 'text') {
          return (
            <div key={f.id}>
              {labelLine}
              <input
                id={fieldName} name={fieldName} type="text"
                required={f.required} defaultValue={initial}
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
              />
            </div>
          );
        }
        if (f.type === 'date') {
          return (
            <div key={f.id}>
              {labelLine}
              <input
                id={fieldName} name={fieldName} type="date"
                required={f.required} defaultValue={initial}
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
              />
            </div>
          );
        }
        // type === 'select'
        return (
          <div key={f.id}>
            {labelLine}
            <select
              id={fieldName} name={fieldName} required={f.required} defaultValue={initial}
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
            >
              <option value="">— pick —</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        );
      })}

      {state.error && <p className="text-danger text-[13px]">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium">
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
