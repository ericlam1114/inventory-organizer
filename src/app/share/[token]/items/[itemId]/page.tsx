import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySession } from '@/lib/shares/cookie';
import { getShareByToken, isItemInShare, isShareLive } from '@/lib/shares/scope';
import { Brand } from '@/components/Brand';
import { StatusBadge } from '@/components/StatusBadge';
import { ShareViewerBanner } from '../../ShareViewerBanner';
import { SharePhotos } from './SharePhotos';
import { ShareComments } from './ShareComments';

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

  // Verify share is still valid + item is in scope
  // (security: prevents URL-guessing items from other locations or clients)
  const share = await getShareByToken(admin, token);
  if (!share || !isShareLive(share)) redirect(`/share/${token}`);
  if (!(await isItemInShare(admin, share, itemId))) notFound();

  const { data: item } = await admin
    .from('items')
    .select('id, title, description, status, metadata, location_id, cover_photo_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) notFound();

  const [{ data: photos }, { data: fields }, { data: sender }, { data: comments }] = await Promise.all([
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
    // Only this share's thread — recipients of other shares never see it
    admin
      .from('share_comments')
      .select('id, author_email, author_id, body, created_at')
      .eq('share_id', share.id)
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .order('created_at'),
  ]);

  const teamIds = Array.from(new Set((comments ?? []).map((c) => c.author_id).filter(Boolean) as string[]));
  const { data: teamProfiles } = teamIds.length > 0
    ? await admin.from('profiles').select('id, display_name').in('id', teamIds)
    : { data: [] };
  const teamNameById = new Map((teamProfiles ?? []).map((p) => [p.id, p.display_name] as const));

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
  const ordered = cover ? [cover, ...(photos ?? []).filter((p) => p.id !== cover.id)] : [];
  const senderName = sender?.display_name ?? 'Janelle Lam';

  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Brand variant="light" size={28} />
      </header>
      <ShareViewerBanner
        senderName={senderName}
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

        <SharePhotos
          itemTitle={item.title}
          photos={ordered.map((p) => ({ id: p.id, signedUrl: signed.get(p.storage_path) ?? null }))}
        />

        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-[36px] sm:text-[42px] lg:text-[52px] font-medium leading-[1.05] tracking-[-0.01em] flex-1">{item.title}</h1>
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

        <ShareComments
          token={token}
          itemId={itemId}
          viewerEmail={session.email}
          senderName={senderName}
          comments={(comments ?? []).map((c) => ({
            id: c.id,
            authorLabel: c.author_id
              ? (teamNameById.get(c.author_id) ?? 'Team')
              : (c.author_email ?? 'Guest'),
            isTeam: !!c.author_id,
            isMine: c.author_email === session.email,
            body: c.body,
            createdAt: c.created_at,
          }))}
        />
      </div>
    </main>
  );
}
