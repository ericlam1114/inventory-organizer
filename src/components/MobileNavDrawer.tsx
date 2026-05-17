'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { mobileNavStore, useMobileNavOpen } from '@/lib/mobile-nav-store';
import {
  Menu,
  X,
  Users,
  Bell,
  UserCircle,
  Compass,
  Camera,
  Search,
  Share2,
  Sliders,
  Folder,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Location = { id: string; name: string; parent_location_id: string | null };

/**
 * Hamburger drawer for mobile. Replaces the implicit "you can't reach the
 * sidebar items on mobile" problem. Renders the same nav as the desktop
 * sidebar — Root nav at root paths, Client nav inside a client.
 */
export function MobileNavDrawer() {
  const params = useParams<{ clientId?: string }>();
  const pathname = usePathname();
  const open = useMobileNavOpen();
  const setOpen = mobileNavStore.set;
  const [locations, setLocations] = useState<Location[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);

  const clientId = params.clientId;
  const inClient = Boolean(clientId);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll while drawer open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Fetch client context when needed
  useEffect(() => {
    if (!inClient || !clientId) {
      setLocations([]);
      setClientName(null);
      return;
    }
    const supabase = createClient();
    (async () => {
      const [{ data: client }, { data: locs }] = await Promise.all([
        supabase.from('clients').select('name').eq('id', clientId).maybeSingle(),
        supabase
          .from('locations')
          .select('id, name, parent_location_id')
          .eq('client_id', clientId)
          .order('name'),
      ]);
      setClientName(client?.name ?? null);
      setLocations(locs ?? []);
    })();
  }, [inClient, clientId, open]);

  // Hide on share/auth/login paths — no nav chrome there
  if (
    pathname.startsWith('/share') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth')
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden text-paper hover:text-sand2 transition-colors p-2 -ml-2"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="md:hidden fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-paper border-r border-rule flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
              <span className="text-[11px] uppercase tracking-widest text-ink3 font-medium truncate">
                {inClient ? clientName ?? 'Loading…' : 'Account'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-ink2 hover:text-ink p-1 -mr-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {inClient ? (
                <ClientNavItems clientId={clientId!} pathname={pathname} locations={locations} />
              ) : (
                <RootNavItems pathname={pathname} />
              )}
            </div>

            {/* Sign out anchored bottom */}
            <div className="border-t border-rule p-4">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-full text-[14px] text-ink2 hover:bg-sand2/60 hover:text-ink transition-colors"
                >
                  <LogOut size={16} aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function RootNavItems({ pathname }: { pathname: string }) {
  const tabs = [
    { href: '/clients',       label: 'Clients',       icon: Users,      active: pathname === '/clients' || pathname.startsWith('/clients?') },
    { href: '/notifications', label: 'Notifications', icon: Bell,       active: pathname.startsWith('/notifications') },
    { href: '/settings/team', label: 'Team',          icon: UserCircle, active: pathname.startsWith('/settings') },
  ];
  return (
    <>
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 px-3 py-3 rounded-full text-[14px] transition-colors ${
            active
              ? 'bg-sand2 text-ink font-medium'
              : 'text-ink2 hover:bg-sand2/60 hover:text-ink'
          }`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </>
  );
}

function ClientNavItems({
  clientId,
  pathname,
  locations,
}: {
  clientId: string;
  pathname: string;
  locations: Location[];
}) {
  const base = `/clients/${clientId}`;
  const tabs = [
    { href: base,                          label: 'Browse',        icon: Compass, active: pathname === base || pathname.startsWith(`${base}/locations`) || pathname.startsWith(`${base}/items`) },
    { href: `${base}/capture`,             label: 'Capture',       icon: Camera,  active: pathname.startsWith(`${base}/capture`) },
    { href: `${base}/search`,              label: 'Search',        icon: Search,  active: pathname.startsWith(`${base}/search`) },
    { href: `${base}/shares`,              label: 'Shares',        icon: Share2,  active: pathname.startsWith(`${base}/shares`) },
    { href: `${base}/settings/fields`,     label: 'Custom fields', icon: Sliders, active: pathname.startsWith(`${base}/settings/fields`) },
    { href: '/notifications',              label: 'Notifications', icon: Bell,    active: pathname === '/notifications' },
    { href: '/clients',                    label: 'All clients',   icon: Users,   active: false },
  ];
  return (
    <>
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 px-3 py-3 rounded-full text-[14px] transition-colors ${
            active
              ? 'bg-sand2 text-ink font-medium'
              : 'text-ink2 hover:bg-sand2/60 hover:text-ink'
          }`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}

      {locations.length > 0 && (
        <>
          <div className="border-t border-rule my-3" />
          <p className="text-[11px] uppercase tracking-widest text-ink3 font-medium px-3 mb-1">
            Inventory
          </p>
          <ul className="space-y-0.5">
            {locations
              .filter((l) => l.parent_location_id === null)
              .map((loc) => (
                <LocationDrawerNode
                  key={loc.id}
                  clientId={clientId}
                  location={loc}
                  locations={locations}
                  pathname={pathname}
                  depth={0}
                />
              ))}
          </ul>
        </>
      )}
    </>
  );
}

function LocationDrawerNode({
  clientId,
  location,
  locations,
  pathname,
  depth,
}: {
  clientId: string;
  location: Location;
  locations: Location[];
  pathname: string;
  depth: number;
}) {
  const href = `/clients/${clientId}/locations/${location.id}`;
  const active = pathname === href || pathname.startsWith(href + '/');
  const children = locations.filter((l) => l.parent_location_id === location.id);

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-full text-[13px] transition-colors ${
          active ? 'bg-sand2 text-ink font-medium' : 'text-ink2 hover:bg-sand2/60 hover:text-ink'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <Folder size={13} className={active ? 'text-ink' : 'text-ink3'} aria-hidden />
        <span className="truncate">{location.name}</span>
      </Link>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <LocationDrawerNode
              key={c.id}
              clientId={clientId}
              location={c}
              locations={locations}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
