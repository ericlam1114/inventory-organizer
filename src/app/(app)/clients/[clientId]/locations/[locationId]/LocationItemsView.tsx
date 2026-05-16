'use client';

import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { PhotoGrid } from './PhotoGrid';
import { ItemSheet } from './ItemSheet';

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
type Field = {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'date' | 'select';
  options: string[] | null;
  required: boolean;
};

export function LocationItemsView({
  clientId, view, items, fields,
}: { clientId: string; view: 'grid' | 'sheet'; items: Item[]; fields: Field[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
          <ImageOff size={20} />
        </div>
        <h3 className="text-[16px] font-medium mb-1">No items yet</h3>
        <p className="text-ink3 text-[14px] mb-5 max-w-xs mx-auto">
          Use Capture to photograph and add items to this location.
        </p>
        <Link
          href={`/clients/${clientId}/capture`}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
        >
          Go to Capture
        </Link>
      </div>
    );
  }
  return view === 'grid'
    ? <PhotoGrid clientId={clientId} items={items} />
    : <ItemSheet clientId={clientId} items={items} fields={fields} />;
}
