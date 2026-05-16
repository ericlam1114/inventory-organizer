'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createClientAction(_prev: { error?: string }, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({ name })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/clients');
  redirect(`/clients/${data.id}`);
}
