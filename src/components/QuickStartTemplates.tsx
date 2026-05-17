import Link from 'next/link';
import { Plus } from 'lucide-react';

const TEMPLATES = [
  'Closet',
  'Storage unit',
  'Garage',
  'Bedroom',
  'Pantry',
  'Bathroom',
  'Box',
];

export function QuickStartTemplates({ clientId }: { clientId: string }) {
  return (
    <div className="bg-surface border border-rule rounded-[4px] p-6 space-y-4">
      <p className="text-[13px] font-medium text-ink">Add common locations:</p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((name) => (
          <Link
            key={name}
            href={`/clients/${clientId}/locations/new?name=${encodeURIComponent(name)}`}
            className="inline-flex items-center gap-1.5 bg-surface border border-rule rounded-full px-4 py-2 text-[14px] text-ink2 hover:bg-paper hover:text-ink transition-colors"
          >
            <Plus size={13} aria-hidden />
            {name}
          </Link>
        ))}
      </div>
      <p className="text-[13px] text-ink3">
        Or{' '}
        <Link
          href={`/clients/${clientId}/locations/new`}
          className="text-ink underline underline-offset-2 hover:text-ink2"
        >
          + Custom location
        </Link>{' '}
        for something different.
      </p>
    </div>
  );
}
