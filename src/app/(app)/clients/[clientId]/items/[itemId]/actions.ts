'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateItemMetadata(
  clientId: string,
  itemId: string,
  _prev: { error?: string; saved?: boolean },
  formData: FormData,
) {
  const description = String(formData.get('description') ?? '').trim() || null;
  const metadata: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('meta:')) {
      const key = k.slice(5);
      const value = String(v ?? '').trim();
      if (value) metadata[key] = value;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('items')
    .update({ description, metadata })
    .eq('id', itemId);

  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}/items/${itemId}`);
  return { saved: true };
}
