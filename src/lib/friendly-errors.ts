/**
 * Translate Supabase / Postgres error messages into user-friendly strings.
 * Always console.error the raw error for debugging, then surface the friendly
 * version to the UI.
 */

type AnyError = { message?: string; code?: string; details?: string | null } | Error | null | undefined;

export function friendlyError(err: AnyError, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  const message = 'message' in err ? err.message ?? '' : '';
  const code = 'code' in err ? err.code ?? '' : '';

  // Common Postgres error codes
  if (code === '23505' || /duplicate key|already exists/i.test(message)) {
    return 'That already exists. Try a different value.';
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return "Can't do that — something else still references this.";
  }
  if (code === '23502' || /not.null|null value/i.test(message)) {
    return 'A required field is missing.';
  }
  if (code === '23514' || /check constraint/i.test(message)) {
    return 'That value isn\'t allowed.';
  }
  if (code === '42501' || /row.level security|insufficient privilege/i.test(message)) {
    return "You don't have permission to do that.";
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return 'Network problem. Check your connection and try again.';
  }
  if (/rate.limit|too many/i.test(message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (/expired|jwt|token/i.test(message)) {
    return 'Your session expired. Sign in again.';
  }
  return fallback;
}

/**
 * Convenience wrapper: log raw + return friendly. Use in toast.error calls.
 */
export function reportError(err: AnyError, fallback?: string): string {
  if (err) console.error('[friendly-errors] raw:', err);
  return friendlyError(err, fallback);
}
