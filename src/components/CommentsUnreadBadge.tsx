'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { COMMENTS_SEEN_EVENT } from '@/components/MarkCommentsSeen';

export function useCommentsUnreadCount(clientId: string) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.rpc('client_comment_unread_count', { p_client_id: clientId });
      if (!cancelled && typeof data === 'number') setCount(data);
    }
    load();
    window.addEventListener(COMMENTS_SEEN_EVENT, load);
    return () => { cancelled = true; window.removeEventListener(COMMENTS_SEEN_EVENT, load); };
  }, [supabase, clientId, pathname]);

  return count;
}

export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-paper text-[10px] font-semibold leading-none tabular-nums ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
