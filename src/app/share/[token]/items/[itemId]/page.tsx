import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySession } from '@/lib/shares/cookie';
import { Brand } from '@/components/Brand';
import { StatusBadge } from '@/components/StatusBadge';
import { ShareViewerBanner } from '../../ShareViewerBanner';

export default async function ShareItemPage({
  params,
}: {
  params: Promise<{ token: string; itemId: string }>;
}) {
  const { token, itemId } = await params;
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get('share-session')?.value, token);
  if (!session) redirect(`/share/${token}/auth`);

  const admin = createAdminClient();

  // Verify share is still valid + item is in subtree
  const { data: share } = await admin
    .from('shares')
    .select('id, client_id, root_location_id, expires_at, revoked_at, note, created_by')
    .eq('token', token)
    .maybeSingle();
  if (!share || share.revoked_at || new Date(share.expires_at).getTime() < Date.now()) {
    redirect(`/share/${token}`);
  }

  const { data: item } = await admin
    .from('items')
    .select('id, title, description, status, metadata, location_id, cover_photo_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) notFound();

  // Verify item is in the share's subtree (security: prevents URL-guessing items from other locations)
  const { data: allLocs } = await admin
    .from('locations')
    .select('id, parent_location_id')
    .eq('client_id', share.client_id);
  const inSubtree = (locId: string): boolean => {
    let cur: string | null = locId;
    while (cur) {
      if (cur === share.root_location_id) return true;
      const parent =
        (allLocs ?? []).find((l) => l.id === cur)?.parent_location_id ?? null;
      cur = parent;
    }
    return false;
  };
  if (!inSubtree(item.location_id)) notFound();

  const [{ data: photos }, { data: fields }, { data: sender }] = await Promise.all([
    admin
      .from('item_photos')
      .select('id, storage_path')
      .eq('item_id', itemId)
      .order('created_at'),
    admin
      .from('custom_field_definitions')
      .select('id, name, key, type')
      .eq('client_id', share.client_id)
      .order('position'),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', share.created_by)
      .maybeSingle(),
  ]);

  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signedRows } =
    paths.length > 0
      ? await admin.storage.from('inventory-photos').createSignedUrls(paths, 1800)
      : { data: [] };
  const signed = new Map<string, string>();
  for (const r of signedRows ?? []) {
    if (r.signedUrl && r.path) signed.set(r.path, r.signedUrl);
  }
  const cover = (photos ?? []).find((p) => p.id === item.cover_photo_id) ?? photos?.[0];
  const others = (photos ?? []).filter((p) => p.id !== cover?.id);

  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Brand variant="light" size={28} />
      </header>
      <ShareViewerBanner
        senderName={sender?.display_name ?? 'Janelle Lam'}
        expiresAt={share.expires_at}
        note={share.note}
      />
      <div className="flex-1 p-6 lg:p-12 max-w-3xl mx-auto w-full space-y-6">
        <Link
          href={`/share/${token}`}
          className="inline-flex items-center gap-1 text-ink2 hover:text-ink text-[13px]"
        >
          <ChevronLeft size={14} /> Back
        </Link>

        {cover && (
          <div className="relative w-full aspect-square bg-paper">
            <Image
              src={signed.get(cover.storage_path) ?? ''}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        )}
        {others.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {others.map((p) => (
              <div key={p.id} className="relative shrink-0 w-20 h-20">
                <Image
                  src={signed.get(p.storage_path) ?? ''}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-medium leading-[1.2] flex-1">{item.title}</h1>
          <StatusBadge status={item.status as 'active' | 'donated' | 'archived'} />
        </div>

        {item.description && (
          <p className="text-ink2 text-[15px]">{item.description}</p>
        )}

        {fields && fields.length > 0 && (
          <div className="bg-surface border border-rule rounded-[4px] p-6 space-y-3">
            {fields.map((f) => {
              const v = (item.metadata as Record<string, string> | null)?.[f.key];
              return (
                <div key={f.id} className="flex items-baseline gap-3">
                  <span className="text-ink3 text-[13px] uppercase tracking-wide w-32 shrink-0">
                    {f.name}
                  </span>
                  <span className="text-[15px] text-ink">{v || '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
