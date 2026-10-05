'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { reportError } from '@/lib/friendly-errors';
import { COMMENTS_SEEN_EVENT } from '@/components/MarkCommentsSeen';

export function MarkAllSeenButton({ clientId }: { clientId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPending(false); return; }
    const { error } = await supabase
      .from('comment_feed_reads')
      .upsert({ user_id: user.id, client_id: clientId, last_seen_at: new Date().toISOString() });
    setPending(false);
    if (error) { toast.error(reportError(error)); return; }
    window.dispatchEvent(new Event(COMMENTS_SEEN_EVENT));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[13px] bg-surface border border-rule text-ink2 hover:text-ink disabled:opacity-60 ml-auto"
    >
      <CheckCheck size={14} /> {pending ? 'Marking…' : 'Mark all seen'}
    </button>
  );
}
