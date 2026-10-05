'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { reportError } from '@/lib/friendly-errors';

export type ShareThread = {
  shareId: string;
  recipients: string[];
  live: boolean;
  comments: Array<{
    id: string;
    authorLabel: string;
    isTeam: boolean;
    body: string;
    createdAt: string;
  }>;
};

/** Comments left by share-link recipients, one thread per share, with team replies. */
export function ShareCommentsPanel({ itemId, threads }: { itemId: string; threads: ShareThread[] }) {
  if (threads.length === 0) return null;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[18px] font-medium">Comments from share links</h2>
        <p className="text-ink3 text-[13px]">Only the people on each share link can see that thread.</p>
      </div>
      {threads.map((t) => <Thread key={t.shareId} itemId={itemId} thread={t} />)}
    </section>
  );
}

function Thread({ itemId, thread }: { itemId: string; thread: ShareThread }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function reply() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('share_comments').insert({
      share_id: thread.shareId, item_id: itemId, author_id: user?.id, body: text,
    });
    if (error) {
      toast.error(reportError(error));
    } else {
      setBody('');
      toast.success('Reply posted');
      router.refresh();
    }
    setBusy(false);
  }

  async function hide(commentId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('share_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);
    if (error) toast.error(reportError(error));
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="bg-surface border border-rule rounded-[4px] p-6 space-y-4">
      <div className="flex items-center gap-2 text-[13px] text-ink2">
        <LinkIcon size={14} className="shrink-0" />
        <span className="truncate">Shared with {thread.recipients.join(', ') || '—'}</span>
        {!thread.live && <span className="text-ink3 uppercase tracking-wide text-[11px] shrink-0">Expired</span>}
      </div>

      <ul className="space-y-4">
        {thread.comments.map((c) => (
          <li key={c.id} className="space-y-1">
            <div className="flex items-baseline gap-2 text-[13px]">
              <span className="font-medium text-ink truncate">{c.authorLabel}</span>
              {c.isTeam && <span className="text-ink3 uppercase tracking-wide text-[11px]">Team</span>}
              <span className="text-ink3 shrink-0">{new Date(c.createdAt).toLocaleString()}</span>
              <button
                type="button"
                onClick={() => hide(c.id)}
                disabled={busy}
                className="ml-auto text-ink3 hover:text-danger text-[12px] shrink-0"
              >
                Hide
              </button>
            </div>
            <p className="text-[15px] text-ink whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>

      {thread.live && (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Reply — visible to everyone on this share link"
            aria-label="Reply to share comments"
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[15px]"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reply}
              disabled={busy || !body.trim()}
              className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium"
            >
              {busy ? 'Posting…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
