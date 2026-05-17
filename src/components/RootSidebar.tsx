'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Bell, Users2, LogOut } from 'lucide-react';

const nav = [
  { href: '/clients',       label: 'Clients',       icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/team', label: 'Team',          icon: Users2 },
];

// Matches /clients/<uuid>/... (i.e. inside a specific client)
const CLIENT_ROUTE_RE = /^\/clients\/[^/]+/;

export function RootSidebar() {
  const pathname = usePathname();

  // Hide when inside a client context — ClientSidebar renders there instead
  if (CLIENT_ROUTE_RE.test(pathname)) return null;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-14 lg:top-16 bottom-0 w-64 bg-paper border-r border-rule p-4 z-20">
      <p className="text-[11px] uppercase tracking-widest text-ink3 font-medium mb-3">Account</p>

      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
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
          );
        })}
      </nav>

      <div className="mt-auto">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 rounded-full text-[14px] text-ink2 hover:bg-sand2/60 hover:text-ink w-full transition-colors"
          >
            <LogOut size={16} aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
