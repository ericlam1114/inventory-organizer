'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Plus, Star, Trash2 } from 'lucide-react';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      // The new cover moves to the front, so keep the lightbox on it
      setLightboxIndex((i) => (i === null ? null : 0));
      router.refresh();
    }
    setBusy(false);
  }

  async function deletePhoto(photo: PhotoInput) {
    setBusy(true);
    const supabase = createClient();
    const remaining = orderedPhotos.filter((p) => p.id !== photo.id);
    try {
      // Hand the cover to the next photo first so grid tiles don't go blank
      if (photo.id === cover?.id) {
        const { error } = await supabase.from('items')
          .update({ cover_photo_id: remaining[0]?.id ?? null })
          .eq('id', itemId);
        if (error) throw error;
      }
      const { error } = await supabase.from('item_photos').delete().eq('id', photo.id);
      if (error) throw error;
      // Storage cleanup is best-effort; the row is already gone
      await supabase.storage.from('inventory-photos').remove([photo.storagePath]);

      setConfirmDeleteId(null);
      setLightboxIndex(remaining.length === 0 ? null : Math.min(lightboxIndex ?? 0, remaining.length - 1));
      toast.success('Photo deleted');
      router.refresh();
    } catch (e) {
      toast.error(reportError(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  const lightboxPhoto = lightboxIndex !== null ? orderedPhotos[lightboxIndex] : null;
  const lightboxActions = lightboxPhoto && (
    <div className="flex gap-2">
      {lightboxPhoto.id !== cover?.id && (
        <button
          type="button"
          onClick={() => promoteToCover(lightboxPhoto.id)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-paper text-ink px-3 py-2 rounded-[2px] text-[13px] font-medium disabled:opacity-60"
        >
          <Star size={14} /> Make cover
        </button>
      )}
      {confirmDeleteId === lightboxPhoto.id ? (
        <button
          type="button"
          onClick={() => deletePhoto(lightboxPhoto)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-danger text-paper px-3 py-2 rounded-[2px] text-[13px] font-medium disabled:opacity-60"
        >
          <Trash2 size={14} /> {busy ? 'Deleting…' : 'Tap again to delete'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDeleteId(lightboxPhoto.id)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-paper text-danger px-3 py-2 rounded-[2px] text-[13px] font-medium disabled:opacity-60"
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );

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
        <div data-no-swipe className="flex gap-2 overflow-x-auto">
          {others.map((p, idx) => (
            // Tap opens the lightbox (idx+1 because cover is 0); cover/delete live there
            <button
              key={p.id}
              type="button"
              onClick={() => setLightboxIndex(idx + 1)}
              className="relative shrink-0 w-20 h-20 cursor-zoom-in"
              aria-label="View photo"
            >
              {p.signedUrl && <Image src={p.signedUrl} alt={`${itemTitle} (additional photo)`} fill className="object-cover" sizes="80px" />}
            </button>
          ))}
        </div>
      )}

      <div>
        <input
          type="file" accept="image/*,.heic,.heif" capture="environment"
          onChange={(e) => handleAdd(e.target.files)} className="hidden" id="add-camera-input"
          disabled={busy}
        />
        <input
          type="file" accept="image/*,.heic,.heif" multiple
          onChange={(e) => handleAdd(e.target.files)} className="hidden" id="add-library-input"
          disabled={busy}
        />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor="add-camera-input"
            className="inline-flex items-center gap-2 bg-surface border border-rule rounded-[2px] px-4 py-2 cursor-pointer hover:bg-paper text-[13px] font-medium"
          >
            <Camera size={14} /> Take photo
          </label>
          <label
            htmlFor="add-library-input"
            className="inline-flex items-center gap-2 bg-surface border border-rule rounded-[2px] px-4 py-2 cursor-pointer hover:bg-paper text-[13px] font-medium"
          >
            <Plus size={14} /> Choose photos
          </label>
        </div>
      </div>
      {busy && <p className="text-ink3 text-[12px]">Working…</p>}
      {error && <p className="text-danger text-[12px]">{error}</p>}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={orderedPhotos}
          index={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setConfirmDeleteId(null); }}
          onNav={(i) => { setLightboxIndex(i); setConfirmDeleteId(null); }}
          actions={lightboxActions}
        />
      )}
    </div>
  );
}
