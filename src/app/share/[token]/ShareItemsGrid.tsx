'use client';

import Link from 'next/link';
import Image from 'next/image';
import { StatusBadge } from '@/components/StatusBadge';

type Item = {
  id: string;
  title: string;
  status: 'active' | 'donated' | 'archived';
  locationName: string;
  coverSignedUrl: string | null;
};

export function ShareItemsGrid({ token, items }: { token: string; items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-ink3 text-[15px]">No items in this subset.</p>;
  }

  // Group by location when the share spans more than one (e.g. whole-client shares)
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    if (!groups.has(item.locationName)) groups.set(item.locationName, []);
    groups.get(item.locationName)!.push(item);
  }
  if (groups.size <= 1) return <Grid token={token} items={items} />;

  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="space-y-10">
      {sorted.map(([name, groupItems]) => (
        <section key={name} className="space-y-4">
          <h2 className="font-display text-[24px] lg:text-[28px] font-medium leading-tight">
            {name} <span className="text-ink3 text-[14px] font-sans">{groupItems.length}</span>
          </h2>
          <Grid token={token} items={groupItems} />
        </section>
      ))}
    </div>
  );
}

function Grid({ token, items }: { token: string; items: Item[] }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/share/${token}/items/${item.id}`} className="block group">
            <div className="relative w-full aspect-square bg-paper group-hover:bg-rule">
              {item.coverSignedUrl ? (
                <Image src={item.coverSignedUrl} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink3 text-[12px]">no photo</div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[14px] font-medium truncate flex-1">{item.title}</span>
              <StatusBadge status={item.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
