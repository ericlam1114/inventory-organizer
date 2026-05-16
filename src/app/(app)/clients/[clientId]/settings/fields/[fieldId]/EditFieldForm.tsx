'use client';

import { useActionState, useTransition } from 'react';
import { updateField, deleteField } from './actions';

type Field = {
  id: string;
  name: string;
  key: string;
  type: string;
  options: string[] | null;
  required: boolean;
};

export default function EditFieldForm({
  clientId,
  fieldId,
  field,
}: {
  clientId: string;
  fieldId: string;
  field: Field;
}) {
  const boundUpdate = updateField.bind(null, clientId, fieldId);
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(boundUpdate, {});
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Delete field "${field.name}"? This cannot be undone.`)) return;
    startDelete(() => deleteField(clientId, fieldId));
  };

  return (
    <div className="max-w-md mx-auto p-8 space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">Edit custom field</h1>
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-[13px] font-medium mb-2">Name (shown to users)</label>
          <input
            id="name" name="name" type="text" required
            defaultValue={field.name}
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <div>
          <label htmlFor="key" className="block text-[13px] font-medium mb-2">
            Key <span className="text-ink3">(locked — cannot change after creation)</span>
          </label>
          <input
            id="key" name="key" type="text"
            value={field.key}
            disabled
            readOnly
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] font-mono text-[13px] opacity-50 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium mb-2">
            Type <span className="text-ink3">(locked — cannot change after creation)</span>
          </label>
          <input
            type="text"
            value={field.type}
            disabled
            readOnly
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[13px] opacity-50 cursor-not-allowed"
          />
        </div>
        {field.type === 'select' && (
          <div>
            <label htmlFor="options" className="block text-[13px] font-medium mb-2">Options (one per line or comma-separated)</label>
            <textarea
              id="options" name="options" rows={4}
              defaultValue={(field.options ?? []).join('\n')}
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] font-mono text-[13px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="required" defaultChecked={field.required} />
          Required (item is marked &ldquo;needs metadata&rdquo; if empty)
        </label>
        {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
        <button type="submit" disabled={pending}
          className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="border-t border-rule pt-6">
        <p className="text-ink3 text-[13px] mb-3">
          Deleting this field removes its definition. Existing values stored on items will be orphaned until those items are next edited.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="bg-surface border border-rule text-danger px-4 py-2.5 rounded-[2px] hover:bg-paper text-[13px] font-medium disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete field'}
        </button>
      </div>
    </div>
  );
}
