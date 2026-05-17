'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Compass, Camera, Search, Bell, Folder } from 'lucide-react';

type Location = { id: string; name: string; parent_location_id: string | null };

type Props = {
  clientName: string;
  locations: Location[];
  itemCount: number;
  needsCount: number;
};

function buildTree(locations: Location[]): Map<string | null, Location[]> {
  const byParent = new Map<string | null, Location[]>();
  for (const loc of locations) {
    const parent = loc.parent_location_id;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(loc);
  }
  return byParent;
}

function SidebarTreeNode({
  clientId,
  location,
  byParent,
  depth,
  currentPath,
}: {
  clientId: string;
  location: Location;
  byParent: Map<string | null, Location[]>;
  depth: number;
  currentPath: string;
}) {
  const href = `/clients/${clientId}/locations/${location.id}`;
  const active = currentPath === href || currentPath.startsWith(href + '/');
  const children = byParent.get(location.id) ?? [];

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-full text-[13px] transition-colors group ${
          active
            ? 'bg-sand2 text-ink font-medium'
            : 'text-ink2 hover:bg-sand2/60 hover:text-ink'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <Folder
          size={13}
          className={active ? 'text-ink' : 'text-ink3 group-hover:text-ink2'}
          aria-hidden
        />
        <span className="truncate">{location.name}</span>
      </Link>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <SidebarTreeNode
              key={c.id}
              clientId={clientId}
              location={c}
              byParent={byParent}
              depth={depth + 1}
              currentPath={currentPath}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ClientSidebar({ clientName, locations, itemCount, needsCount }: Props) {
  const params = useParams<{ clientId: string }>();
  const pathname = usePathname();
  const clientId = params.clientId;
  const base = `/clients/${clientId}`;

  const tabs = [
    { href: base,                label: 'Browse',        icon: Compass,  active: pathname === base || pathname.startsWith(`${base}/locations`) || pathname.startsWith(`${base}/items`) },
    { href: `${base}/capture`,   label: 'Capture',       icon: Camera,   active: pathname.startsWith(`${base}/capture`) },
    { href: `${base}/search`,    label: 'Search',        icon: Search,   active: pathname.startsWith(`${base}/search`) },
    { href: '/notifications',    label: 'Notifications', icon: Bell,     active: pathname === '/notifications' },
  ];

  const byParent = buildTree(locations);
  const roots = byParent.get(null) ?? [];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-14 lg:top-16 bottom-0 w-64 bg-paper border-r border-rule z-20 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 p-4">
        {/* Client label */}
        <p className="text-[11px] uppercase tracking-widest text-ink3 font-medium mb-3 truncate">
          {clientName}
        </p>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 mb-4">
          {tabs.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-[14px] transition-colors ${
                active
                  ? 'bg-sand2 text-ink font-medium'
                  : 'text-ink2 hover:bg-sand2/60 hover:text-ink'
              }`}
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-rule my-1" />

        {/* Inventory section */}
        <p className="text-[11px] uppercase tracking-widest text-ink3 font-medium mt-3 mb-2">
          Inventory
        </p>

        {/* Location tree — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          {roots.length === 0 ? (
            <p className="text-[12px] text-ink3 px-2 py-1">No locations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {roots.map((loc) => (
                <SidebarTreeNode
                  key={loc.id}
                  clientId={clientId}
                  location={loc}
                  byParent={byParent}
                  depth={0}
                  currentPath={pathname}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status pill — sticky bottom */}
      <div className="border-t border-rule px-4 py-3 shrink-0">
        <p className="text-[12px] text-ink3">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
          {needsCount > 0 && (
            <span className="text-warning ml-1">· {needsCount} need metadata</span>
          )}
        </p>
      </div>
    </aside>
  );
}
