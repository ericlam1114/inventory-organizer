'use client';

// Lazy-loaded — heic2any is ~600KB and only needed for iPhone HEIC files.
async function convertHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  return Array.isArray(result) ? result[0] : result;
}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
}

/**
 * Resize a JPEG/PNG to at most `maxDim` on the longest side and re-encode as JPEG.
 * Returns a Blob ready for upload.
 */
async function resize(blob: Blob, maxDim = 2048, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const { width: w, height: h } = bitmap;
  const longest = Math.max(w, h);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

/**
 * Full pipeline: convert HEIC if needed → resize → return JPEG Blob + suggested filename.
 * Throws on any step failure; caller surfaces to UI.
 */
export async function processPhoto(file: File): Promise<{ blob: Blob; filename: string }> {
  let working: Blob = file;
  let originalName = file.name;

  if (isHeic(file)) {
    working = await convertHeic(file);
    originalName = originalName.replace(/\.(heic|heif)$/i, '.jpg');
  }

  const resized = await resize(working);

  // Enforce 25MB ceiling (Supabase free-tier is 50MB; leave headroom)
  if (resized.size > 25 * 1024 * 1024) {
    throw new Error(`Image is ${(resized.size / 1024 / 1024).toFixed(1)}MB after compression; max is 25MB.`);
  }

  return { blob: resized, filename: originalName };
}
