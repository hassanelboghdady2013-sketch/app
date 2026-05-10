/**
 * Shared client-side image processing helpers.
 *
 * The app stores user-uploaded images (avatars, link icons) inline as
 * data URLs inside Firestore documents — Firebase Storage is
 * intentionally disabled. Both call sites need the same shape: read a
 * picked File, center-crop to a square, downscale to a target size,
 * and encode as a small data URL with a hard size ceiling.
 *
 * Centralizing this here avoids drift between AvatarUploader and the
 * link-icon uploader: any tweak to the encode pipeline (e.g. format,
 * quality, max-bytes) lands in one place.
 */

/**
 * Read a File into an HTMLImageElement so the caller can draw it on a
 * canvas. Resolves with a fully-loaded image; rejects on read or
 * decode error.
 */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image is not a valid format"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Center-crop a File to a square, downscale to `size` pixels, and
 * encode as either a JPEG (smaller, no transparency) or PNG (preserves
 * transparency for logos with transparent backgrounds).
 *
 * Throws a friendly Error if:
 *   - the canvas API isn't available, or
 *   - the encoded data URL exceeds `maxBytes` (rare, but a noisy image
 *     at low compression can blow past the cap; we'd rather fail
 *     loudly here than silently bloat a Firestore doc).
 *
 * Returns the data URL string, ready to be persisted directly.
 */
export async function cropAndEncode(
  file,
  { size, format = "jpeg", quality = 0.82, maxBytes }
) {
  const img = await readImage(file);
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  const mime = format === "png" ? "image/png" : "image/jpeg";
  // canvas.toDataURL ignores the quality arg for PNG — that's fine.
  const dataUrl = canvas.toDataURL(mime, quality);
  if (maxBytes && dataUrl.length > maxBytes) {
    throw new Error(
      "Image is too detailed to compress small enough — try a simpler image."
    );
  }
  return dataUrl;
}
