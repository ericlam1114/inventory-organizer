'use client';

import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type LightboxPhoto = { id: string; signedUrl: string | null };

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNav,
  actions,
  prevItemHref,
  nextItemHref,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
  /** Optional controls rendered under the photo (e.g. make cover / delete) */
  actions?: ReactNode;
  /** Past the first/last photo, continue to the neighbouring item (album-style browsing) */
  prevItemHref?: string | null;
  nextItemHref?: string | null;
}) {
  const router = useRouter();
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);
  const hasPrevPhoto = index > 0;
  const hasNextPhoto = index < photos.length - 1;
  const hasPrev = hasPrevPhoto || !!prevItemHref;
  const hasNext = hasNextPhoto || !!nextItemHref;

  useEffect(() => {
    if (prevItemHref) router.prefetch(prevItemHref);
    if (nextItemHref) router.prefetch(nextItemHref);
  }, [router, prevItemHref, nextItemHref]);

  const goPrev = useCallback(() => {
    if (hasPrevPhoto) onNav(index - 1);
    else if (prevItemHref) router.replace(prevItemHref, { scroll: false });
  }, [hasPrevPhoto, index, onNav, prevItemHref, router]);
  const goNext = useCallback(() => {
    if (hasNextPhoto) onNav(index + 1);
    else if (nextItemHref) router.replace(nextItemHref, { scroll: false });
  }, [hasNextPhoto, index, onNav, nextItemHref, router]);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose, goPrev, goNext]);

  if (!photo?.signedUrl) return null;

  return (
    <div
      data-lightbox
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/90 backdrop-blur"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        // Horizontal swipe navigates on touch devices
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 50) goPrev();
        else if (dx < -50) goNext();
      }}
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 text-paper hover:text-sand2 z-10"
      >
        <X size={24} />
      </button>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          type="button"
          aria-label={hasPrevPhoto ? 'Previous photo' : 'Previous item'}
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 text-paper hover:text-sand2 z-10"
        >
          <ChevronLeft size={36} />
        </button>
      )}

      {/* Photo */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.signedUrl}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
      </div>

      {/* Next arrow */}
      {hasNext && (
        <button
          type="button"
          aria-label={hasNextPhoto ? 'Next photo' : 'Next item'}
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 text-paper hover:text-sand2 z-10"
        >
          <ChevronRight size={36} />
        </button>
      )}

      {/* Counter + optional actions */}
      {(photos.length > 1 || actions) && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
          {photos.length > 1 && (
            <p className="text-paper text-[13px]">{index + 1} / {photos.length}</p>
          )}
        </div>
      )}
    </div>
  );
}
