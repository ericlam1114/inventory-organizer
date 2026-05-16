'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Link as LinkIcon, Share2 } from 'lucide-react';
import { createShare, revokeShare } from './actions';
import { toast } from '@/lib/toast';

type Location = { id: string; name: string; parentLocationId: string | null };
type ActiveShare = {
  id: string;
  token: string;
  locationName: string;
  recipients: Array<{ email: string; viewCount: number; lastViewed: string | null }>;
  expiresAt: string;
  createdAt: string;
};
type InactiveShare = ActiveShare & { revokedAt: string | null };

export function ShareDashboardClient({
  clientId, clientName, active, inactive, locations,
}: {
  clientId: string; clientName: string;
  active: ActiveShare[]; inactive: InactiveShare[];
  locations: Location[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  }

  function handleRevoke(shareId: string) {
    if (!confirm('Revoke this share link?')) return;
    startTransition(async () => {
      await revokeShare(clientId, shareId);
      toast.success('Share revoked');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink3 text-[13px] uppercase tracking-wide">Settings · {clientName}</p>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2] mt-1">Shares</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
        >
          <Plus size={14} /> New share
        </button>
      </div>

      {showForm && (
        <CreateShareForm
          clientId={clientId}
          locations={locations}
          onCancel={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); router.refresh(); }}
        />
      )}

      {/* Active section */}
      <section className="space-y-3">
        <h2 className="text-[18px] font-medium">Active</h2>
        {active.length === 0 ? (
          <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
              <Share2 size={20} />
            </div>
            <h3 className="text-[16px] font-medium mb-1">No active shares</h3>
            <p className="text-ink3 text-[14px] mb-5 max-w-xs mx-auto">
              Share a location subtree with insurance agents or anyone who needs to view the inventory.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
            >
              <Plus size={14} /> New share
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((s) => (
              <ShareRow key={s.id}
                share={s}
                kind="active"
                pending={pending}
                onCopy={() => copyLink(s.token)}
                onRevoke={() => handleRevoke(s.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Expired / Revoked collapsed */}
      <section>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-ink2 hover:text-ink text-[13px]"
        >
          Expired / Revoked ({inactive.length}) {expanded ? '▾' : '▸'}
        </button>
        {expanded && inactive.length > 0 && (
          <ul className="space-y-3 mt-3">
            {inactive.map((s) => (
              <ShareRow key={s.id} share={s} kind="inactive" pending={pending} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ShareRow({ share: s, kind, pending, onCopy, onRevoke }: {
  share: ActiveShare | InactiveShare;
  kind: 'active' | 'inactive';
  pending: boolean;
  onCopy?: () => void;
  onRevoke?: () => void;
}) {
  const totalViews = s.recipients.reduce((a, r) => a + r.viewCount, 0);
  return (
    <li className="bg-surface border border-rule rounded-[4px] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{s.locationName}</p>
          <p className="text-ink3 text-[12px] truncate">Recipients: {s.recipients.map((r) => r.email).join(', ') || '(none)'}</p>
          {kind === 'active' ? (
            <p className="text-ink3 text-[12px] mt-1">
              Expires {new Date(s.expiresAt).toLocaleDateString()} · Viewed {totalViews}× {totalViews > 0 ? `(last: ${s.recipients.find((r) => r.lastViewed)?.lastViewed ? new Date(s.recipients.find((r) => r.lastViewed)!.lastViewed!).toLocaleDateString() : '-'})` : ''}
            </p>
          ) : (
            <p className="text-ink3 text-[12px] mt-1">
              {(s as InactiveShare).revokedAt ? `Revoked ${new Date((s as InactiveShare).revokedAt!).toLocaleDateString()}` : `Expired ${new Date(s.expiresAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
        {kind === 'active' && (
          <div className="flex gap-2 shrink-0">
            <button onClick={onCopy} className="inline-flex items-center gap-1 bg-surface border border-rule px-3 py-1.5 rounded-[2px] hover:bg-paper text-[12px]" title="Copy link">
              <LinkIcon size={12} /> Copy
            </button>
            <button onClick={onRevoke} disabled={pending} className="bg-surface border border-rule px-3 py-1.5 rounded-[2px] hover:bg-paper text-[12px] text-danger disabled:opacity-50">
              Revoke
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function CreateShareForm({ clientId, locations, onCancel, onCreated }: {
  clientId: string;
  locations: Location[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const bound = createShare.bind(null, clientId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => startTransition(async () => {
        const result = await bound({}, fd);
        if (result?.error) {
          setError(result.error);
        } else {
          toast.success('Share created and sent');
          onCreated();
        }
      })}
      className="bg-surface border border-rule rounded-[4px] p-6 space-y-5"
    >
      <div>
        <label htmlFor="rootLocationId" className="block text-[13px] font-medium mb-2">Subtree root</label>
        <select id="rootLocationId" name="rootLocationId" required
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]"
          defaultValue="">
          <option value="" disabled>Pick a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="recipients" className="block text-[13px] font-medium mb-2">Recipient emails (comma or newline separated)</label>
        <textarea id="recipients" name="recipients" rows={2} required
          placeholder="insurance@bigco.com, agent@caa.com"
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[13px]" />
      </div>
      <fieldset>
        <legend className="block text-[13px] font-medium mb-2">Expires in</legend>
        <div className="flex gap-3 text-[13px]">
          {[7, 30, 90].map((d) => (
            <label key={d} className="flex items-center gap-1">
              <input type="radio" name="expiresInDays" value={d} defaultChecked={d === 30} /> {d} days
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="note" className="block text-[13px] font-medium mb-2">Note (optional)</label>
        <input id="note" name="note" type="text" placeholder="e.g. For insurance review — please confirm by 6/1"
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]" />
      </div>
      {error && <p className="text-danger text-[13px]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-ink2 hover:text-ink text-[13px] px-2">Cancel</button>
        <button type="submit" disabled={pending}
          className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium">
          {pending ? 'Sending…' : 'Create & send →'}
        </button>
      </div>
    </form>
  );
}
