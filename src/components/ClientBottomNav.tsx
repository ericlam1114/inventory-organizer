'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Compass, Camera, Search } from 'lucide-react';

export function ClientBottomNav() {
  const params = useParams<{ clientId: string }>();
  const pathname = usePathname();
  const base = `/clients/${params.clientId}`;

  const tabs = [
    { href: base,                  label: 'Browse',  icon: Compass, active: pathname === base || pathname.startsWith(`${base}/locations`) || pathname.startsWith(`${base}/items`) },
    { href: `${base}/capture`,     label: 'Capture', icon: Camera,  active: pathname.startsWith(`${base}/capture`), primary: true },
    { href: `${base}/search`,      label: 'Search',  icon: Search,  active: pathname.startsWith(`${base}/search`) },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule flex items-center justify-around px-4 pt-2 pb-3 z-40"
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
            <Icon size={24} />
          )}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
