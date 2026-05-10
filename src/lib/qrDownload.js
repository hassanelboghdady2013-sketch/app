/**
 * Convert a rendered <svg> QR-code element into a PNG file and trigger
 * a download in the browser. Used by both the dashboard's QR widget
 * and the public profile QR modal.
 *
 * Why PNG (and not SVG):
 *   - Most apps a card-owner will paste their QR into (Instagram, Canva,
 *     Word, PowerPoint, Google Slides) handle PNG cleanly. SVG support
 *     in those tools is patchy at best.
 *   - At 1024px the PNG is sharp enough for any business-card or
 *     poster print job — no scaling artefacts at typical use sizes.
 *   - File size at 1024px is ~30 KB — fine for both print and chat.
 *
 * The function reads the live SVG node from the DOM (caller passes its
 * `id`), inflates it to an off-screen canvas at `outputSize` pixels,
 * then triggers a download as `<filename>.png`.
 */
export async function downloadQrAsPng({ svgId, filename, outputSize = 1024 }) {
  const svg = document.getElementById(svgId);
  if (!svg) throw new Error("QR not rendered");

  // Serialize the SVG and wrap it in a data URL the Image element can
  // load synchronously. We can't use a Blob URL here because some
  // browsers (Safari) refuse to draw cross-origin-tainted blob: SVG
  // images onto a canvas, even when the SVG content is local.
  const serializer = new XMLSerializer();
  const xml = serializer.serializeToString(svg);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const dataUrl = `data:image/svg+xml;base64,${svg64}`;

  // Load the SVG into an Image so we can paint it onto a canvas. The
  // canvas API will rasterise the vector at whatever size we give it,
  // so we get a crisp output at any resolution.
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read QR image"));
    i.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  // White background — printing on white paper is the common case, and
  // browsers won't paint a transparent QR with the contrast scanners
  // need.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(img, 0, 0, outputSize, outputSize);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Couldn't encode PNG");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
