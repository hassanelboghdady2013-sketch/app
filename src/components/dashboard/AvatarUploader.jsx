import { useCallback, useRef, useState } from "react";
import { Camera, Trash2, Loader2, Upload, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB original-file cap.
const ACCEPT = "image/jpeg,image/png,image/webp";
// Square output size in pixels. 256 keeps the base64 well under
// Firestore's 1MB document cap (typical encode is ~25–35 KB).
const OUTPUT_SIZE = 256;
// JPEG quality. 0.82 is a sweet spot where the file is small but
// faces still look sharp at 256x256.
const JPEG_QUALITY = 0.82;
// Hard ceiling on the encoded data URL length. A 64KB string still
// fits comfortably even with the rest of the profile doc, so this is
// a safety net rather than the primary constraint.
const MAX_DATA_URL_BYTES = 64 * 1024;

/**
 * Read a file into an HTMLImageElement so we can resize/crop on a
 * canvas. We only ever read the file as a data URL on disk locally —
 * the Image's src is then revoked-by-replace when the function returns.
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
 * Center-crop the image to a square, downscale to OUTPUT_SIZE, and
 * encode as a JPEG data URL. Returns the data URL string, ready to be
 * persisted directly into Firestore.
 *
 * We use a data URL (not a Blob → Storage URL) because the user has
 * disabled Firebase Storage on this project — the avatar lives inline
 * inside `profiles/{uid}.avatarUrl`. The downscale + quality combo
 * targets ~25–35 KB encoded, well under Firestore's 1 MB doc cap.
 */
async function cropAndEncode(file) {
  const img = await readImage(file);
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    // Extremely high-frequency / noisy image that JPEG can't compress
    // small enough. Should be rare at 256x256 + q0.82, but if it
    // happens we want a clear error rather than a Firestore write
    // failure.
    throw new Error(
      "Image is too detailed to compress small enough — try a simpler photo."
    );
  }
  return dataUrl;
}

/**
 * Friendly avatar picker — click the circle, pick a file, see a
 * preview, encode locally, and call `onChange(dataUrl)` so the parent
 * can persist it directly to Firestore. No Firebase Storage is used.
 */
export default function AvatarUploader({
  uid,
  value,
  fallbackLetter = "?",
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  // Local preview shown while the parent's Firestore write is in
  // flight. Once `value` updates we show that instead.
  const [preview, setPreview] = useState("");

  const pick = useCallback(() => {
    if (disabled || busy) return;
    inputRef.current?.click();
  }, [disabled, busy]);

  const handleFile = useCallback(
    async (file) => {
      if (!file || !uid) return;
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error("Use a JPG, PNG, or WebP image");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Image is over 4MB — pick a smaller one");
        return;
      }
      setBusy(true);
      try {
        const dataUrl = await cropAndEncode(file);
        // Show the encoded image instantly. Same image goes to the
        // parent for persistence; once the parent's `value` updates we
        // can clear the local preview without a flicker.
        setPreview(dataUrl);
        // Awaiting lets us surface the parent's persistence error as
        // the toast below — without await, a Firestore write failure
        // would silently produce a stale preview + a stale "saved"
        // state.
        await Promise.resolve(onChange(dataUrl));
        setPreview("");
        toast.success("Photo updated");
      } catch (err) {
        toast.error(err.message || "Upload failed");
        setPreview("");
      } finally {
        setBusy(false);
      }
    },
    [uid, onChange]
  );

  const handleRemove = useCallback(async () => {
    if (!uid || disabled || busy) return;
    setBusy(true);
    try {
      // Clearing the data URL = clearing the avatar. There's nothing
      // out-of-band to delete (no Storage object), so this is just a
      // single Firestore field update.
      await Promise.resolve(onChange(""));
      setPreview("");
      toast.success("Photo removed");
    } catch (err) {
      toast.error(err.message || "Couldn't remove photo");
    } finally {
      setBusy(false);
    }
  }, [uid, onChange, disabled, busy]);

  const shown = preview || value;

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={pick}
        disabled={disabled || busy}
        className="group relative w-24 h-24 rounded-full ring-2 ring-line-strong overflow-hidden bg-brand-soft text-brand grid place-items-center text-3xl font-bold focus:outline-none focus:ring-brand transition-shadow disabled:opacity-60"
        aria-label={shown ? "Change profile photo" : "Upload profile photo"}
      >
        {shown ? (
          <img src={shown} alt="" className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden="true">{fallbackLetter}</span>
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-black/50 text-white transition-opacity ${
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
          }`}
          aria-hidden="true"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </span>
      </button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:text-brand disabled:opacity-60 transition-colors"
          >
            <Upload size={14} />
            {shown ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger disabled:opacity-60 transition-colors"
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-faint inline-flex items-center gap-1">
          <ImageIcon size={12} />
          JPG, PNG, or WebP. Max 4MB. We'll auto-crop to a square.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // Reset so picking the same file twice still triggers change.
          e.target.value = "";
        }}
      />
    </div>
  );
}
