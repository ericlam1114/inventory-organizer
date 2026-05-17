'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { processPhoto } from '@/lib/photos/process';
import { uploadItemPhoto } from '@/lib/photos/upload';
import { toast } from '@/lib/toast';
import { reportError } from '@/lib/friendly-errors';
import { PhotoLightbox } from '@/components/PhotoLightbox';

type PhotoInput = { id: string; storagePath: string; signedUrl: string | null };

export function ItemPhotos({
  clientId, itemId, itemTitle, photos, coverPhotoId,
}: {
  clientId: string;
  itemId: string;
  itemTitle: string;
  photos: PhotoInput[];
  coverPhotoId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const cover = photos.find((p) => p.id === coverPhotoId) ?? photos[0];
  const others = photos.filter((p) => p.id !== cover?.id);

  // For lightbox: all photos in display order (cover first, then others)
  const orderedPhotos = cover ? [cover, ...others] : others;

  async function handleAdd(filelist: FileList | null) {
    if (!filelist || filelist.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(filelist)) {
        const { blob, filename } = await processPhoto(file);
        await uploadItemPhoto({ clientId, itemId, blob, filename });
      }
      toast.success('Photo added');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function promoteToCover(photoId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('items').update({ cover_photo_id: photoId }).eq('id', itemId);
    if (error) {
      setError(error.message);
      toast.error(reportError(error));
    } else {
      toast.success('Cover updated');
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {cover?.signedUrl ? (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative w-full aspect-square bg-paper block cursor-zoom-in"
        >
          <Image src={cover.signedUrl} alt={itemTitle} fill className="object-contain" sizes="(max-width: 768px) 100vw, 720px" priority />
        </button>
      ) : (
        <div className="w-full aspect-square bg-paper flex items-center justify-center text-ink3 text-[13px]">
          {photos.length === 0 ? 'No photos yet' : 'Loading…'}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {others.map((p, idx) => (
            <div key={p.id} className="relative shrink-0 w-20 h-20 group">
              {/* Click to open lightbox at this photo (idx+1 because cover is 0) */}
              <button
                type="button"
                onClick={() => setLightboxIndex(idx + 1)}
                className="absolute inset-0 cursor-zoom-in"
                aria-label="View photo"
              />
              {p.signedUrl && <Image src={p.signedUrl} alt={`${itemTitle} (additional photo)`} fill className="object-cover pointer-events-none" sizes="80px" />}
              {/* Star button for promote-to-cover */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); promoteToCover(p.id); }}
                disabled={busy}
                title="Promote to cover"
                className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/40 transition-colors disabled:opacity-50"
              >
                <Star size={16} className="text-paper opacity-0 group-hover:opacity-100" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <input
          type="file" accept="image/*,.heic,.heif" multiple capture="environment"
          onChange={(e) => handleAdd(e.target.files)} className="hidden" id="add-photo-input"
          disabled={busy}
        />
        <label
          htmlFor="add-photo-input"
          className="inline-flex items-center gap-2 bg-surface border border-rule rounded-[2px] px-4 py-2 cursor-pointer hover:bg-paper text-[13px] font-medium"
        >
          <Plus size={14} /> Add photo
        </label>
      </label>
      {busy && <p className="text-ink3 text-[12px]">Working…</p>}
      {error && <p className="text-danger text-[12px]">{error}</p>}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={orderedPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={setLightboxIndex}
        />
      )}
    </div>
  );
}
