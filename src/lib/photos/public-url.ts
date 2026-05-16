'use client';

import { createClient } from '@/lib/supabase/client';

export async function getSignedPhotoUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from('inventory-photos').createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function getSignedPhotoUrls(storagePaths: string[], expiresIn = 3600): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from('inventory-photos').createSignedUrls(storagePaths, expiresIn);
  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const item of data) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return map;
}
