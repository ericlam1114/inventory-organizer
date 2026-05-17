import Link from 'next/link';
import { Brand } from './Brand';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { Toaster } from './Toaster';
import { GlobalSearch } from './GlobalSearch';
import { MobileNavDrawer } from './MobileNavDrawer';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* Top header band */}
      <header className="bg-ink h-14 lg:h-16 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
        {/* Mobile hamburger — desktop hides it */}
        <MobileNavDrawer />

        <Link href="/clients" className="flex items-center shrink-0">
          <Brand variant="light" size={28} />
        </Link>

        {/* Global search — desktop only, grows to fill space */}
        <div className="flex-1 flex items-center min-w-0">
          <GlobalSearch />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4 shrink-0">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </header>

      {/* Body: sidebar + main content laid out via CSS margin on desktop */}
      <div className="flex flex-1">
        {children}
      </div>

      <Toaster />
    </div>
  );
}
