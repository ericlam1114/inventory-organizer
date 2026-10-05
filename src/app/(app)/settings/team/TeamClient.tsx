'use client';

import { useActionState, useState, useTransition } from 'react';
import { Copy, KeyRound, MessageCircle, UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createInviteLink, createLoginLink, revokeInviteLink, type InviteRole } from './actions';

export type Member = { id: string; name: string; email: string; access: string[]; isSelf: boolean };
export type PendingInvite = { id: string; path: string; label: string | null; access: string; expiresAt: string };

const inputCls = 'w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[16px] sm:text-[14px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10';

/** A link ready to send, with a "Text it" button (phone share sheet) and Copy. */
function LinkReady({ path, title, note, onDone }: { path: string; title: string; note: string; onDone?: () => void }) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function share() {
    try {
      await navigator.share({ text: url });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }
  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied — paste it into a text');
  }

  return (
    <div className="bg-sand2/60 border border-rule rounded-[4px] p-4 space-y-3">
      <div>
        <p className="text-[14px] font-medium">{title}</p>
        <p className="text-ink3 text-[12px]">{note}</p>
      </div>
      <p className="text-[12px] text-ink2 break-all bg-surface border border-rule rounded-[2px] px-2 py-1.5">{url}</p>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={share} className="inline-flex items-center gap-1.5 bg-ink text-paper px-3 py-2 rounded-[2px] text-[13px] font-medium hover:bg-ink2 min-h-[40px]">
            <MessageCircle size={14} /> Text it
          </button>
        )}
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 bg-surface border border-rule px-3 py-2 rounded-[2px] text-[13px] hover:bg-paper min-h-[40px]">
          <Copy size={14} /> Copy link
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-ink2 hover:text-ink text-[13px] px-3 py-2 min-h-[40px]">Done</button>
        )}
      </div>
    </div>
  );
}

export function TeamClient({ clients, members, pending }: {
  clients: { id: string; name: string }[];
  members: Member[];
  pending: PendingInvite[];
}) {
  const [state, action, creating] = useActionState(createInviteLink, {});
  const [role, setRole] = useState<InviteRole>('client_team');
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const [loginLink, setLoginLink] = useState<{ name: string; path: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const newInvitePath = state.path && state.path !== dismissedPath ? state.path : null;
  const needsClient = role !== 'org_team_all';

  async function makeLoginLink(m: Member) {
    setBusyId(m.id);
    const res = await createLoginLink(m.id);
    setBusyId(null);
    if (res.error || !res.path) { toast.error(res.error ?? 'Could not create link'); return; }
    setLoginLink({ name: m.name, path: res.path });
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeInviteLink(id);
      toast.success('Invite link turned off');
    });
  }

  return (
    <div className="w-full max-w-3xl px-6 lg:px-12 py-8 lg:py-12 space-y-10">
      <div>
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Team</h1>
        <p className="text-ink3 text-[14px] mt-1">Invite people with a link you text them — no emails involved.</p>
      </div>

      {/* Invite */}
      <section className="space-y-4">
        <h2 className="text-[18px] font-medium flex items-center gap-2"><UserPlus size={18} /> Invite someone</h2>
        {newInvitePath ? (
          <LinkReady
            path={newInvitePath}
            title="Invite link ready"
            note="Text this to them. They'll pick their email and a password. Works once, for 14 days."
            onDone={() => setDismissedPath(newInvitePath)}
          />
        ) : (
          <form action={action} className="bg-surface border border-rule rounded-[4px] p-5 space-y-4">
            <div>
              <label htmlFor="label" className="block text-[13px] font-medium mb-2">Who is it for? <span className="text-ink3 font-normal">(just for your reference)</span></label>
              <input id="label" name="label" type="text" placeholder="e.g. Sia's assistant Maria" className={inputCls} />
            </div>
            <div>
              <label htmlFor="role" className="block text-[13px] font-medium mb-2">What can they see?</label>
              <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as InviteRole)} className={inputCls}>
                <option value="client_team">A client&apos;s team — one client&apos;s inventory</option>
                <option value="client_admin">A client admin — one client, can manage it</option>
                <option value="org_team_per_client">My team — specific clients</option>
                <option value="org_team_all">My team — all clients</option>
              </select>
            </div>
            {needsClient && (
              <div>
                <label htmlFor="clientIds" className="block text-[13px] font-medium mb-2">
                  {role === 'org_team_per_client' ? 'Which clients?' : 'Which client?'}
                </label>
                <select
                  id="clientIds"
                  name="clientIds"
                  multiple={role === 'org_team_per_client'}
                  required
                  className={inputCls}
                  defaultValue={role === 'org_team_per_client' ? [] : undefined}
                >
                  {role !== 'org_team_per_client' && <option value="">Choose a client…</option>}
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
            <button type="submit" disabled={creating} className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[14px] font-medium">
              {creating ? 'Creating…' : 'Create invite link'}
            </button>
          </form>
        )}
      </section>

      {/* Pending invites */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-medium">Invite links not used yet</h2>
          <ul className="divide-y divide-rule border border-rule rounded-[4px] bg-surface">
            {pending.map((p) => (
              <li key={p.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate">{p.label ?? 'Invite'}</p>
                  <p className="text-ink3 text-[12px] truncate">{p.access} · expires {new Date(p.expiresAt).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${p.path}`); toast.success('Link copied — paste it into a text'); }}
                  className="inline-flex items-center gap-1 bg-surface border border-rule px-3 py-2 rounded-[2px] hover:bg-paper text-[12px] min-h-[36px]"
                >
                  <Copy size={12} /> Copy link
                </button>
                <button type="button" onClick={() => revoke(p.id)} className="bg-surface border border-rule px-3 py-2 rounded-[2px] hover:bg-paper text-[12px] text-danger min-h-[36px]">
                  Turn off
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-medium">People with access</h2>
        {loginLink && (
          <LinkReady
            path={loginLink.path}
            title={`Login link for ${loginLink.name}`}
            note="Text this to them. It signs them in once and asks them to set a new password. Expires in about an hour."
            onDone={() => setLoginLink(null)}
          />
        )}
        <ul className="divide-y divide-rule border border-rule rounded-[4px] bg-surface">
          {members.map((m) => (
            <li key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium truncate">{m.name}{m.isSelf ? ' (you)' : ''}</p>
                <p className="text-ink3 text-[12px] truncate">{m.email} · {m.access.join(', ')}</p>
              </div>
              {!m.isSelf && (
                <button
                  type="button"
                  onClick={() => makeLoginLink(m)}
                  disabled={busyId === m.id}
                  className="inline-flex items-center gap-1 bg-surface border border-rule px-3 py-2 rounded-[2px] hover:bg-paper text-[12px] min-h-[36px] disabled:opacity-60"
                  title="Make a one-time link to sign in and reset their password"
                >
                  <KeyRound size={12} /> {busyId === m.id ? 'Making…' : 'Login link'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
