import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Verify Vercel cron call (optional but recommended)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!resendKey) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not set' });
  }

  // Lazy-load Resend so the route still compiles if the package is missing in CI
  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  const admin = createAdminClient();

  // Find candidates: unread, unsent, > 10 min old, recipient has email notifications enabled
  // Window: only look back 24 hours to avoid massive backfill if cron was down
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await admin
    .from('notifications')
    .select('id, recipient_id, client_id, source_comment_id, source_item_id, created_at')
    .is('read_at', null)
    .is('email_sent_at', null)
    .lt('created_at', tenMinAgo)
    .gt('created_at', oneDayAgo)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Bulk-fetch related rows
  const recipientIds = Array.from(new Set(candidates.map((n) => n.recipient_id)));
  const commentIds = Array.from(new Set(candidates.map((n) => n.source_comment_id)));
  const itemIds = Array.from(new Set(candidates.map((n) => n.source_item_id)));

  const [{ data: profiles }, { data: comments }, { data: items }] = await Promise.all([
    admin.from('profiles').select('id, email, display_name, email_notifications_enabled, deleted_at').in('id', recipientIds),
    admin.from('comments').select('id, body, author_id').in('id', commentIds),
    admin.from('items').select('id, title').in('id', itemIds),
  ]);

  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id)));
  const { data: authorProfiles } = authorIds.length > 0
    ? await admin.from('profiles').select('id, display_name').in('id', authorIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  const commentById = new Map((comments ?? []).map((c) => [c.id, c] as const));
  const itemById = new Map((items ?? []).map((i) => [i.id, i] as const));
  const authorById = new Map((authorProfiles ?? []).map((p) => [p.id, p] as const));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const n of candidates) {
    const recipient = profileById.get(n.recipient_id);
    if (!recipient || !recipient.email_notifications_enabled || recipient.deleted_at) {
      // Mark as "sent" so we don't keep evaluating this row every cron run
      await admin.from('notifications').update({ email_sent_at: new Date().toISOString() }).eq('id', n.id);
      skipped += 1;
      continue;
    }
    const comment = commentById.get(n.source_comment_id);
    const item = itemById.get(n.source_item_id);
    const author = comment ? authorById.get(comment.author_id) : null;
    if (!comment || !item) {
      // Source rows missing (deleted?) — mark sent to skip
      await admin.from('notifications').update({ email_sent_at: new Date().toISOString() }).eq('id', n.id);
      skipped += 1;
      continue;
    }

    const authorName = author?.display_name ?? 'Someone';
    const itemTitle = item.title;
    const bodySnippet = comment.body
      .replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1')
      .slice(0, 240);
    const deepLink = `${appUrl}/clients/${n.client_id}/items/${n.source_item_id}#comment-${n.source_comment_id}`;

    const subject = `${authorName} mentioned you on "${itemTitle}"`;
    const text = [
      `${authorName} just mentioned you in a comment on Janelle's inventory app.`,
      '',
      `   "${bodySnippet}"`,
      '',
      `Open: ${deepLink}`,
      '',
      `To stop email notifications, sign in and toggle them off in your profile.`,
    ].join('\n');
    const html = `<div style="font-family:Inter,sans-serif;color:#14385A;background:#FFFFFF;padding:24px;">
      <p style="font-size:15px;line-height:24px;">${escapeHtml(authorName)} just mentioned you in a comment on Janelle's inventory app.</p>
      <blockquote style="border-left:2px solid #14385A;padding:8px 16px;margin:16px 0;color:#3E5572;font-size:15px;">${escapeHtml(bodySnippet)}</blockquote>
      <p><a href="${deepLink}" style="display:inline-block;background:#14385A;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:2px;font-size:13px;font-weight:500;">Open comment →</a></p>
      <p style="font-size:12px;color:#8A98A8;margin-top:32px;">To stop email notifications, sign in and toggle them off in your profile.</p>
    </div>`;

    try {
      const result = await resend.emails.send({
        from: resendFrom,
        to: recipient.email,
        subject,
        text,
        html,
      });
      if (result.error) {
        failed += 1;
        continue;
      }
      await admin.from('notifications').update({ email_sent_at: new Date().toISOString() }).eq('id', n.id);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ sent, skipped, failed, considered: candidates.length });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
