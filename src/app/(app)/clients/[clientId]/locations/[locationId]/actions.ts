'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function deleteLocationAction(
  clientId: string,
  locationId: string,
  _prev: { error?: string },
  _formData: FormData,
) {
  void _prev;
  void _formData;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Please sign in to delete a location.' };

  const { error } = await supabase.rpc('trash_location', {
    p_client_id: clientId,
    p_location_id: locationId,
  });
  if (error) return { error: 'Could not move this location to Trash. Please try again.' };

  revalidatePath(`/clients/${clientId}`, 'layout');
  redirect(`/clients/${clientId}`);
}

export async function restoreLocationAction(
  clientId: string,
  locationId: string,
  _prev: { error?: string },
  _formData: FormData,
) {
  void _prev;
  void _formData;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Please sign in to restore a location.' };

  const { error } = await supabase.rpc('restore_location', {
    p_client_id: clientId,
    p_location_id: locationId,
  });
  if (error) {
    return { error: error.message.includes('restore the parent location first')
      ? 'Restore the parent location first.'
      : 'Could not restore this location. Please try again.' };
  }

  revalidatePath(`/clients/${clientId}`, 'layout');
  redirect(`/clients/${clientId}/locations/${locationId}`);
}
