import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSignedPhotoUrlsServer } from '@/lib/photos/public-url.server';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { MarkAllSeenButton } from './MarkAllSeenButton';

type FeedRow = {
  comment_id: string;
  body: string;
  author_id: string;
  created_at: string;
  item_id: string;
  item_title: string;
  item_status: string;
  cover_photo_id: string | null;
  location_id: string;
  location_name: string;
  is_new: boolean;
};

export default async function CommentsFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const filter = sp.filter === 'new' ? 'new' : 'all';

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc('client_comment_feed', {
    p_client_id: clientId,
    p_query: q || null,
    p_limit: 200,
  });
  const all = (rows ?? []) as FeedRow[];
  const newCount = all.filter((r) => r.is_new).length;
  const feed = filter === 'new' ? all.filter((r) => r.is_new) : all;

  const authorIds = Array.from(new Set(feed.map((r) => r.author_id)));
  const coverIds = Array.from(new Set(feed.map((r) => r.cover_photo_id).filter(Boolean) as string[]));
  const [{ data: profiles }, { data: covers }] = await Promise.all([
    authorIds.length > 0
      ? supabase.from('profiles').select('id, display_name').in('id', authorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    coverIds.length > 0
      ? supabase.from('item_photos').select('id, storage_path').in('id', coverIds)
      : Promise.resolve({ data: [] as { id: string; storage_path: string }[] }),
  ]);
  const signedByPath = await getSignedPhotoUrlsServer((covers ?? []).map((c) => c.storage_path));
  const coverUrlById = new Map((covers ?? []).map((c) => [c.id, signedByPath.get(c.storage_path) ?? null] as const));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name] as const));

  const hrefFor = (f: 'all' | 'new') => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (f === 'new') p.set('filter', 'new');
    const s = p.toString();
    return `/clients/${clientId}/comments${s ? `?${s}` : ''}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-12 space-y-6">
      <div>
        <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em]">Comments</h1>
        <p className="text-ink3 text-[14px] mt-1">
          {newCount > 0 ? `${newCount} new comment${newCount !== 1 ? 's' : ''} · open an item to clear it` : 'Every comment on this client’s items, newest first'}
        </p>
      </div>

      <form action={`/clients/${clientId}/comments`} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search comments (e.g. donate)"
          className="w-full bg-surface border border-rule rounded-[2px] pl-9 pr-3 py-2.5 text-[16px] sm:text-[14px] focus:outline-none focus:border-ink2"
        />
        {filter === 'new' && <input type="hidden" name="filter" value="new" />}
      </form>

      <div className="flex gap-2">
        <Link
          href={hrefFor('all')}
          className={`px-3 py-1.5 rounded-[2px] text-[13px] ${filter === 'all' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
        >
          All
        </Link>
        <Link
          href={hrefFor('new')}
          className={`px-3 py-1.5 rounded-[2px] text-[13px] ${filter === 'new' ? 'bg-ink text-paper' : 'bg-surface border border-rule text-ink2 hover:text-ink'}`}
        >
          New{newCount > 0 ? ` (${newCount})` : ''}
        </Link>
        {newCount > 0 && <MarkAllSeenButton clientId={clientId} />}
      </div>

      {feed.length === 0 ? (
        <div className="bg-surface border border-rule rounded-[4px] py-12 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sand2 text-ink2 mb-4">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-[16px] font-medium mb-1">
            {q ? 'No matching comments' : filter === 'new' ? 'All caught up' : 'No comments yet'}
          </h3>
          <p className="text-ink3 text-[14px] max-w-xs mx-auto">
            {q ? `Nothing mentions “${q}”.` : 'Comments left on any photo for this client will show up here.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-rule rounded-[4px] border border-rule bg-surface">
          {feed.map((r) => {
            const author = nameById.get(r.author_id) ?? 'Someone';
            const bodyText = r.body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1');
            const coverUrl = r.cover_photo_id ? coverUrlById.get(r.cover_photo_id) : null;
            return (
              <li key={r.comment_id}>
                <Link
                  href={`/clients/${clientId}/items/${r.item_id}#comment-${r.comment_id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-paper"
                >
                  <div className="relative w-16 h-16 shrink-0 bg-paper overflow-hidden rounded-[2px]">
                    {coverUrl ? (
                      <Image src={coverUrl} alt={r.item_title} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink3 text-[10px]">no photo</div>
                    )}
                    {r.is_new && (
                      <span className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-danger ring-2 ring-surface" aria-label="New" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium truncate flex-1">{r.item_title}</p>
                      {r.item_status !== 'active' && (
                        <StatusBadge status={r.item_status as 'active' | 'donated' | 'archived'} />
                      )}
                    </div>
                    <p className="text-ink3 text-[12px] truncate">{r.location_name}</p>
                    <div className="flex items-start gap-2 mt-1.5">
                      <Avatar name={author} size={20} />
                      <p className="text-[14px] text-ink2 break-words min-w-0">
                        <span className="font-medium text-ink">{author}</span> {bodyText}
                      </p>
                    </div>
                    <p className="text-ink3 text-[11px] mt-1">{new Date(r.created_at).toLocaleString()}</p>
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
