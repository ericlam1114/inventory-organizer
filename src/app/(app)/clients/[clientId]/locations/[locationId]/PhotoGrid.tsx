'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

type Item = {
  id: string;
  title: string;
  status: 'active' | 'donated' | 'archived';
  needsMetadata: boolean;
  coverSignedUrl: string | null;
};

export function PhotoGrid({ clientId, items }: { clientId: string; items: Item[] }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/clients/${clientId}/items/${item.id}`}
            className="block group"
          >
            <div className="relative w-full aspect-square bg-paper group-hover:bg-rule">
              {item.coverSignedUrl ? (
                <Image
                  src={item.coverSignedUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink3 text-[12px]">no photo</div>
              )}
              {item.needsMetadata && (
                <span className="absolute top-2 left-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning text-paper">
                  <AlertTriangle size={12} />
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[14px] font-medium truncate flex-1 group-hover:text-ink">{item.title}</span>
              <StatusBadge status={item.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
