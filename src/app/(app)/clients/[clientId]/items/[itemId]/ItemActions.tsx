'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Move, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';

type Location = { id: string; name: string; parent_location_id: string | null };
type Status = 'active' | 'donated' | 'archived';

export function ItemActions({
  itemId, clientId, currentStatus, currentLocationId, locations,
}: {
  itemId: string;
  clientId: string;
  currentStatus: Status;
  currentLocationId: string;
  locations: Location[];
}) {
  const router = useRouter();
  const [openMove, setOpenMove] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(newLocationId: string, note: string) {
    if (newLocationId === currentLocationId) return;
    setPending(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('move_item', {
      p_item_id: itemId,
      p_new_location_id: newLocationId,
      p_note: note || null,
    });
    if (error) { setError(error.message); setPending(false); return; }
    setOpenMove(false); setPending(false);
    router.refresh();
  }

  async function handleStatus(newStatus: Status, note: string) {
    if (newStatus === currentStatus) { setOpenStatus(false); return; }
    setPending(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('change_item_status', {
      p_item_id: itemId,
      p_new_status: newStatus,
      p_note: note || null,
    });
    if (error) { setError(error.message); setPending(false); return; }
    setOpenStatus(false); setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 shrink-0 relative">
      <button
        type="button"
        onClick={() => setOpenStatus((o) => !o)}
        className="inline-flex items-center gap-1 hover:opacity-80"
        aria-haspopup="true"
        aria-expanded={openStatus}
      >
        <StatusBadge status={currentStatus} />
        <ChevronDown size={12} className="text-ink3" />
      </button>
      <button
        type="button"
        onClick={() => setOpenMove((o) => !o)}
        className="inline-flex items-center gap-1.5 bg-surface border border-rule text-ink px-3 py-1.5 rounded-[2px] hover:bg-paper text-[12px] font-medium"
      >
        <Move size={12} /> Move
      </button>

      {openStatus && (
        <StatusPanel current={currentStatus} onSubmit={handleStatus} onCancel={() => setOpenStatus(false)} pending={pending} error={error} />
      )}
      {openMove && (
        <MovePanel current={currentLocationId} locations={locations} onSubmit={handleMove} onCancel={() => setOpenMove(false)} pending={pending} error={error} />
      )}
    </div>
  );
}

function StatusPanel({ current, onSubmit, onCancel, pending, error }: {
  current: Status;
  onSubmit: (s: Status, note: string) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [newStatus, setNewStatus] = useState<Status>(current);
  const [note, setNote] = useState('');
  const needsConfirm = newStatus === 'donated' || newStatus === 'archived';
  return (
    <div className="absolute top-full right-0 mt-2 bg-surface border border-rule rounded-[4px] shadow-sm p-4 w-72 z-50 space-y-3">
      <label className="block text-[13px] font-medium">Set status</label>
      <select
        value={newStatus} onChange={(e) => setNewStatus(e.target.value as Status)}
        className="w-full bg-surface border border-rule px-3 py-2 rounded-[2px] text-[14px]"
      >
        <option value="active">active</option>
        <option value="donated">donated</option>
        <option value="archived">archived</option>
      </select>
      {needsConfirm && (
        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          className="w-full bg-surface border border-rule px-3 py-2 rounded-[2px] text-[14px]"
        />
      )}
      {error && <p className="text-danger text-[12px]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-ink2 hover:text-ink text-[13px] px-2 py-1">Cancel</button>
        <button
          type="button"
          onClick={() => onSubmit(newStatus, note)}
          disabled={pending || newStatus === current}
          className="bg-ink text-paper px-3 py-1.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function MovePanel({ current, locations, onSubmit, onCancel, pending, error }: {
  current: string;
  locations: Location[];
  onSubmit: (newLocId: string, note: string) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [target, setTarget] = useState<string>('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? locations.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()))
    : locations;

  return (
    <div className="absolute top-full right-0 mt-2 bg-surface border border-rule rounded-[4px] shadow-sm p-4 w-80 z-50 space-y-3">
      <label className="block text-[13px] font-medium">Move to</label>
      <input
        type="search" value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="Search locations…"
        className="w-full bg-surface border border-rule px-3 py-2 rounded-[2px] text-[14px]"
      />
      <div className="max-h-48 overflow-y-auto border border-rule rounded-[2px]">
        {filtered.length === 0 ? (
          <p className="p-3 text-ink3 text-[13px]">No matches</p>
        ) : filtered.map((l) => (
          <button
            key={l.id} type="button"
            onClick={() => setTarget(l.id)}
            disabled={l.id === current}
            className={`block w-full text-left px-3 py-2 text-[13px] ${target === l.id ? 'bg-sand2 text-ink' : 'hover:bg-paper text-ink2'} ${l.id === current ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {l.name}{l.id === current ? ' (current)' : ''}
          </button>
        ))}
      </div>
      <input
        type="text" value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. 'returned from photoshoot')"
        maxLength={200}
        className="w-full bg-surface border border-rule px-3 py-2 rounded-[2px] text-[14px]"
      />
      {error && <p className="text-danger text-[12px]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-ink2 hover:text-ink text-[13px] px-2 py-1">Cancel</button>
        <button
          type="button"
          onClick={() => target && onSubmit(target, note)}
          disabled={pending || !target || target === current}
          className="bg-ink text-paper px-3 py-1.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium"
        >
          {pending ? 'Moving…' : 'Move →'}
        </button>
      </div>
    </div>
  );
}
