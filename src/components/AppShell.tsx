import Link from 'next/link';
import { User } from 'lucide-react';
import { Brand } from './Brand';
import { NotificationBell } from './NotificationBell';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-ink h-14 lg:h-16 flex items-center justify-between px-6 lg:px-8">
        <Link href="/clients" className="flex items-center">
          <Brand variant="light" size={28} />
        </Link>
        <div className="flex items-center gap-4">
          {/* Client switcher placeholder — built in Task 4.1 */}
          <NotificationBell />
          <form action="/auth/signout" method="post">
            <button type="submit" aria-label="Sign out" className="text-paper hover:text-sand2">
              <User size={20} />
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1 p-8 lg:p-12">{children}</div>
    </div>
  );
}
