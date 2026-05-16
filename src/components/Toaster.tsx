'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { subscribe, dismissToast, type Toast } from '@/lib/toast';

const borderFor = {
  success: 'border-success',
  error: 'border-danger',
  info: 'border-info',
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <div
      className={`flex items-start gap-3 bg-surface border border-rule border-l-2 ${borderFor[toast.kind]} rounded-[4px] shadow-sm px-4 py-3 min-w-[260px] max-w-[360px] animate-in`}
      role="alert"
    >
      <p className="flex-1 text-[14px] text-ink">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismissToast(toast.id)}
        className="text-ink3 hover:text-ink shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
