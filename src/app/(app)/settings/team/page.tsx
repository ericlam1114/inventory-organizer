'use client';

import { useActionState, useState, useEffect } from 'react';
import { inviteOrgTeamMember } from './actions';
import { createClient } from '@/lib/supabase/client';

export default function TeamSettingsPage() {
  const [state, action, pending] = useActionState<{ error?: string; sent?: boolean }, FormData>(
    inviteOrgTeamMember,
    {}
  );
  const [scope, setScope] = useState<'all_clients' | 'per_client'>('all_clients');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  return (
    <div className="w-full max-w-5xl px-6 lg:px-12 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Invite team member</h1>
        <p className="text-ink3 text-[14px] mt-1">Add a teammate to one or all clients</p>
      </div>
      {state.sent ? (
        <p className="text-ink2">Invite sent. They&apos;ll get an email with a magic link.</p>
      ) : (
        <div className="max-w-md mx-auto bg-surface border border-rule rounded-[4px] p-6 lg:p-8">
          <form action={action} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-[13px] font-medium mb-2">Display name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2">Scope</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[14px]">
                  <input
                    type="radio"
                    name="scope"
                    value="all_clients"
                    checked={scope === 'all_clients'}
                    onChange={() => setScope('all_clients')}
                  />
                  All clients
                </label>
                <label className="flex items-center gap-2 text-[14px]">
                  <input
                    type="radio"
                    name="scope"
                    value="per_client"
                    checked={scope === 'per_client'}
                    onChange={() => setScope('per_client')}
                  />
                  Specific clients
                </label>
              </div>
            </div>
            {scope === 'per_client' && (
              <div>
                <label className="block text-[13px] font-medium mb-2">Clients</label>
                <select
                  multiple
                  name="clientIds"
                  className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
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
