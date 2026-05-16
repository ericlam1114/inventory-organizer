import { Avatar } from '@/components/Avatar';

type HistoryEntry = {
  id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  actor: { display_name: string; avatar_url: string | null; deleted_at: string | null } | null;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.round(diffMo / 12)}y ago`;
}

function describeAction(
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  locationNameById: Map<string, string>,
): { label: string; note?: string } {
  if (action === 'create') return { label: 'created this item' };
  if (action === 'move') {
    const newLocId = typeof after?.location_id === 'string' ? after.location_id : null;
    const newName = newLocId ? locationNameById.get(newLocId) ?? 'another location' : 'another location';
    const note = typeof before?.note === 'string' && before.note ? before.note : undefined;
    return { label: `moved this to ${newName}`, note };
  }
  if (action === 'status_change') {
    const newStatus = typeof after?.status === 'string' ? after.status : 'unknown';
    const note = typeof before?.note === 'string' && before.note ? before.note : undefined;
    return { label: `marked this as ${newStatus}`, note };
  }
  if (action === 'delete') return { label: 'deleted this item' };
  return { label: action };
}

export function HistoryPanel({
  entries,
  locationNameById,
}: {
  entries: HistoryEntry[];
  locationNameById: Map<string, string>;
}) {
  return (
    <section className="bg-surface border border-rule rounded-[4px] p-6 space-y-4">
      <h2 className="text-[18px] font-medium">History</h2>
      {entries.length === 0 ? (
        <p className="text-ink3 text-[13px]">No history yet.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => {
            const display = describeAction(e.action, e.before, e.after, locationNameById);
            const actorName = e.actor
              ? `${e.actor.display_name}${e.actor.deleted_at ? ' (removed)' : ''}`
              : 'System';
            const avatarName = e.actor?.display_name ?? '?';
            return (
              <li key={e.id} className="flex gap-3">
                <Avatar name={avatarName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium text-ink">{actorName}</span>
                    <span className="text-ink3 ml-2">{relativeTime(e.createdAt)}</span>
                  </p>
                  <p className="text-[14px] text-ink2 mt-0.5">{display.label}</p>
                  {display.note && (
                    <p className="text-[13px] text-ink3 italic mt-1">&ldquo;{display.note}&rdquo;</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
