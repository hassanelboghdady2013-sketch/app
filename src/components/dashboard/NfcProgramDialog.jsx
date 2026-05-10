import { useEffect, useRef, useState } from "react";
import {
  Smartphone,
  Wifi,
  Loader2,
  Check,
  X,
  CircleAlert,
  Apple,
  Monitor,
} from "lucide-react";
import {
  isWebNfcSupported,
  detectPlatformHint,
  writeUrlToTag,
} from "../../lib/nfc";
import Button from "../ui/Button";

/**
 * Modal that walks the user through programming an NFC card to point
 * at their public profile URL. Three states:
 *
 *   - "unsupported": browser doesn't expose Web NFC (iOS, desktop,
 *     non-Chromium Android). Shows a tailored explanation per platform.
 *   - "idle": ready to write. Shows a big "Tap to program" button.
 *   - "writing": browser's tag prompt is up; we wait for it to resolve.
 *   - "success" / "error": terminal states with retry.
 */
export default function NfcProgramDialog({ url, onClose }) {
  const supported = isWebNfcSupported();
  const platform = detectPlatformHint();
  const [state, setState] = useState(supported ? "idle" : "unsupported");
  const [errorMessage, setErrorMessage] = useState("");
  const abortRef = useRef(null);

  // ESC closes the dialog (but not while a write is in progress —
  // that path uses the explicit Cancel button so we can abort cleanly).
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && state !== "writing") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  // If the dialog unmounts mid-write, cancel so we don't leave a zombie
  // NDEF read prompt up.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleWrite() {
    setErrorMessage("");
    setState("writing");
    abortRef.current = new AbortController();
    try {
      await writeUrlToTag(url, { signal: abortRef.current.signal });
      setState("success");
    } catch (err) {
      const msg = err?.message || "Couldn't write the card.";
      // Treat a clean cancel as "go back to idle" rather than an error
      // state — there's nothing to retry from, the user just bailed.
      if (msg === "Cancelled.") {
        setState("idle");
      } else {
        setErrorMessage(msg);
        setState("error");
      }
    } finally {
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && state !== "writing") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfc-dialog-title"
        className="w-full max-w-md rounded-2xl bg-card border border-line shadow-card overflow-hidden"
      >
        <header className="flex items-start justify-between p-5 pb-3">
          <div className="flex gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-soft text-brand shrink-0">
              <Wifi size={20} />
            </span>
            <div>
              <h2
                id="nfc-dialog-title"
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Program your NFC card
              </h2>
              <p className="text-sm text-muted mt-0.5">
                One tap and your card opens your profile on any phone.
              </p>
            </div>
          </div>
          {state !== "writing" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-muted hover:text-fg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <div className="px-5 pb-5">
          {state === "unsupported" && <Unsupported platform={platform} />}

          {state !== "unsupported" && (
            <>
              <div className="rounded-xl bg-card-hi border border-line p-3 mb-4">
                <p className="text-xs text-muted mb-1">Will write this URL</p>
                <p className="text-sm font-mono text-fg break-all">{url}</p>
              </div>

              <ol className="text-sm text-muted space-y-1.5 list-decimal pl-5 mb-5">
                <li>Tap the button below.</li>
                <li>
                  When your phone asks for permission, tap <strong>Allow</strong>.
                </li>
                <li>
                  Hold the back of your phone against the card until it
                  beeps or vibrates.
                </li>
              </ol>

              {state === "idle" && (
                <Button
                  onClick={handleWrite}
                  size="lg"
                  className="w-full"
                  leftIcon={<Smartphone size={18} />}
                >
                  Tap to program card
                </Button>
              )}

              {state === "writing" && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border border-line bg-card-hi p-4 flex items-start gap-3"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 size={18} className="animate-spin text-brand mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Waiting for your card…</p>
                      <p className="text-muted text-xs mt-0.5">
                        Hold the card against the back of your phone now.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleCancel}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {state === "success" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-success/30 bg-success/10 text-success p-4 flex items-start gap-3">
                    <Check size={18} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Card programmed.</p>
                      <p className="text-muted text-xs mt-0.5">
                        Tap your card on any phone to open your profile.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setState("idle")}
                      className="flex-1"
                    >
                      Program another
                    </Button>
                    <Button size="md" onClick={onClose} className="flex-1">
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {state === "error" && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border border-danger/30 bg-danger/10 text-danger p-4 flex items-start gap-3"
                    role="alert"
                  >
                    <CircleAlert size={18} className="mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Couldn't program the card.</p>
                      <p className="text-xs mt-0.5 opacity-90">{errorMessage}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button size="md" onClick={handleWrite} className="flex-1">
                      Try again
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Unsupported({ platform }) {
  // Tailor the explainer per platform — iOS Safari has zero Web NFC
  // support today, but iPhones DO read NFC tags natively (no app
  // needed). Desktop browsers are just out.
  const Icon = platform === "ios" ? Apple : platform === "desktop" ? Monitor : Smartphone;
  const headline =
    platform === "ios"
      ? "Programming requires an Android phone"
      : platform === "desktop"
      ? "Programming requires a phone"
      : "Your browser doesn't support NFC programming";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-card-hi p-4 flex items-start gap-3">
        <Icon size={20} className="text-brand mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">{headline}</p>
          <p className="text-muted text-xs mt-1">
            {platform === "ios" && (
              <>
                Apple doesn't let websites program NFC tags from iPhone yet.
                Open this page in <strong>Chrome on an Android phone</strong>{" "}
                — once programmed, the card works perfectly on iPhones for
                tapping (just not for programming).
              </>
            )}
            {platform === "desktop" && (
              <>
                NFC needs to physically touch the card. Open this page on{" "}
                <strong>Chrome on an Android phone</strong> to program your card.
              </>
            )}
            {platform === "android" && (
              <>
                Try opening this page in <strong>Google Chrome</strong> — Web
                NFC isn't available in this browser.
              </>
            )}
            {platform === "unknown" && (
              <>
                Open this page in <strong>Chrome on an Android phone</strong>{" "}
                to program your card.
              </>
            )}
          </p>
        </div>
      </div>
      <p className="text-xs text-faint">
        Already programmed cards work on any modern phone — this restriction
        only applies when writing a new card.
      </p>
    </div>
  );
}
