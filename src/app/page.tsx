import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Signed-in users skip the landing and go straight to their clients.
  if (user) redirect('/clients');

  return (
    <main className="relative min-h-screen bg-[#F2E6BC] flex flex-col overflow-hidden">
      <div aria-hidden className="cinema-bg">
        <span />
        <span className="b" />
      </div>
      <div aria-hidden className="cinema-grain" />
      <section className="relative flex-1 flex items-center justify-center px-6 py-16 lg:py-24">
        <div className="relative max-w-xl text-center space-y-8">
          <p className="text-ink3 text-[11px] uppercase tracking-[0.32em]">Invite only</p>
          <h1 className="font-display text-[56px] lg:text-[88px] font-medium leading-[1.02] tracking-[-0.015em] text-ink">
            Inventory by
            <br />
            <span className="italic">Straighten Up.</span>
          </h1>
          <p className="text-ink2 text-[17px] leading-[1.6] max-w-md mx-auto">
            A private workspace to catalog, track, and share archived
            wardrobes, furniture, and personal collections.
          </p>
          <div className="pt-2 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-ink text-paper px-6 py-3 rounded-[2px] hover:bg-ink2 text-[14px] font-medium"
            >
              Sign in
            </Link>
           
          </div>
        </div>
      </section>

      <footer className="relative px-6 py-8 text-center text-ink3 text-[12px]">
        © {new Date().getFullYear()} Straighten Up Home
      </footer>
    </main>
  );
}
