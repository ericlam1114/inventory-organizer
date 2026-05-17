'use client';

import { useActionState, useState, use } from 'react';
import { createField, type FieldType } from './actions';

export default function NewFieldPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const bound = createField.bind(null, clientId);
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(bound, {});
  const [type, setType] = useState<FieldType>('text');

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-medium leading-[1.15]">New custom field</h1>
      </div>
      <div className="max-w-md bg-surface border border-rule rounded-[4px] p-6 lg:p-8">
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium mb-2">Name (shown to users)</label>
            <input
              id="name" name="name" type="text" required placeholder="e.g. Designer"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <div>
            <label htmlFor="key" className="block text-[13px] font-medium mb-2">Key (snake_case, used in URLs / exports)</label>
            <input
              id="key" name="key" type="text" required placeholder="e.g. designer" pattern="^[a-z_][a-z0-9_]*$"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] font-mono text-[13px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
          <fieldset>
            <legend className="block text-[13px] font-medium mb-2">Type</legend>
            <div className="space-y-2">
              {(['text', 'date', 'select'] as FieldType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 text-[14px]">
                  <input
                    type="radio" name="type" value={t}
                    checked={type === t} onChange={() => setType(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          {type === 'select' && (
            <div>
              <label htmlFor="options" className="block text-[13px] font-medium mb-2">Options (one per line or comma-separated)</label>
              <textarea
                id="options" name="options" rows={4} required
                placeholder={'S\nM\nL\nXL'}
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] font-mono text-[13px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" name="required" />
            Required (item is marked &ldquo;needs metadata&rdquo; if empty)
          </label>
          {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {pending ? 'Creating…' : 'Create field'}
          </button>
        </form>
      </div>
    </div>
  );
}
