import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { cropAndEncode } from "../../lib/imageEncode";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB original-file cap.
const ACCEPT = "image/jpeg,image/png,image/webp";
// Square output size in pixels. Link icons render at ~40px on the
// public profile / dashboard list; 64 is sharp on retina at that size.
const OUTPUT_SIZE = 64;
// PNG output (not JPEG) so logos with transparent backgrounds keep
// their transparency — important when the icon sits inside a colored
// rounded square on the public profile.
const OUTPUT_FORMAT = "png";
// Hard ceiling on the encoded data URL length per link. 24 KB times
// the realistic max ~30 links = ~720 KB even in the worst case, well
// below Firestore's per-doc cap and below any realistic page-load
// concern.
const MAX_DATA_URL_BYTES = 24 * 1024;

/**
 * A small picker for the per-link custom icon. Renders as:
 *   - a 12x12 preview square (whatever icon is currently set, or the
 *     placeholder fallback `<Fallback />` for the platform's default),
 *   - an "Upload custom icon" / "Change icon" button,
 *   - a "Reset to default" button when a custom icon is already set.
 *
 * Calls `onChange(dataUrl)` when a new icon is picked, or `onChange("")`
 * when the user resets. The parent is responsible for persistence.
 */
export default function LinkIconUploader({
  value,
  fallback,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  // Local optimistic preview shown the instant the user picks a file,
  // before the parent has a chance to round-trip it through state /
  // Firestore. Once `value` updates we can drop this.
  const [preview, setPreview] = useState("");

  const pick = useCallback(() => {
    if (disabled || busy) return;
    inputRef.current?.click();
  }, [disabled, busy]);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
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
        const dataUrl = await cropAndEncode(file, {
          size: OUTPUT_SIZE,
          format: OUTPUT_FORMAT,
          maxBytes: MAX_DATA_URL_BYTES,
        });
        setPreview(dataUrl);
        await Promise.resolve(onChange(dataUrl));
        setPreview("");
      } catch (err) {
        toast.error(err.message || "Couldn't process icon");
        setPreview("");
      } finally {
        setBusy(false);
      }
    },
    [onChange]
  );

  const handleReset = useCallback(async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await Promise.resolve(onChange(""));
      setPreview("");
    } catch (err) {
      toast.error(err.message || "Couldn't reset icon");
    } finally {
      setBusy(false);
    }
  }, [onChange, disabled, busy]);

  const shown = preview || value;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pick}
        disabled={disabled || busy}
        className="relative w-12 h-12 rounded-xl bg-brand-soft text-brand grid place-items-center overflow-hidden ring-1 ring-line hover:ring-line-strong focus:outline-none focus:ring-brand transition-shadow disabled:opacity-60"
        aria-label={shown ? "Change link icon" : "Upload link icon"}
      >
        {shown ? (
          <img src={shown} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-black/50 text-white">
            <Loader2 size={16} className="animate-spin" />
          </span>
        )}
      </button>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={pick}
          disabled={disabled || busy}
          className="inline-flex items-center gap-1.5 font-medium text-fg hover:text-brand disabled:opacity-60 transition-colors"
        >
          <Upload size={14} />
          {shown ? "Change icon" : "Upload custom icon"}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 text-muted hover:text-fg disabled:opacity-60 transition-colors"
          >
            <RotateCcw size={14} />
            Reset to default
          </button>
        )}
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
