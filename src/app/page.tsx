import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Brand } from '@/components/Brand';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Signed-in users skip the landing and go straight to their clients.
  if (user) redirect('/clients');

  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Brand variant="light" size={28} />
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-16 lg:py-24">
        <div className="max-w-xl text-center space-y-8">
          <p className="text-ink3 text-[12px] uppercase tracking-[0.18em]">Invite only</p>
          <h1 className="text-[40px] lg:text-[56px] font-medium leading-[1.1] text-ink">
            Inventory by Straighten Up.
          </h1>
          <p className="text-ink2 text-[17px] leading-[1.6]">
            A private workspace for Janelle Lam and her clients to catalog,
            track, and share archived wardrobes, furniture, and personal
            collections.
          </p>
          <div className="pt-2 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-ink text-paper px-6 py-3 rounded-[2px] hover:bg-ink2 text-[14px] font-medium"
            >
              Sign in
            </Link>
            <p className="text-ink3 text-[12px]">
              Access is by invitation. If you don&apos;t have one yet, reach out to Janelle directly.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-ink3 text-[12px]">
        © {new Date().getFullYear()} Straighten Up Home
      </footer>
    </main>
  );
}
