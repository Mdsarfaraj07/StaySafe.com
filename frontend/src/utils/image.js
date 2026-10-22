const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Returns an error message, or null when the file is acceptable. */
export function validateImage(file) {
  if (!TYPES.includes(file.type)) return 'Only JPG, PNG or WebP images are allowed';
  if (file.size > 20 * 1024 * 1024) return 'That image is too large (max 20 MB)';
  return null;
}

/** Downscales large photos in the browser before upload (keeps uploads fast and under the 5 MB server limit). */
export async function compressImage(file, maxDim = 1600, quality = 0.85) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
