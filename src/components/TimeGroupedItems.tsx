import { PhotoGrid } from '@/app/(app)/clients/[clientId]/locations/[locationId]/PhotoGrid';

type Item = {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'donated' | 'archived';
  metadata: Record<string, string>;
  needsMetadata: boolean;
  createdAt: string;
  coverSignedUrl: string | null;
};

export type ItemGroup = { label: string; items: Item[] };

export function groupItemsByTime(items: Item[]): ItemGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400_000;
  const weekStart = todayStart - 7 * 86400_000;
  const monthStart = todayStart - 30 * 86400_000;

  const buckets: Record<string, Item[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    'This month': [],
    Earlier: [],
  };

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= todayStart) buckets['Today'].push(item);
    else if (t >= yesterdayStart) buckets['Yesterday'].push(item);
    else if (t >= weekStart) buckets['This week'].push(item);
    else if (t >= monthStart) buckets['This month'].push(item);
    else buckets['Earlier'].push(item);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function TimeGroupedItems({
  clientId,
  groups,
}: {
  clientId: string;
  groups: ItemGroup[];
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-wide text-ink3 font-medium">
            {group.label}
          </h3>
          <PhotoGrid clientId={clientId} items={group.items} />
        </section>
      ))}
    </div>
  );
}
