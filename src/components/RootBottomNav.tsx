'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Bell, UserCircle } from 'lucide-react';
import { useMobileNavOpen } from '@/lib/mobile-nav-store';

export function RootBottomNav() {
  const pathname = usePathname();
  const drawerOpen = useMobileNavOpen();
  // Hide on client-context paths (the ClientBottomNav handles those)
  if (pathname.startsWith('/clients/') && pathname.split('/').length > 2) return null;
  // Hide on share/auth/login paths (no nav chrome there)
  if (pathname.startsWith('/share') || pathname.startsWith('/login') || pathname.startsWith('/auth')) return null;
  // Hide while the hamburger drawer is open
  if (drawerOpen) return null;

  const tabs = [
    { href: '/clients',       label: 'Clients',       icon: Users,      active: pathname === '/clients' },
    { href: '/notifications', label: 'Notifications', icon: Bell,       active: pathname.startsWith('/notifications') },
    { href: '/settings/team', label: 'Team',          icon: UserCircle, active: pathname.startsWith('/settings') },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-rule flex items-center justify-around px-4 pt-2 pb-3 z-40"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-[11px] ${active ? 'text-ink' : 'text-ink2'}`}>
          <span className={`flex flex-col items-center px-3 py-1 rounded-full transition-colors ${active ? 'bg-sand2 text-ink' : 'text-ink2'}`}>
            <Icon size={22} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
