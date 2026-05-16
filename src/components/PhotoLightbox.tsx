'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type LightboxPhoto = { id: string; signedUrl: string | null };

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNav,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => { if (hasPrev) onNav(index - 1); }, [hasPrev, index, onNav]);
  const goNext = useCallback(() => { if (hasNext) onNav(index + 1); }, [hasNext, index, onNav]);

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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/90 backdrop-blur"
      onClick={onClose}
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
          aria-label="Previous photo"
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
          aria-label="Next photo"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 text-paper hover:text-sand2 z-10"
        >
          <ChevronRight size={36} />
        </button>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-paper text-[13px]">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}
