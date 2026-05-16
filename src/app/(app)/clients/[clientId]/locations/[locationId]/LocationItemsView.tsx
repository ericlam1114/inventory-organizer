'use client';

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
      <div className="bg-surface border border-rule rounded-[4px] p-12 text-center">
        <p className="text-ink3 text-[15px]">No items here yet. Use the <strong>Capture</strong> tab below to add one.</p>
      </div>
    );
  }
  return view === 'grid'
    ? <PhotoGrid clientId={clientId} items={items} />
    : <ItemSheet clientId={clientId} items={items} fields={fields} />;
}
