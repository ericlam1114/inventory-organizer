'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Compass, Camera, Search } from 'lucide-react';
import { useMobileNavOpen } from '@/lib/mobile-nav-store';

export function ClientBottomNav() {
  const params = useParams<{ clientId: string }>();
  const pathname = usePathname();
  const drawerOpen = useMobileNavOpen();
  const base = `/clients/${params.clientId}`;

  // Hide while the hamburger drawer is open
  if (drawerOpen) return null;

  const tabs = [
    {
      href: base,
      label: 'Browse',
      icon: Compass,
      active: pathname === base || pathname.startsWith(`${base}/locations`) || pathname.startsWith(`${base}/items`),
      primary: false,
    },
    {
      href: `${base}/capture`,
      label: 'Capture',
      icon: Camera,
      active: pathname.startsWith(`${base}/capture`),
      primary: true,
    },
    {
      href: `${base}/search`,
      label: 'Search',
      icon: Search,
      active: pathname.startsWith(`${base}/search`),
      primary: false,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-rule flex items-center justify-around px-4 pt-2 pb-3 z-40"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ href, label, icon: Icon, active, primary }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center gap-0.5 text-[11px] ${primary ? '' : active ? 'text-ink' : 'text-ink2'}`}
        >
          {primary ? (
            <span className={`flex items-center justify-center w-11 h-11 rounded-full ${active ? 'bg-ink2' : 'bg-ink'} text-paper`}>
              <Icon size={20} />
            </span>
          ) : (
            <span className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-colors ${active ? 'bg-sand2 text-ink' : 'text-ink2'}`}>
              <Icon size={22} />
            </span>
          )}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
