import { useCallback, useRef, useState } from "react";
import { Camera, Trash2, Loader2, Upload, ImageIcon } from "lucide-react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import toast from "react-hot-toast";
import { storage } from "../../firebase";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — well under the storage rule's 5MB cap.
const ACCEPT = "image/jpeg,image/png,image/webp";
// Square output size in pixels. 512 is sharp on retina avatars without
// blowing up storage.
const OUTPUT_SIZE = 512;

/**
 * Read a file into a HTMLImageElement so we can resize/crop on a canvas.
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
 * Center-crop the image to a square and downscale to OUTPUT_SIZE so we
 * don't push huge originals into Storage. Returns a JPEG Blob.
 */
async function cropAndDownscale(file) {
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
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encode failed"))),
      "image/jpeg",
      0.9
    );
  });
}

/**
 * Friendly avatar picker — click the circle, pick a file, see a preview,
 * upload to Firebase Storage at /avatars/{uid}/avatar.jpg, and call
 * `onChange(url)` with the public download URL. Falls through gracefully
 * on cancel/error.
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
  // Local optimistic preview (data: URL) shown the instant the user picks
  // a file, before the upload finishes.
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
      // Hoisted out of the try so we can revoke it from `catch` /
      // `finally` even when the storage call below throws.
      let localUrl = null;
      try {
        const blob = await cropAndDownscale(file);
        // Show optimistic preview immediately.
        localUrl = URL.createObjectURL(blob);
        setPreview(localUrl);
        // Stable filename so a new upload overwrites the previous file
        // (no orphaned avatars accumulating in Storage).
        const path = `avatars/${uid}/avatar.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob, {
          contentType: "image/jpeg",
          // Force a fresh fetch each upload — otherwise CDNs/browsers
          // would serve the previous photo from cache.
          cacheControl: "public, max-age=60",
        });
        const url = await getDownloadURL(storageRef);
        // The parent persists this URL to Firestore. We await so any
        // persistence error surfaces as the toast below instead of
        // leaving Storage and Firestore out of sync.
        await Promise.resolve(onChange(url));
        setPreview("");
        toast.success("Photo updated");
      } catch (err) {
        toast.error(err.message || "Upload failed");
        setPreview("");
      } finally {
        if (localUrl) URL.revokeObjectURL(localUrl);
        setBusy(false);
      }
    },
    [uid, onChange]
  );

  const handleRemove = useCallback(async () => {
    if (!uid || disabled || busy) return;
    setBusy(true);
    try {
      // Clear Firestore *first* so it never points to a deleted Storage
      // object — if the storage delete below fails for any reason, we
      // just leave an orphan we can sweep later (vs. a broken <img>).
      await Promise.resolve(onChange(""));
      // Best-effort: the object may not exist if the previous avatar
      // lived somewhere else (e.g. a Google profile photo URL). Ignore
      // "not found" errors silently.
      try {
        await deleteObject(ref(storage, `avatars/${uid}/avatar.jpg`));
      } catch (err) {
        if (err?.code !== "storage/object-not-found") throw err;
      }
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
