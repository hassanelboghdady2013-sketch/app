/**
 * Convert any rendered <svg> in the DOM to a PNG and either download
 * or share it. Used by the QR popovers and the business-card view.
 *
 * Why PNG (not SVG):
 *   - Most apps a user pastes their card / QR into (Instagram, Canva,
 *     Word, PowerPoint, Google Slides, WhatsApp) handle PNG cleanly.
 *     SVG support in those tools is patchy at best.
 *   - The exported PNG is rasterised at the resolution we choose, so
 *     it's sharp on retina displays and acceptable for print at 1024+
 *     pixels.
 *
 * The helper reads the live SVG node from the DOM (caller passes its
 * `id`), inflates it to an off-screen canvas at the given size, then
 * either triggers a download or hands the resulting Blob back so the
 * caller can do something else with it (e.g. Web Share API).
 */

/**
 * SVG loaded into an <img> via a data: URL runs in a sandboxed mode
 * that refuses to fetch external resources (https://, blob:, etc.).
 * Any <image> tag inside the SVG that points at a remote URL would
 * silently fail to render in the exported PNG.
 *
 * Walk the SVG clone, fetch any non-data hrefs as blobs, convert to
 * data: URLs, and patch the href in place. After this, the whole SVG
 * is self-contained and exports cleanly.
 *
 * data: URLs (the default for avatars + link icons since #12 / #14)
 * pass through untouched - this is purely defensive for legacy users
 * still on Firebase Storage URLs.
 */
async function inlineSvgImages(svgClone) {
  const images = svgClone.querySelectorAll("image");
  await Promise.all(
    Array.from(images).map(async (img) => {
      const href =
        img.getAttribute("href") || img.getAttribute("xlink:href") || "";
      if (!href || href.startsWith("data:")) return;
      try {
        const res = await fetch(href, { mode: "cors" });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        img.setAttribute("href", dataUrl);
        // Remove the legacy attribute too so old SVG renderers don't
        // pick the unfetchable URL.
        img.removeAttribute("xlink:href");
      } catch {
        // CORS-blocked or otherwise unreachable. Leave the href alone;
        // the avatar slot will be empty in the export, but everything
        // else still renders.
      }
    })
  );
}

async function svgIdToPngBlob({ svgId, width, height, background }) {
  const svg = document.getElementById(svgId);
  if (!svg) throw new Error("SVG not rendered");

  // Clone so we can mutate freely without disturbing the live preview.
  const clone = svg.cloneNode(true);
  // Stamp explicit pixel dimensions on the clone. The live SVG uses
  // width="100%" so its layout adapts to the page, but loaded into an
  // <img> via a data: URL it has no layout context — Safari + a few
  // others will fall back to the CSS replaced-element default (300x150)
  // and render a tiny bitmap that drawImage then scales up blurrily.
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  await inlineSvgImages(clone);

  // Serialize the SVG and wrap it in a base64 data URL the Image
  // element can load synchronously. We can't use a Blob URL here
  // because some browsers (Safari) refuse to draw cross-origin-tainted
  // blob: SVG images onto a canvas, even when the SVG content is local.
  const serializer = new XMLSerializer();
  const xml = serializer.serializeToString(clone);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const dataUrl = `data:image/svg+xml;base64,${svg64}`;

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read SVG image"));
    i.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  // Optional opaque background (e.g. white for QR codes so scanners
  // get the contrast they need). Without it the PNG carries through
  // any transparency the SVG has.
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Couldn't encode PNG");
  return blob;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Square QR-code download. White background is forced on so scanners
 * still get their contrast on dark themes.
 */
export async function downloadQrAsPng({ svgId, filename, outputSize = 1024 }) {
  const blob = await svgIdToPngBlob({
    svgId,
    width: outputSize,
    height: outputSize,
    background: "#ffffff",
  });
  triggerDownload(blob, filename);
}

/**
 * Generic SVG → PNG download for non-square art (e.g. the business
 * card at 1050×600). Background is opt-in; if the caller passes
 * `background: null` (or omits) the PNG keeps any transparency.
 */
export async function downloadSvgAsPng({
  svgId,
  filename,
  width,
  height,
  background = null,
}) {
  const blob = await svgIdToPngBlob({ svgId, width, height, background });
  triggerDownload(blob, filename);
}

/**
 * Try to share the SVG as a PNG file via the Web Share API. Falls
 * back to a plain download when the API isn't available or rejects
 * the file payload (most desktop browsers, plus Safari before iOS 16).
 */
export async function shareSvgAsPng({
  svgId,
  filename,
  width,
  height,
  background = null,
  title = "",
  text = "",
}) {
  const blob = await svgIdToPngBlob({ svgId, width, height, background });
  const file = new File([blob], `${filename}.png`, { type: "image/png" });

  // Check `canShare` to confirm this browser actually accepts file
  // payloads — some Android browsers expose `navigator.share` but
  // refuse files. Without canShare the API throws a hard-to-handle
  // error mid-flow.
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title, text });
      return { method: "share" };
    } catch (err) {
      // User dismissed the share sheet — that's not an error to
      // surface. Anything else, fall through to download.
      if (err && err.name === "AbortError") return { method: "cancelled" };
    }
  }

  triggerDownload(blob, filename);
  return { method: "download" };
}
