const STYLES: Record<string, string> = {
  active: 'bg-sand2 text-ink2',
  donated: 'bg-sand2 text-success',
  archived: 'bg-rule text-ink3',
};

export function StatusBadge({ status }: { status: 'active' | 'donated' | 'archived' }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide ${STYLES[status]}`}>
      {status}
    </span>
  );
}
