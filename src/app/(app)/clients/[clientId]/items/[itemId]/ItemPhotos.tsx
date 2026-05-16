'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { processPhoto } from '@/lib/photos/process';
import { uploadItemPhoto } from '@/lib/photos/upload';

type PhotoInput = { id: string; storagePath: string; signedUrl: string | null };

export function ItemPhotos({
  clientId, itemId, photos, coverPhotoId,
}: {
  clientId: string;
  itemId: string;
  photos: PhotoInput[];
  coverPhotoId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cover = photos.find((p) => p.id === coverPhotoId) ?? photos[0];
  const others = photos.filter((p) => p.id !== cover?.id);

  async function handleAdd(filelist: FileList | null) {
    if (!filelist || filelist.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(filelist)) {
        const { blob, filename } = await processPhoto(file);
        await uploadItemPhoto({ clientId, itemId, blob, filename });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function promoteToCover(photoId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('items').update({ cover_photo_id: photoId }).eq('id', itemId);
    if (error) setError(error.message);
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {cover?.signedUrl ? (
        <div className="relative w-full aspect-square bg-paper">
          <Image src={cover.signedUrl} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 720px" priority />
        </div>
      ) : (
        <div className="w-full aspect-square bg-paper flex items-center justify-center text-ink3 text-[13px]">
          {photos.length === 0 ? 'No photos yet' : 'Loading…'}
        </div>
      )}

      {others.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {others.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => promoteToCover(p.id)}
              disabled={busy}
              className="relative shrink-0 w-20 h-20 group disabled:opacity-50"
              title="Promote to cover"
            >
              {p.signedUrl && <Image src={p.signedUrl} alt="" fill className="object-cover" sizes="80px" />}
              <span className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/40 transition-colors">
                <Star size={16} className="text-paper opacity-0 group-hover:opacity-100" />
              </span>
            </button>
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
    </div>
  );
}
