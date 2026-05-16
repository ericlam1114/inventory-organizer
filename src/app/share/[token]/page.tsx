import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySession } from '@/lib/shares/cookie';
import { ShareViewerBanner } from './ShareViewerBanner';
import { ShareItemsGrid } from './ShareItemsGrid';

async function checkAccess(token: string) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('share-session')?.value;
  return verifySession(cookie, token);
}

async function collectSubtreeIds(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  rootId: string,
): Promise<string[]> {
  const { data: all } = await admin
    .from('locations')
    .select('id, parent_location_id')
    .eq('client_id', clientId);
  if (!all) return [rootId];

  const childrenByParent = new Map<string, string[]>();
  for (const l of all) {
    const p = l.parent_location_id ?? '__root__';
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p)!.push(l.id);
  }

  const result: string[] = [];
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    const children = childrenByParent.get(id) ?? [];
    for (const c of children) queue.push(c);
  }
  return result;
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await checkAccess(token);
  if (!session) redirect(`/share/${token}/auth`);

  const admin = createAdminClient();

  // Re-validate share state
  const { data: share } = await admin
    .from('shares')
    .select('id, client_id, root_location_id, expires_at, revoked_at, note, created_by')
    .eq('token', token)
    .maybeSingle();
  if (!share) notFound();
  if (share.revoked_at) {
    return <SharePagePlaceholder title="This share was revoked by the sender." />;
  }
  if (new Date(share.expires_at).getTime() < Date.now()) {
    return (
      <SharePagePlaceholder
        title={`This share expired on ${new Date(share.expires_at).toLocaleDateString()}.`}
      />
    );
  }

  // Increment view count (dedup: only if no view within 30 min)
  const { data: recipient } = await admin
    .from('share_recipients')
    .select('view_count, last_viewed_at')
    .eq('share_id', share.id)
    .eq('email', session.email)
    .maybeSingle();
  if (recipient) {
    const shouldCount =
      !recipient.last_viewed_at ||
      Date.now() - new Date(recipient.last_viewed_at).getTime() > 30 * 60 * 1000;
    await admin
      .from('share_recipients')
      .update({
        view_count: shouldCount ? recipient.view_count + 1 : recipient.view_count,
        last_viewed_at: new Date().toISOString(),
        first_viewed_at:
          recipient.view_count === 0 ? new Date().toISOString() : undefined,
      })
      .eq('share_id', share.id)
      .eq('email', session.email);
  }

  // Sender + root location name
  const [{ data: sender }, { data: root }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', share.created_by).maybeSingle(),
    admin.from('locations').select('name').eq('id', share.root_location_id).maybeSingle(),
  ]);

  // Subtree: all descendant location ids
  const locIds = await collectSubtreeIds(admin, share.client_id, share.root_location_id);

  const { data: items } = await admin
    .from('items')
    .select('id, title, status, cover_photo_id, location_id, created_at')
    .in('location_id', locIds)
    .order('created_at', { ascending: false });

  // Sign cover photos
  const coverIds = (items ?? []).map((i) => i.cover_photo_id).filter(Boolean) as string[];
  const pathByItem = new Map<string, string>();
  const signed = new Map<string, string>();
  if (coverIds.length > 0) {
    const { data: covers } = await admin
      .from('item_photos')
      .select('id, item_id, storage_path')
      .in('id', coverIds);
    if (covers) {
      for (const c of covers) pathByItem.set(c.item_id, c.storage_path);
      const paths = covers.map((c) => c.storage_path);
      const { data: urls } = await admin.storage
        .from('inventory-photos')
        .createSignedUrls(paths, 1800);
      if (urls) {
        for (const u of urls) {
          if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Image
          src="/logo-light.svg"
          alt="Straighten Up"
          width={96}
          height={28}
          style={{ height: 'auto', width: 'auto' }}
          priority
        />
      </header>
      <ShareViewerBanner
        senderName={sender?.display_name ?? 'Janelle Lam'}
        expiresAt={share.expires_at}
        note={share.note}
      />
      <div className="flex-1 p-6 lg:p-12 max-w-5xl mx-auto w-full space-y-6">
        <h1 className="text-[32px] font-medium leading-[40px]">{root?.name ?? 'Inventory'}</h1>
        <ShareItemsGrid
          token={token}
          items={(items ?? []).map((i) => ({
            id: i.id,
            title: i.title,
            status: i.status as 'active' | 'donated' | 'archived',
            coverSignedUrl: i.cover_photo_id
              ? (signed.get(pathByItem.get(i.id) ?? '') ?? null)
              : null,
          }))}
        />
      </div>
    </main>
  );
}

function SharePagePlaceholder({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-paper flex flex-col">
      <header className="bg-ink h-14 lg:h-16 flex items-center px-6 lg:px-8">
        <Image
          src="/logo-light.svg"
          alt="Straighten Up"
          width={96}
          height={28}
          style={{ height: 'auto', width: 'auto' }}
          priority
        />
      </header>
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-ink2 text-[15px] text-center max-w-md">{title}</p>
      </div>
    </main>
  );
}
