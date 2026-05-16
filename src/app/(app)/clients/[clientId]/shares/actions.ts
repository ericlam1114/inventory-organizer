'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createShare(
  clientId: string,
  _prev: { error?: string },
  formData: FormData,
) {
  const rootLocationId = String(formData.get('rootLocationId') ?? '').trim();
  const recipientsRaw = String(formData.get('recipients') ?? '');
  const expiresInDays = parseInt(String(formData.get('expiresInDays') ?? '30'), 10);
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!rootLocationId) return { error: 'Pick a subtree root' };
  const recipients = recipientsRaw
    .split(/[,\n\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (recipients.length === 0) return { error: 'Add at least one valid recipient email' };
  if (!Number.isFinite(expiresInDays) || expiresInDays <= 0 || expiresInDays > 365) return { error: 'Expiry must be 1–365 days' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000).toISOString();

  const { data: share, error: shareErr } = await supabase
    .from('shares')
    .insert({
      client_id: clientId,
      root_location_id: rootLocationId,
      token,
      created_by: user.id,
      expires_at: expiresAt,
      note,
    })
    .select('id')
    .single();
  if (shareErr || !share) return { error: shareErr?.message ?? 'create failed' };

  // Insert recipients
  const { error: recErr } = await supabase
    .from('share_recipients')
    .insert(recipients.map((email) => ({ share_id: share.id, email })));
  if (recErr) return { error: recErr.message };

  // Send emails (best-effort)
  await sendShareInvites(token, recipients, clientId, rootLocationId, note, user.id);

  revalidatePath(`/clients/${clientId}/shares`);
  redirect(`/clients/${clientId}/shares`);
}

export async function revokeShare(clientId: string, shareId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId);
  if (error) throw error;
  revalidatePath(`/clients/${clientId}/shares`);
}

async function sendShareInvites(
  token: string,
  recipients: string[],
  clientId: string,
  rootLocationId: string,
  note: string | null,
  createdBy: string,
) {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  if (!resendKey) return; // No-op if not configured

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', createdBy).maybeSingle();
  const { data: location } = await admin.from('locations').select('name').eq('id', rootLocationId).maybeSingle();
  const senderName = profile?.display_name ?? 'Straighten Up Home';
  const subtreeName = location?.name ?? 'Inventory';
  const shareUrl = `${appUrl}/share/${token}`;

  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  await Promise.allSettled(recipients.map(async (email) => {
    const subject = `${senderName} shared "${subtreeName}" with you`;
    const text = [
      `${senderName} shared an inventory subset with you on her organization app.`,
      note ? `\n  "${note}"\n` : '',
      `Subset:  ${subtreeName}`,
      ``,
      `Open: ${shareUrl}`,
      ``,
      `You'll be asked to enter this email address (${email}) to view.`,
    ].join('\n');
    const html = `<div style="font-family:Inter,sans-serif;color:#1A1A1A;background:#FAF8F5;padding:24px;">
      <p>${escapeHtml(senderName)} shared an inventory subset with you on her organization app.</p>
      ${note ? `<blockquote style="border-left:2px solid #C8B89A;padding:8px 16px;margin:16px 0;color:#4A4A4A;">${escapeHtml(note)}</blockquote>` : ''}
      <p><strong>Subset:</strong> ${escapeHtml(subtreeName)}</p>
      <p><a href="${shareUrl}" style="display:inline-block;background:#E8DFCB;color:#1A1A1A;text-decoration:none;padding:10px 16px;border-radius:2px;font-weight:500;">Open inventory →</a></p>
      <p style="font-size:12px;color:#8A8A8A;margin-top:32px;">You'll be asked to enter this email address (${escapeHtml(email)}) to view.</p>
    </div>`;
    await resend.emails.send({ from: resendFrom, to: email, subject, text, html });
  }));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
