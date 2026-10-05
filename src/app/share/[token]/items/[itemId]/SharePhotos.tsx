'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PhotoLightbox } from '@/components/PhotoLightbox';

type Photo = { id: string; signedUrl: string | null };

/** Cover + thumbnail strip; tapping any photo opens the swipeable lightbox. */
export function SharePhotos({ itemTitle, photos }: { itemTitle: string; photos: Photo[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const [cover, ...others] = photos;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setLightboxIndex(0)}
        className="relative w-full aspect-square bg-paper block cursor-zoom-in"
        aria-label="View photo"
      >
        {cover.signedUrl && (
          <Image src={cover.signedUrl} alt={itemTitle} fill className="object-contain" sizes="(max-width: 768px) 100vw, 720px" priority />
        )}
      </button>

      {others.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {others.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightboxIndex(idx + 1)}
              className="relative shrink-0 w-20 h-20 cursor-zoom-in"
              aria-label={`View photo ${idx + 2} of ${photos.length}`}
            >
              {p.signedUrl && <Image src={p.signedUrl} alt={`${itemTitle} (additional photo)`} fill className="object-cover" sizes="80px" />}
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={setLightboxIndex}
        />
      )}
    </div>
  );
}
