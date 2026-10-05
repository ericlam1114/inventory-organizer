'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySession } from '@/lib/shares/cookie';
import { getShareByToken, isItemInShare, isShareLive } from '@/lib/shares/scope';

export async function postShareComment(
  token: string,
  itemId: string,
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { error: 'Write a comment first.' };
  if (body.length > 4000) return { error: 'Comment is too long (4,000 characters max).' };

  // The share cookie + server-side checks are the security boundary (viewer has no auth user)
  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get('share-session')?.value, token);
  if (!session) return { error: 'Your session expired. Reload the page and re-enter your email.' };

  const admin = createAdminClient();
  const share = await getShareByToken(admin, token);
  if (!share || !isShareLive(share)) return { error: 'This share is no longer active.' };
  if (!(await isItemInShare(admin, share, itemId))) return { error: 'Item not found.' };

  const { data: recipient } = await admin
    .from('share_recipients')
    .select('email')
    .eq('share_id', share.id)
    .eq('email', session.email)
    .maybeSingle();
  if (!recipient) return { error: 'This email is no longer on the share.' };

  const { error } = await admin.from('share_comments').insert({
    share_id: share.id,
    item_id: itemId,
    author_email: session.email,
    body,
  });
  if (error) return { error: 'Could not post your comment. Please try again.' };

  await notifyShareCreator(share.created_by, share.client_id, itemId, session.email, body);

  revalidatePath(`/share/${token}/items/${itemId}`);
  return { ok: true };
}

// Best-effort immediate email to the person who created the share
async function notifyShareCreator(
  createdBy: string,
  clientId: string,
  itemId: string,
  fromEmail: string,
  body: string,
) {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  if (!resendKey) return;

  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: item }] = await Promise.all([
      admin.from('profiles').select('email, email_notifications_enabled').eq('id', createdBy).maybeSingle(),
      admin.from('items').select('title').eq('id', itemId).maybeSingle(),
    ]);
    if (!profile?.email || profile.email_notifications_enabled === false) return;

    const itemUrl = `${appUrl}/clients/${clientId}/items/${itemId}`;
    const title = item?.title ?? 'an item';
    const { Resend } = await import('resend');
    await new Resend(resendKey).emails.send({
      from: resendFrom,
      to: profile.email,
      replyTo: fromEmail,
      subject: `${fromEmail} commented on "${title}"`,
      text: `${fromEmail} commented on "${title}" via a share link:\n\n  "${body}"\n\nView and reply: ${itemUrl}`,
      html: `<div style="font-family:Inter,sans-serif;color:#14385A;background:#FFFFFF;padding:24px;">
        <p><strong>${escapeHtml(fromEmail)}</strong> commented on &ldquo;${escapeHtml(title)}&rdquo; via a share link:</p>
        <blockquote style="border-left:2px solid #14385A;padding:8px 16px;margin:16px 0;color:#3E5572;white-space:pre-wrap;">${escapeHtml(body)}</blockquote>
        <p><a href="${itemUrl}" style="display:inline-block;background:#14385A;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:2px;font-weight:500;">View &amp; reply →</a></p>
      </div>`,
    });
  } catch {
    // Notification is best-effort; the comment is already saved
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
