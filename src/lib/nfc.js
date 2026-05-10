/**
 * Web NFC support is currently Chrome-on-Android-only (over HTTPS,
 * with `navigator.ndef`-like APIs exposed via `NDEFReader`). Desktop
 * Chrome/Firefox/Safari and iOS Safari all return false here.
 */
export function isWebNfcSupported() {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/**
 * Best-effort UA sniff so we can show a helpful message on iOS / desktop
 * pointing the user to a working device, instead of just "not supported".
 */
export function detectPlatformHint() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isAndroid) return "android";
  if (isIOS) return "ios";
  return "desktop";
}

/**
 * Write a single URL record to a tag tapped against the device. The
 * promise resolves once the write completes, or rejects with a friendly
 * Error message.
 *
 * Important Web NFC quirks the caller should know about:
 *   - The browser shows its own "tap your card" prompt; we don't.
 *   - The user can cancel it, which surfaces as `AbortError` /
 *     `NotAllowedError`.
 *   - If the card is read-only, the write throws `NotSupportedError`
 *     or similar — we surface a friendly message either way.
 *   - `NDEFReader.write` defaults a bare string to a *text* record
 *     (NDEF type "T"), which Android's tag handler does NOT
 *     auto-launch as a URL — the user would have to long-press the
 *     notification. So we explicitly construct a URL record
 *     (NDEF type "U") via `{ records: [{ recordType: "url", data }] }`,
 *     which Android opens in the default browser on tap. We pass
 *     `{ overwrite: true }` so previously-written tags get
 *     reprogrammed without a separate "erase first" step.
 *
 * `signal` (optional) is an AbortSignal — pass one if you want the
 * caller's cancel button to bail out the write.
 */
export async function writeUrlToTag(url, { signal } = {}) {
  if (!isWebNfcSupported()) {
    throw new Error("Web NFC isn't supported on this device.");
  }
  if (!url || typeof url !== "string") {
    throw new Error("Need a URL to write.");
  }
  // eslint-disable-next-line no-undef
  const ndef = new NDEFReader();
  try {
    await ndef.write(
      { records: [{ recordType: "url", data: url }] },
      { overwrite: true, signal }
    );
  } catch (err) {
    throw friendlyNfcError(err);
  }
}

/**
 * Map the cryptic Web NFC errors to user-readable strings.
 */
export function friendlyNfcError(err) {
  if (!err) return new Error("Couldn't write the card.");
  const name = err.name || "";
  const message = err.message || "";
  if (name === "AbortError") {
    return new Error("Cancelled.");
  }
  if (name === "NotAllowedError") {
    return new Error(
      "NFC permission denied. Tap 'Allow' when your browser asks, then try again."
    );
  }
  if (name === "NotSupportedError") {
    return new Error("This card seems read-only or isn't NDEF-compatible.");
  }
  if (name === "NetworkError") {
    return new Error("Couldn't talk to the card. Hold it steady on the back of your phone.");
  }
  if (name === "NoModificationAllowedError") {
    return new Error("This card is locked and can't be reprogrammed.");
  }
  return new Error(message || "Couldn't write the card. Try again.");
}
