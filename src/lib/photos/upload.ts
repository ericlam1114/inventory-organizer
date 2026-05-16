'use client';

import { createClient } from '@/lib/supabase/client';

export type UploadInput = {
  clientId: string;
  itemId: string;
  blob: Blob;
  filename: string;
};

export async function uploadItemPhoto({ clientId, itemId, blob, filename }: UploadInput): Promise<{ id: string; storage_path: string }> {
  const supabase = createClient();
  const photoUuid = crypto.randomUUID();
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `clients/${clientId}/items/${itemId}/${photoUuid}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('inventory-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  // Get the current user id for uploaded_by
  const { data: { user } } = await supabase.auth.getUser();

  const { data: photo, error: insertError } = await supabase
    .from('item_photos')
    .insert({
      item_id: itemId,
      storage_path: path,
      uploaded_by: user?.id ?? null,
    })
    .select('id, storage_path')
    .single();
  if (insertError) {
    // Best-effort cleanup of orphan storage object
    await supabase.storage.from('inventory-photos').remove([path]).catch(() => undefined);
    throw insertError;
  }

  // If this is the first photo for the item, set as cover
  const { data: existing } = await supabase
    .from('item_photos')
    .select('id')
    .eq('item_id', itemId)
    .limit(2);
  if (existing && existing.length === 1) {
    await supabase.from('items').update({ cover_photo_id: photo.id }).eq('id', itemId);
  }

  return photo;
}
