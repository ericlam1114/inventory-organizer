'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SWIPE_MIN_X = 60;
const SWIPE_MAX_Y = 50;

// Skip gestures/keys that belong to something else: text fields, the photo lightbox,
// or anything explicitly marked data-no-swipe.
function shouldIgnore(target: EventTarget | null): boolean {
  if (document.querySelector('[data-lightbox]')) return true;
  if (!(target instanceof Element)) return false;
  return !!target.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], [data-no-swipe]');
}

export function ItemNavigator({
  prevHref, nextHref, position, total,
}: {
  prevHref: string | null;
  nextHref: string | null;
  position: number;
  total: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);
  }, [router, prevHref, nextHref]);

  // Keyboard: ← / →
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || shouldIgnore(e.target)) return;
      if (e.key === 'ArrowLeft' && prevHref) router.push(prevHref);
      if (e.key === 'ArrowRight' && nextHref) router.push(nextHref);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router, prevHref, nextHref]);

  // Touch: swipe left → next, swipe right → previous
  useEffect(() => {
    let start: { x: number; y: number; ignore: boolean } | null = null;
    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1) { start = null; return; }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, ignore: shouldIgnore(e.target) };
    }
    function onEnd(e: TouchEvent) {
      if (!start || start.ignore) { start = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dy) > SWIPE_MAX_Y) return;
      if (dx < 0 && nextHref) router.push(nextHref);
      if (dx > 0 && prevHref) router.push(prevHref);
    }
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [router, prevHref, nextHref]);

  if (total <= 1) return null;

  const btn = 'inline-flex items-center justify-center w-11 h-11 rounded-full border border-rule bg-surface text-ink hover:bg-paper';
  const disabled = 'inline-flex items-center justify-center w-11 h-11 rounded-full border border-rule text-ink3 opacity-40';

  return (
    <div className="flex items-center gap-2">
      {prevHref ? (
        <Link href={prevHref} aria-label="Previous item" className={btn}><ChevronLeft size={18} /></Link>
      ) : (
        <span aria-hidden className={disabled}><ChevronLeft size={18} /></span>
      )}
      <span className="text-[12px] text-ink3 tabular-nums min-w-[4.5rem] text-center">
        {position} of {total}
      </span>
      {nextHref ? (
        <Link href={nextHref} aria-label="Next item" className={btn}><ChevronRight size={18} /></Link>
      ) : (
        <span aria-hidden className={disabled}><ChevronRight size={18} /></span>
      )}
    </div>
  );
}
