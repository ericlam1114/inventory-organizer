'use client';

import { useActionState, useEffect, useRef } from 'react';
import { postShareComment } from './actions';

export type ShareCommentView = {
  id: string;
  authorLabel: string;
  isTeam: boolean;
  isMine: boolean;
  body: string;
  createdAt: string;
};

export function ShareComments({
  token, itemId, viewerEmail, senderName, comments,
}: {
  token: string;
  itemId: string;
  viewerEmail: string;
  senderName: string;
  comments: ShareCommentView[];
}) {
  const [state, action, pending] = useActionState(postShareComment.bind(null, token, itemId), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="bg-surface border border-rule rounded-[4px] p-6 space-y-4">
      <div>
        <h2 className="text-[18px] font-medium">Comments</h2>
        <p className="text-ink3 text-[13px]">Questions or notes go straight to {senderName}.</p>
      </div>

      {comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="space-y-1">
              <div className="flex items-baseline gap-2 text-[13px]">
                <span className="font-medium text-ink">{c.isMine ? 'You' : c.authorLabel}</span>
                {c.isTeam && <span className="text-ink3 uppercase tracking-wide text-[11px]">Team</span>}
                <span className="text-ink3">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-[15px] text-ink whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={action} className="space-y-2">
        <label htmlFor="share-comment" className="sr-only">Add a comment</label>
        <textarea
          id="share-comment"
          name="body"
          rows={3}
          required
          maxLength={4000}
          placeholder="Add a comment…"
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] text-[15px]"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink3 text-[12px] truncate">Posting as {viewerEmail}</span>
          <button
            type="submit"
            disabled={pending}
            className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60 text-[13px] font-medium shrink-0"
          >
            {pending ? 'Posting…' : 'Post comment'}
          </button>
        </div>
        {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
      </form>
    </section>
  );
}
