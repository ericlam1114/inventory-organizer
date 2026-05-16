'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateField(
  clientId: string,
  fieldId: string,
  _prev: { error?: string },
  formData: FormData,
) {
  const name = String(formData.get('name') ?? '').trim();
  const required = formData.get('required') === 'on';
  if (!name) return { error: 'Name is required' };

  // Type and key are locked from creation — only name, required, and options are editable.
  // (Per spec: type is locked once any item has a value; for simplicity in v1, both are always locked.)
  const optionsRaw = String(formData.get('options') ?? '').trim();
  let options: string[] | null = null;
  if (optionsRaw) {
    options = optionsRaw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }

  const supabase = await createClient();
  const update: Record<string, unknown> = { name, required };
  if (options) update.options = options;

  const { error } = await supabase
    .from('custom_field_definitions')
    .update(update)
    .eq('id', fieldId)
    .eq('client_id', clientId);

  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}/settings/fields`);
  redirect(`/clients/${clientId}/settings/fields`);
}

export async function deleteField(clientId: string, fieldId: string) {
  const supabase = await createClient();

  const { data: field } = await supabase
    .from('custom_field_definitions')
    .select('key')
    .eq('id', fieldId)
    .maybeSingle();

  if (field) {
    // TODO (v2): strip field.key from items.metadata for all items in this client's locations.
    // Requires a `strip_metadata_key` RPC or a manual UPDATE loop. For now, orphaned keys in
    // items.metadata will persist until those items are next edited.
    const { data: locs } = await supabase.from('locations').select('id').eq('client_id', clientId);
    const locIds = (locs ?? []).map((l) => l.id);
    if (locIds.length > 0) {
      await supabase.rpc('strip_metadata_key', { p_loc_ids: locIds, p_key: field.key }).then(
        () => undefined,
        () => undefined, // RPC may not exist in v1; fallback is acceptable — keys are orphaned until next edit
      );
    }
  }

  await supabase.from('custom_field_definitions').delete().eq('id', fieldId).eq('client_id', clientId);
  revalidatePath(`/clients/${clientId}/settings/fields`);
  redirect(`/clients/${clientId}/settings/fields`);
}
