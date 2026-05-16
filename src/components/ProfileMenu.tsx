'use client';

import { useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name ?? user.email ?? null);
    })();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Profile menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-paper hover:text-sand2"
      >
        <User size={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-rule rounded-[4px] shadow-sm z-50 py-1">
          {displayName && (
            <>
              <p className="px-4 py-2 text-[12px] text-ink3 truncate">{displayName}</p>
              <div className="border-t border-rule my-1" />
            </>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-[14px] text-ink hover:bg-sand2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
