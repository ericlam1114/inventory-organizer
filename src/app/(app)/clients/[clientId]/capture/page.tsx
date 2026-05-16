'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { processPhoto } from '@/lib/photos/process';
import { uploadItemPhoto } from '@/lib/photos/upload';

type StagedPhoto = {
  id: string;
  previewUrl: string;
  blob: Blob;
  filename: string;
  error?: string;
};

export default function CapturePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLocationId = searchParams.get('locationId') ?? '';

  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [locationId, setLocationId] = useState(initialLocationId);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the location list once on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name');
      setLocations(data ?? []);
      if (!initialLocationId && data && data.length > 0) {
        setLocationId(data[0].id);
      }
    })();
  }, [clientId]);

  async function handleFiles(filelist: FileList | null) {
    if (!filelist || filelist.length === 0) return;
    setProcessing(true);
    setError(null);
    const newStaged: StagedPhoto[] = [];
    for (const file of Array.from(filelist)) {
      try {
        const { blob, filename } = await processPhoto(file);
        newStaged.push({
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(blob),
          blob,
          filename,
        });
      } catch (e) {
        newStaged.push({
          id: crypto.randomUUID(),
          previewUrl: '',
          blob: file,
          filename: file.name,
          error: e instanceof Error ? e.message : 'failed to process',
        });
      }
    }
    setStaged((s) => [...s, ...newStaged]);
    setProcessing(false);
  }

  function removeStaged(id: string) {
    setStaged((s) => {
      const removed = s.find((p) => p.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return s.filter((p) => p.id !== id);
    });
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) return setError('Title is required');
    if (!locationId) return setError('Pick a location');
    if (staged.length === 0) return setError('Add at least one photo');
    const usableStaged = staged.filter((p) => !p.error);
    if (usableStaged.length === 0) return setError('All staged photos failed to process');

    setSaving(true);
    try {
      const supabase = createClient();
      // Create the item via SECURITY DEFINER RPC (bypasses RLS WITH CHECK,
      // authorization enforced inside the function via can_access_location)
      const { data: item, error: itemErr } = await supabase
        .rpc('create_item', { p_location_id: locationId, p_title: title.trim() })
        .single<{ id: string }>();
      if (itemErr || !item) throw itemErr ?? new Error('Insert failed');

      // Upload photos sequentially so cover-photo logic in upload.ts sees the right first-photo case
      for (const p of usableStaged) {
        await uploadItemPhoto({
          clientId,
          itemId: item.id,
          blob: p.blob,
          filename: p.filename,
        });
      }

      // Clean up object URLs
      staged.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));

      router.push(`/clients/${clientId}/items/${item.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-[24px] font-medium leading-[32px]">Capture</h1>

      {/* Staged photos strip */}
      {staged.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {staged.map((p) => (
            <div key={p.id} className="relative aspect-square">
              {p.error ? (
                <div className="bg-rule rounded-[2px] w-full h-full flex items-center justify-center p-2 text-[11px] text-danger text-center">
                  {p.error}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.previewUrl} alt="" className="w-full h-full object-cover rounded-[2px]" />
              )}
              <button
                type="button"
                onClick={() => removeStaged(p.id)}
                className="absolute top-1 right-1 bg-ink/80 text-paper rounded-full w-6 h-6 flex items-center justify-center"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <span className="sr-only">Add photos</span>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          capture="environment"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="photo-input"
          disabled={processing || saving}
        />
        <label
          htmlFor="photo-input"
          className="flex items-center justify-center gap-2 bg-surface border border-rule rounded-[2px] py-3 cursor-pointer hover:bg-paper"
        >
          {staged.length === 0 ? <Camera size={18} /> : <Plus size={18} />}
          <span className="text-[14px]">{staged.length === 0 ? 'Take or choose photos' : 'Add another photo'}</span>
        </label>
        {processing && <p className="text-ink3 text-[12px] mt-2 text-center">Processing…</p>}
      </label>

      <div>
        <label htmlFor="title" className="block text-[13px] font-medium mb-2">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Vanity Fair 2024 dress"
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-[13px] font-medium mb-2">Location *</label>
        <select
          id="location"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          required
          className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
        >
          <option value="" disabled>Pick a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {locations.length === 0 && (
          <p className="text-warning text-[12px] mt-1">No locations yet. Create one first from the Browse tab.</p>
        )}
      </div>

      {error && <p className="text-danger text-[13px]">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || processing || staged.length === 0}
        className="w-full bg-ink text-paper py-3 rounded-[2px] hover:bg-ink2 disabled:opacity-60"
      >
        {saving ? 'Saving…' : `Save item${staged.length > 1 ? ` (${staged.length} photos)` : ''}`}
      </button>
    </div>
  );
}
