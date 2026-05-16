'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createLocationAction(
  clientId: string,
  _prev: { error?: string },
  formData: FormData,
) {
  const name = String(formData.get('name') ?? '').trim();
  const parentLocationId = String(formData.get('parentLocationId') ?? '').trim() || null;
  if (!name) return { error: 'Name is required' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('locations')
    .insert({ client_id: clientId, name, parent_location_id: parentLocationId })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}/locations/${data.id}`);
}
