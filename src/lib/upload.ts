import { supabase } from './supabase';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return 'Format non supporté. Utilisez JPG, PNG, WEBP ou AVIF.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image trop volumineuse (max 5MB).';
  }
  return null;
}

export type ResizeOptions = {
  minWidth?: number; // reject if below
  minHeight?: number; // reject if below
  maxWidth?: number; // downscale if above (preserve aspect)
  maxHeight?: number; // downscale if above
  quality?: number; // 0..1
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
};

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Impossible de lire l\'image'));
      im.src = url;
    });
    return img;
  } finally {
    // will be revoked after image loads; keeping to not break object lifetime
  }
}

export async function resizeImageToFile(
  file: File,
  opts: ResizeOptions = {}
): Promise<File> {
  const img = await loadImageFromFile(file);
  const { naturalWidth: width, naturalHeight: height } = img;
  const minW = opts.minWidth ?? 1200;
  const minH = opts.minHeight ?? 600;
  if (width < minW || height < minH) {
    throw new Error(`Dimensions minimales: ${minW}×${minH}px`);
  }
  let targetW = width;
  let targetH = height;
  const maxW = opts.maxWidth ?? 1600;
  const maxH = opts.maxHeight ?? 900;
  const ratio = Math.min(maxW / width, maxH / height, 1); // never upscale
  targetW = Math.round(width * ratio);
  targetH = Math.round(height * ratio);

  // If no resize needed and format OK, return original file
  const outType = opts.mimeType ?? 'image/jpeg';
  if (ratio === 1 && (file.type === outType)) {
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const quality = opts.quality ?? 0.85;
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), outType, quality));
  const nameBase = file.name.replace(/\.[^.]+$/, '');
  const outName = `${nameBase}.jpg`;
  const resized = new File([blob], outName, { type: outType, lastModified: Date.now() });
  return resized;
}

export async function uploadPublicImage(
  bucket: string,
  file: File,
  prefix = ''
): Promise<{ publicUrl: string; path: string } | null> {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const path = `${prefix ? prefix.replace(/\/$/, '') + '/' : ''}${id}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || `image/${ext}`,
    upsert: true,
  });
  if (error) return null;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { publicUrl: pub.publicUrl, path: data.path };
}

export async function processAndUploadPublicImage(
  bucket: string,
  file: File,
  prefix = '',
  resize?: ResizeOptions
): Promise<{ publicUrl: string; path: string } | null> {
  const processed = await resizeImageToFile(file, resize);
  return uploadPublicImage(bucket, processed, prefix);
}

export function parsePublicStorageUrl(publicUrl: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(publicUrl);
    const idx = u.pathname.indexOf('/object/public/');
    if (idx === -1) return null;
    const rest = u.pathname.substring(idx + '/object/public/'.length);
    const [bucket, ...parts] = rest.split('/');
    if (!bucket || parts.length === 0) return null;
    const path = parts.join('/');
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function deletePublicImage(publicUrl: string): Promise<boolean> {
  const parsed = parsePublicStorageUrl(publicUrl);
  if (!parsed) return false;
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  return !error;
}
