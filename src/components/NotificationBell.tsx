'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell as BellIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type NotifRow = {
  id: string;
  client_id: string;
  source_comment_id: string;
  source_item_id: string;
  read_at: string | null;
  created_at: string;
  comment_body: string;
  comment_author: string;
  item_title: string;
};

export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<NotifRow[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUserId(null); setItems([]); return; }
    setUserId(user.id);

    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, client_id, source_comment_id, source_item_id, read_at, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!notifs || notifs.length === 0) { setItems([]); return; }

    // Enrich with comment body + author + item title
    const commentIds = notifs.map((n) => n.source_comment_id);
    const itemIds = notifs.map((n) => n.source_item_id);
    const [{ data: comments }, { data: itemsRows }] = await Promise.all([
      supabase.from('comments').select('id, body, author_id').in('id', commentIds),
      supabase.from('items').select('id, title').in('id', itemIds),
    ]);

    const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id)));
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', authorIds)
      : { data: [] };

    const commentById = new Map((comments ?? []).map((c) => [c.id, c] as const));
    const itemById = new Map((itemsRows ?? []).map((i) => [i.id, i] as const));
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));

    const enriched: NotifRow[] = notifs.map((n) => {
      const c = commentById.get(n.source_comment_id);
      const i = itemById.get(n.source_item_id);
      const author = c ? profileById.get(c.author_id) : null;
      const bodyText = c?.body ? c.body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1') : '';
      return {
        id: n.id,
        client_id: n.client_id,
        source_comment_id: n.source_comment_id,
        source_item_id: n.source_item_id,
        read_at: n.read_at,
        created_at: n.created_at,
        comment_body: bodyText,
        comment_author: author?.display_name ?? 'Someone',
        item_title: i?.title ?? 'an item',
      };
    });
    setItems(enriched);
  }

  useEffect(() => { load(); }, []);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const unread = items.filter((n) => !n.read_at).length;
  const unreadLabel = unread > 9 ? '9+' : String(unread);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  async function markAllRead() {
    if (!userId) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId).is('read_at', null);
    load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="text-paper hover:text-sand2 relative"
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-warning text-paper text-[10px] font-medium flex items-center justify-center">
            {unreadLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-rule rounded-[4px] shadow-sm z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
            <p className="text-[13px] font-medium">{unread} unread</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-ink3 hover:text-ink text-[12px]">Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-ink3 text-[13px] text-center">No notifications yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-rule last:border-b-0">
                  <Link
                    href={`/clients/${n.client_id}/items/${n.source_item_id}#comment-${n.source_comment_id}`}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className="block px-4 py-3 hover:bg-paper"
                  >
                    <div className="flex gap-3">
                      {!n.read_at && <span className="w-2 h-2 rounded-full bg-info mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px]"><span className="font-medium">{n.comment_author}</span> mentioned you on &ldquo;{n.item_title}&rdquo;</p>
                        {n.comment_body && <p className="text-ink3 text-[12px] truncate mt-0.5">— {n.comment_body}</p>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-3 border-t border-rule text-[13px] text-ink2 hover:bg-paper"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
