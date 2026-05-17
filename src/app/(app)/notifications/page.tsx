import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';

export default async function NotificationsPage({
  searchParams,
}: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const filter = sp.filter === 'unread' ? 'unread' : 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let query = supabase
    .from('notifications')
    .select('id, client_id, source_comment_id, source_item_id, read_at, created_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (filter === 'unread') query = query.is('read_at', null);

  const { data: notifs } = await query;
  const commentIds = (notifs ?? []).map((n) => n.source_comment_id);
  const itemIds = (notifs ?? []).map((n) => n.source_item_id);

  const [{ data: comments }, { data: items }] = await Promise.all([
    commentIds.length > 0
      ? supabase.from('comments').select('id, body, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase.from('items').select('id, title').in('id', itemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id)));
  const { data: profiles } = authorIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', authorIds)
    : { data: [] };

  const cBy = new Map((comments ?? []).map((c) => [c.id, c] as const));
  const iBy = new Map((items ?? []).map((i) => [i.id, i] as const));
  const pBy = new Map((profiles ?? []).map((p) => [p.id, p] as const));

  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-6">
      <div>
        <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2]">Notifications</h1>
        <p className="text-ink3 text-[13px] mt-1">
          {(notifs ?? []).filter((n) => !n.read_at).length} unread
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/notifications"
          className={`px-3 py-1.5 rounded-[2px] text-[13px] ${filter === 'all' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
        >
          All
        </Link>
        <Link
          href="/notifications?filter=unread"
          className={`px-3 py-1.5 rounded-[2px] text-[13px] ${filter === 'unread' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
        >
          Unread
        </Link>
      </div>

      {(!notifs || notifs.length === 0) ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
            <Bell size={20} />
          </div>
          <h3 className="text-[16px] font-medium mb-1">All caught up</h3>
          <p className="text-ink3 text-[14px] max-w-xs mx-auto">
            {"We'll let you know when someone @mentions you."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule rounded-[4px] border border-rule bg-surface">
          {notifs.map((n) => {
            const c = cBy.get(n.source_comment_id);
            const i = iBy.get(n.source_item_id);
            const author = c ? pBy.get(c.author_id) : null;
            const authorName = author?.display_name ?? 'Someone';
            const bodyText = c?.body ? c.body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1') : '';
            return (
              <li key={n.id} className="group">
                <Link
                  href={`/clients/${n.client_id}/items/${n.source_item_id}#comment-${n.source_comment_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper min-h-[48px]"
                >
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-info shrink-0" />}
                  <Avatar name={authorName} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px]"><span className="font-medium">{authorName}</span> mentioned you on &ldquo;{i?.title ?? 'an item'}&rdquo;</p>
                    {bodyText && <p className="text-ink3 text-[12px] truncate mt-0.5">— {bodyText}</p>}
                    <p className="text-ink3 text-[11px] mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
