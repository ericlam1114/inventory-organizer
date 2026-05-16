import Link from 'next/link';
import { Brand } from './Brand';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { Toaster } from './Toaster';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-ink h-14 lg:h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
        <Link href="/clients" className="flex items-center">
          <Brand variant="light" size={28} />
        </Link>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </header>
      <div className="flex-1 p-8 lg:p-12">{children}</div>
      <Toaster />
    </div>
  );
}
