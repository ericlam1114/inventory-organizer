import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditFieldForm from './EditFieldForm';

export default async function EditFieldPage({
  params,
}: {
  params: Promise<{ clientId: string; fieldId: string }>;
}) {
  const { clientId, fieldId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: field } = await supabase
    .from('custom_field_definitions')
    .select('id, name, key, type, options, required')
    .eq('id', fieldId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (!field) notFound();

  return <EditFieldForm clientId={clientId} fieldId={fieldId} field={field} />;
}
