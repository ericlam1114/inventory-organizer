'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useRef } from 'react';

export function GlobalSearch() {
  const params = useParams<{ clientId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const inClient = Boolean(params.clientId);
  const placeholder = inClient ? 'Search inventory…' : 'Search clients…';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? '';
    if (inClient) {
      router.push(`/clients/${params.clientId}/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/clients?q=${encodeURIComponent(q)}`);
    }
  }

  // suppress unused warning — pathname used to re-render on nav
  void pathname;

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden md:flex flex-1 max-w-md mx-auto"
      role="search"
    >
      <div className="flex items-center w-full bg-paper rounded-full px-4 py-2 gap-2 border border-rule focus-within:border-ink/30 focus-within:ring-2 focus-within:ring-ink/10 transition-all">
        <Search size={15} className="text-ink3 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink3 outline-none min-w-0"
          aria-label={placeholder}
        />
      </div>
    </form>
  );
}
