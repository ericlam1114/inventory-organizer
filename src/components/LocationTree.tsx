import Link from 'next/link';
import { Folder } from 'lucide-react';

type Location = { id: string; name: string; parent_location_id: string | null };

function buildTree(locations: Location[]): Map<string | null, Location[]> {
  const byParent = new Map<string | null, Location[]>();
  for (const loc of locations) {
    const parent = loc.parent_location_id;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(loc);
  }
  return byParent;
}

function TreeNode({ clientId, location, byParent, depth }: {
  clientId: string;
  location: Location;
  byParent: Map<string | null, Location[]>;
  depth: number;
}) {
  const children = byParent.get(location.id) ?? [];
  return (
    <li>
      <Link
        href={`/clients/${clientId}/locations/${location.id}`}
        className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-[2px] hover:bg-paper"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <Folder size={16} className="text-ink2 shrink-0" />
        <span className="text-[15px]">{location.name}</span>
      </Link>
      {children.length > 0 && (
        <ul className="border-l border-rule ml-5">
          {children.map((c) => (
            <TreeNode key={c.id} clientId={clientId} location={c} byParent={byParent} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LocationTree({ clientId, locations }: { clientId: string; locations: Location[] }) {
  if (locations.length === 0) {
    return (
      <div className="bg-surface border border-rule rounded-[4px] p-8 text-center">
        <p className="text-ink3 text-[15px]">
          No locations yet. Click <strong>New location</strong> to add the first room or storage unit.
        </p>
      </div>
    );
  }

  const byParent = buildTree(locations);
  const roots = byParent.get(null) ?? [];

  return (
    <ul className="space-y-0.5">
      {roots.map((loc) => (
        <TreeNode key={loc.id} clientId={clientId} location={loc} byParent={byParent} depth={0} />
      ))}
    </ul>
  );
}
