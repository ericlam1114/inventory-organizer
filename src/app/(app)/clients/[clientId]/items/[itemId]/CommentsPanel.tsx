'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MentionAutocomplete, type MentionUser } from './MentionAutocomplete';

type Comment = {
  id: string;
  body: string;
  authorId: string;
  authorDisplayName: string;
  authorRemoved: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

function relativeTime(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/** Parse @[Name](uuid) into segments for rendering */
function renderBody(body: string) {
  const parts: Array<{ type: 'text' | 'mention'; value: string; uuid?: string }> = [];
  const regex = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: body.slice(last, m.index) });
    parts.push({ type: 'mention', value: m[1], uuid: m[2] });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ type: 'text', value: body.slice(last) });
  return parts;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function CommentsPanel({
  itemId, comments: initialComments, mentionable,
}: { itemId: string; comments: Comment[]; mentionable: MentionUser[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState(initialComments);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPrivileged, setIsPrivileged] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      // Detect privileged roles for delete-anyone
      const { data: orgRole } = await supabase.from('org_roles').select('role').eq('user_id', user.id);
      setIsPrivileged((orgRole ?? []).length > 0); // super_admin OR org_team_all
    })();
  }, [supabase]);

  // Update local comments when props change (after router.refresh)
  useEffect(() => setComments(initialComments), [initialComments]);

  return (
    <section className="bg-surface border border-rule rounded-[4px] p-6 space-y-5">
      <h2 className="text-[18px] font-medium">Comments</h2>
      {comments.length === 0 ? (
        <p className="text-ink3 text-[13px]">No comments yet. Be the first to ping someone @ this item.</p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              isPrivileged={isPrivileged}
              mentionable={mentionable}
              onMutated={() => router.refresh()}
            />
          ))}
        </ul>
      )}
      <ComposeBox itemId={itemId} mentionable={mentionable} onPosted={() => router.refresh()} />
    </section>
  );
}

function CommentItem({
  comment: c, currentUserId, isPrivileged, mentionable, onMutated,
}: {
  comment: Comment;
  currentUserId: string | null;
  isPrivileged: boolean;
  mentionable: MentionUser[];
  onMutated: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = currentUserId === c.authorId;
  const withinEditWindow = Date.now() - new Date(c.createdAt).getTime() < 5 * 60 * 1000;
  const canEdit = isAuthor && withinEditWindow && c.deletedAt === null;
  const canDelete = (isAuthor || isPrivileged) && c.deletedAt === null;

  async function handleSaveEdit(newBody: string) {
    setPending(true); setError(null);
    const { error } = await supabase.rpc('edit_comment', { p_comment_id: c.id, p_new_body: newBody });
    if (error) { setError(error.message); setPending(false); return; }
    setEditing(false); setPending(false); onMutated();
  }

  async function handleDelete() {
    if (!confirm("Delete this comment? It'll show as 'deleted' in the thread.")) return;
    setPending(true); setError(null);
    const { error } = await supabase.rpc('delete_comment', { p_comment_id: c.id });
    if (error) { setError(error.message); setPending(false); return; }
    setPending(false); onMutated();
  }

  if (c.deletedAt) {
    return (
      <li className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-rule text-ink3 flex items-center justify-center text-[11px] font-medium shrink-0">·</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-ink3 italic">
            Comment deleted · {relativeTime(c.deletedAt)}
          </p>
        </div>
      </li>
    );
  }

  if (editing) {
    return (
      <li className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-sand2 text-ink2 flex items-center justify-center text-[11px] font-medium shrink-0">{initials(c.authorDisplayName)}</div>
        <div className="flex-1 min-w-0">
          <EditForm initialBody={c.body} mentionable={mentionable} pending={pending} error={error}
            onCancel={() => setEditing(false)} onSubmit={handleSaveEdit} />
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-sand2 text-ink2 flex items-center justify-center text-[11px] font-medium shrink-0">{initials(c.authorDisplayName)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px]">
          <span className="font-medium text-ink">{c.authorDisplayName}{c.authorRemoved ? ' (removed)' : ''}</span>
          <span className="text-ink3 ml-2">{relativeTime(c.createdAt)}</span>
          {c.editedAt && <span className="text-ink3 ml-1">(edited)</span>}
        </p>
        <p className="text-[14px] text-ink2 mt-0.5 whitespace-pre-wrap break-words">
          {renderBody(c.body).map((part, i) =>
            part.type === 'mention'
              ? <span key={i} className="inline-block bg-sand2 text-ink rounded-[2px] px-1.5 py-0.5 text-[13px] font-medium">@{part.value}</span>
              : <span key={i}>{part.value}</span>
          )}
        </p>
        {(canEdit || canDelete) && (
          <div className="flex gap-3 mt-1">
            {canEdit && <button onClick={() => setEditing(true)} className="text-ink3 hover:text-ink text-[12px]">Edit</button>}
            {canDelete && <button onClick={handleDelete} disabled={pending} className="text-ink3 hover:text-danger text-[12px] disabled:opacity-50">Delete</button>}
          </div>
        )}
        {error && <p className="text-danger text-[12px] mt-1">{error}</p>}
      </div>
    </li>
  );
}

function EditForm({ initialBody, mentionable, pending, error, onCancel, onSubmit }: {
  initialBody: string;
  mentionable: MentionUser[];
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState(initialBody);
  return (
    <div className="space-y-2">
      <MentionAutocomplete value={body} onChange={setBody} mentionable={mentionable} rows={3} placeholder="" />
      {error && <p className="text-danger text-[12px]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSubmit(body)} disabled={pending || !body.trim()} className="bg-ink text-paper px-3 py-1.5 rounded-[2px] text-[13px] hover:bg-ink2 disabled:opacity-60">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-ink2 hover:text-ink text-[13px] px-2 py-1.5">Cancel</button>
      </div>
    </div>
  );
}

function ComposeBox({ itemId, mentionable, onPosted }: {
  itemId: string;
  mentionable: MentionUser[];
  onPosted: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!body.trim()) return;
    setPending(true); setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in'); setPending(false); return; }
    const { error } = await supabase.from('comments').insert({ item_id: itemId, author_id: user.id, body: body.trim() });
    if (error) { setError(error.message); setPending(false); return; }
    setBody(''); setPending(false); onPosted();
  }

  return (
    <div className="border-t border-rule pt-4 space-y-2">
      <MentionAutocomplete
        value={body} onChange={setBody} mentionable={mentionable}
        placeholder="Write a comment… (type @ to mention someone)"
        rows={2}
      />
      {error && <p className="text-danger text-[12px]">{error}</p>}
      <div className="flex justify-end">
        <button onClick={handlePost} disabled={pending || !body.trim()}
          className="bg-ink text-paper px-3 py-1.5 rounded-[2px] text-[13px] hover:bg-ink2 disabled:opacity-60">
          {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
