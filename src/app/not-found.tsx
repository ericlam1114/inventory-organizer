import Link from 'next/link';
import { Brand } from '@/components/Brand';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Link href="/clients" className="flex items-center">
          <Brand variant="light" size={28} />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-[48px] font-medium leading-[56px] text-ink">404</h1>
          <p className="text-ink2 text-[15px]">
            We couldn&apos;t find that page. It may have been moved or never existed.
          </p>
          <Link
            href="/clients"
            className="inline-block bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
          >
            Back to clients
          </Link>
        </div>
      </main>
    </div>
  );
}
