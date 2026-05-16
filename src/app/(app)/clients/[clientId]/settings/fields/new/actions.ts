'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type FieldType = 'text' | 'date' | 'select';

export async function createField(
  clientId: string,
  _prev: { error?: string },
  formData: FormData,
) {
  const name = String(formData.get('name') ?? '').trim();
  const key = String(formData.get('key') ?? '').trim().toLowerCase();
  const type = String(formData.get('type') ?? '') as FieldType;
  const required = formData.get('required') === 'on';
  const optionsRaw = String(formData.get('options') ?? '').trim();

  if (!name) return { error: 'Name is required' };
  if (!/^[a-z_][a-z0-9_]*$/.test(key)) return { error: 'Key must be snake_case (lowercase, underscore-separated)' };
  if (!['text', 'date', 'select'].includes(type)) return { error: 'Pick a type' };

  let options: string[] | null = null;
  if (type === 'select') {
    options = optionsRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (options.length === 0) return { error: 'Select type requires at least one option (one per line or comma-separated)' };
  }

  const supabase = await createClient();
  // Compute next position
  const { data: existing } = await supabase
    .from('custom_field_definitions')
    .select('position')
    .eq('client_id', clientId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from('custom_field_definitions').insert({
    client_id: clientId,
    name,
    key,
    type,
    options,
    required,
    position: nextPosition,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}/settings/fields`);
  redirect(`/clients/${clientId}/settings/fields`);
}
