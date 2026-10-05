import type { createAdminClient } from '@/lib/supabase/admin';

type Admin = ReturnType<typeof createAdminClient>;

export type ShareRow = {
  id: string;
  client_id: string;
  root_location_id: string | null;
  expires_at: string;
  revoked_at: string | null;
  note: string | null;
  created_by: string;
};

export async function getShareByToken(admin: Admin, token: string): Promise<ShareRow | null> {
  const { data } = await admin
    .from('shares')
    .select('id, client_id, root_location_id, expires_at, revoked_at, note, created_by')
    .eq('token', token)
    .maybeSingle();
  return data;
}

export function isShareLive(share: Pick<ShareRow, 'revoked_at' | 'expires_at'>): boolean {
  return !share.revoked_at && new Date(share.expires_at).getTime() >= Date.now();
}

/**
 * Active location ids visible through a share. A null root means the whole
 * client. Returns null when the shared root itself is in Trash.
 */
export async function getShareLocationIds(admin: Admin, share: ShareRow): Promise<string[] | null> {
  const { data: all } = await admin
    .from('locations')
    .select('id, parent_location_id')
    .eq('client_id', share.client_id)
    .is('deleted_at', null);
  const locations = all ?? [];

  if (share.root_location_id === null) return locations.map((l) => l.id);
  if (!locations.some((l) => l.id === share.root_location_id)) return null;

  const childrenByParent = new Map<string, string[]>();
  for (const l of locations) {
    if (!l.parent_location_id) continue;
    if (!childrenByParent.has(l.parent_location_id)) childrenByParent.set(l.parent_location_id, []);
    childrenByParent.get(l.parent_location_id)!.push(l.id);
  }

  const result: string[] = [];
  const queue: string[] = [share.root_location_id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const c of childrenByParent.get(id) ?? []) queue.push(c);
  }
  return result;
}

/** True when the item exists and sits inside the share's visible locations. */
export async function isItemInShare(admin: Admin, share: ShareRow, itemId: string): Promise<boolean> {
  const [{ data: item }, locIds] = await Promise.all([
    admin.from('items').select('location_id').eq('id', itemId).maybeSingle(),
    getShareLocationIds(admin, share),
  ]);
  return !!item && !!locIds && locIds.includes(item.location_id);
}
