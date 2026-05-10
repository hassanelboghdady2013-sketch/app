import { QRCodeSVG } from "qrcode.react";
import { getPlatform } from "../../lib/platforms";

/**
 * A single-side digital business card rendered as an inline SVG.
 *
 * The same SVG is used for both the on-screen preview and the PNG
 * export — the export path serializes this `<svg>`, paints it onto a
 * canvas, and downloads/shares the result. Keeping it in SVG (instead
 * of HTML/CSS + a html-to-image library) means we avoid a new
 * dependency and the export is pixel-perfect at any resolution.
 *
 * Aspect ratio is the international 7:4 business-card spec
 * (3.5"×2"); 1050×600 maps cleanly to 300 DPI for print.
 */

// Fixed art-board size. The viewBox is what gets exported; CSS
// scaling on the wrapper changes the on-screen size only.
const W = 1050;
const H = 600;
const PAD = 60;

/**
 * Pull the first email + phone from the user's active links so we can
 * surface them on the card without making the user re-enter their
 * contact details. Falls back to nothing if the user hasn't added the
 * matching platform link yet.
 */
function pickContact(links) {
  const active = (links || []).filter((l) => l.active !== false);
  let email = "";
  let phone = "";
  for (const l of active) {
    const p = getPlatform(l.platform);
    if (!email && p.inputMode === "email") {
      // Strip any leading non-email characters defensively. Some
      // legacy values still carry the `mailto:` prefix; newer ones
      // are stored bare.
      email = (l.url || "").replace(/^mailto:/i, "").trim();
    }
    if (!phone && p.inputMode === "tel") {
      // Strip anything before the first `+` or digit. Catches the
      // standard `tel:` prefix as well as the rarer `tel` (no
      // colon) and stray whitespace, so the card never displays
      // "tel+..." or similar artefacts.
      phone = (l.url || "").replace(/^[^+\d]+/, "").trim();
    }
    if (email && phone) break;
  }
  return { email, phone };
}

/**
 * SVG <text> doesn't wrap or truncate, so any user-supplied string
 * needs to be capped before it hits the card or it'll spill past the
 * QR code. The cap is conservative — the live preview reveals the
 * truncation with an ellipsis.
 */
function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export default function BusinessCard({
  profile,
  profileUrl,
  themeVars,
  svgId = "business-card-svg",
}) {
  const accent = themeVars["--theme-accent"] || "#2563eb";
  const bg = themeVars["--theme-bg"] || "#0a1628";
  const textPrimary = themeVars["--theme-text"] || "#ffffff";
  const textSecondary =
    themeVars["--theme-text-secondary"] || "rgba(255,255,255,0.72)";

  // Tighter caps so the name + title can't overrun the QR column at
  // the chosen font sizes. The clip-path below catches anything that
  // does slip through (e.g. unusually wide glyphs).
  const name = truncate(profile?.name || "Your name", 18);
  const title = truncate(profile?.title || "", 30);
  const url = (profileUrl || "").replace(/^https?:\/\//, "");
  const { email, phone } = pickContact(profile?.links);

  // Initial used as the avatar fallback when there's no avatarUrl.
  const initial = (profile?.name || "?").trim().charAt(0).toUpperCase();

  const avatarCx = PAD + 100;
  const avatarCy = H / 2;
  const avatarR = 100;

  // Right side reserved for the QR. Sized so it never overlaps the
  // info column at the chosen text caps above.
  const qrSize = 200;
  const qrX = W - PAD - qrSize;
  const qrY = (H - qrSize) / 2;

  // Bounds of the info column. The clip-path uses these so any text
  // that does overrun the cap is cut at the edge of the column rather
  // than running into the QR plate.
  const infoX = PAD + 240;
  const infoW = qrX - 24 - infoX;

  return (
    <svg
      id={svgId}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      // Drop-shadow comes from the parent wrapper so it doesn't
      // bleed into the exported PNG; the PNG itself is a clean
      // edge-to-edge card.
      style={{
        display: "block",
        borderRadius: 24,
        overflow: "hidden",
        background: bg,
      }}
    >
      <defs>
        <linearGradient id="bc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.85" />
          <stop offset="60%" stopColor={bg} />
          <stop offset="100%" stopColor={bg} />
        </linearGradient>
        <radialGradient id="bc-glow" cx="0.18" cy="0.5" r="0.55">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <clipPath id="bc-avatar-clip">
          <circle cx={avatarCx} cy={avatarCy} r={avatarR} />
        </clipPath>
        <clipPath id="bc-info-clip">
          <rect x={infoX} y={0} width={infoW} height={H} />
        </clipPath>
      </defs>

      {/* Background plate */}
      <rect width={W} height={H} fill="url(#bc-bg)" />
      {/* Soft accent glow behind the avatar — adds depth without a
          heavy background image. */}
      <rect width={W} height={H} fill="url(#bc-glow)" />

      {/* Subtle decorative grid lines in the bottom-right negative
          space. Pure visual texture; doesn't carry information. */}
      <g opacity="0.08" stroke={textPrimary} strokeWidth="1">
        <line x1={W - 40} y1={40} x2={W - 40} y2={H - 40} />
        <line x1={W - 80} y1={40} x2={W - 80} y2={H - 40} />
      </g>

      {/* Avatar — circle with border. Falls back to the user's
          initial letter when no avatarUrl is set. */}
      <circle
        cx={avatarCx}
        cy={avatarCy}
        r={avatarR + 4}
        fill="none"
        stroke={textPrimary}
        strokeOpacity="0.18"
        strokeWidth="2"
      />
      {profile?.avatarUrl ? (
        <image
          href={profile.avatarUrl}
          x={avatarCx - avatarR}
          y={avatarCy - avatarR}
          width={avatarR * 2}
          height={avatarR * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#bc-avatar-clip)"
        />
      ) : (
        <>
          <circle cx={avatarCx} cy={avatarCy} r={avatarR} fill={accent} />
          <text
            x={avatarCx}
            y={avatarCy + 28}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            fontSize="80"
            fontWeight="700"
            fill={textPrimary}
          >
            {initial}
          </text>
        </>
      )}

      {/* Info column. The clip-path is the safety net for unusually
          wide glyphs that slip past the character caps above. */}
      <g
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fill={textPrimary}
        clipPath="url(#bc-info-clip)"
      >
        <text x={infoX} y={H / 2 - 40} fontSize="44" fontWeight="800">
          {name}
        </text>
        {title && (
          <text
            x={infoX}
            y={H / 2}
            fontSize="20"
            fontWeight="500"
            fill={textSecondary}
          >
            {title}
          </text>
        )}
        {email && (
          <text x={infoX} y={H / 2 + 50} fontSize="18" fill={textSecondary}>
            {truncate(email, 32)}
          </text>
        )}
        {phone && (
          <text x={infoX} y={H / 2 + 80} fontSize="18" fill={textSecondary}>
            {phone}
          </text>
        )}
        {url && (
          <text
            x={infoX}
            y={H / 2 + 110}
            fontSize="18"
            fontWeight="600"
            fill={accent}
          >
            {truncate(url, 32)}
          </text>
        )}
      </g>

      {/* QR code on the right. Renders inside a white rounded square
          for guaranteed scanner contrast on dark themes too. SVG nested
          inside SVG is valid; the inner viewBox keeps the QR crisp at
          any output size. */}
      <rect
        x={qrX - 12}
        y={qrY - 12}
        width={qrSize + 24}
        height={qrSize + 24}
        rx="16"
        fill="#ffffff"
      />
      <g transform={`translate(${qrX}, ${qrY})`}>
        <QRCodeSVG
          value={profileUrl || "https://example.com"}
          size={qrSize}
          level="M"
          marginSize={0}
        />
      </g>

      {/* Brand mark. Small, low-opacity, doesn't compete with the
          user's identity. */}
      <text
        x={PAD}
        y={H - 32}
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="14"
        letterSpacing="2"
        fontWeight="700"
        fill={textPrimary}
        opacity="0.55"
      >
        MO TECH
      </text>
    </svg>
  );
}
