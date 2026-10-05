'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export const COMMENTS_SEEN_EVENT = 'comments-seen';

// Records that the viewer has seen an item's comments (clears its "new" flag).
export function MarkCommentsSeen({ itemId }: { itemId: string }) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { error } = await supabase
        .from('item_comment_reads')
        .upsert({ user_id: user.id, item_id: itemId, last_seen_at: new Date().toISOString() });
      if (!error && !cancelled) window.dispatchEvent(new Event(COMMENTS_SEEN_EVENT));
    })();
    return () => { cancelled = true; };
  }, [supabase, itemId]);

  return null;
}
