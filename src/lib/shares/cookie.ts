import { createHmac } from 'crypto';

export type SharePayload = { token: string; email: string; expires: number };

function secret(): string {
  const s = process.env.SHARE_COOKIE_SECRET;
  if (!s) throw new Error('SHARE_COOKIE_SECRET env var not set');
  return s;
}

export function signSession(payload: SharePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verifySession(cookie: string | undefined, expectedToken: string): SharePayload | null {
  if (!cookie) return null;
  const [body, mac] = cookie.split('.');
  if (!body || !mac) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (expected !== mac) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SharePayload;
    if (payload.token !== expectedToken) return null;
    if (Date.now() > payload.expires) return null;
    return payload;
  } catch {
    return null;
  }
}
