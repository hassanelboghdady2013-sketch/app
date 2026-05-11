import {
  FaLinkedin,
  FaGithub,
  FaXTwitter,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
  FaTelegram,
  FaGlobe,
  FaBehance,
  FaDribbble,
  FaLink,
  FaSnapchat,
  FaFacebook,
} from "react-icons/fa6";

// `inputMode` controls how the link form treats the value:
//   - "url"   (default): user types a full URL.
//   - "email": user types just an email; we store as `mailto:<email>`.
//   - "tel":   user types just a phone number; we store as `tel:<digits>`.
// Brand colour and a single-character glyph for each platform. Used
// by the SVG business card (which can't render react-icons) so the
// social row still shows recognisable brand-coloured chips.
const platforms = [
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin, brandColor: "#0a66c2", brandGlyph: "in", placeholder: "https://linkedin.com/in/yourname" },
  { id: "github", label: "GitHub", icon: FaGithub, brandColor: "#171515", brandGlyph: "GH", placeholder: "https://github.com/yourname" },
  { id: "twitter", label: "Twitter / X", icon: FaXTwitter, brandColor: "#000000", brandGlyph: "X", placeholder: "https://x.com/yourname" },
  { id: "instagram", label: "Instagram", icon: FaInstagram, brandColor: "#e1306c", brandGlyph: "Ig", placeholder: "https://instagram.com/yourname" },
  { id: "facebook", label: "Facebook", icon: FaFacebook, brandColor: "#1877f2", brandGlyph: "f", placeholder: "https://facebook.com/yourname" },
  { id: "snapchat", label: "Snapchat", icon: FaSnapchat, brandColor: "#fffc00", brandGlyph: "Sc", brandFg: "#000000", placeholder: "https://snapchat.com/add/yourname" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, brandColor: "#010101", brandGlyph: "TT", placeholder: "https://tiktok.com/@yourname" },
  { id: "youtube", label: "YouTube", icon: FaYoutube, brandColor: "#ff0000", brandGlyph: "YT", placeholder: "https://youtube.com/@yourname" },
  {
    id: "email",
    label: "Email",
    icon: FaEnvelope,
    brandColor: "#6b7280",
    brandGlyph: "@",
    placeholder: "you@example.com",
    inputMode: "email",
  },
  {
    id: "phone",
    label: "Phone",
    icon: FaPhone,
    brandColor: "#10b981",
    brandGlyph: "☎",
    placeholder: "+20 100 123 4567",
    inputMode: "tel",
  },
  { id: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, brandColor: "#25d366", brandGlyph: "Wa", placeholder: "https://wa.me/1234567890" },
  { id: "telegram", label: "Telegram", icon: FaTelegram, brandColor: "#229ed9", brandGlyph: "Tg", placeholder: "https://t.me/yourname" },
  { id: "website", label: "Website", icon: FaGlobe, brandColor: "#64748b", brandGlyph: "Www", placeholder: "https://yourwebsite.com" },
  { id: "behance", label: "Behance", icon: FaBehance, brandColor: "#1769ff", brandGlyph: "Be", placeholder: "https://behance.net/yourname" },
  { id: "dribbble", label: "Dribbble", icon: FaDribbble, brandColor: "#ea4c89", brandGlyph: "Dr", placeholder: "https://dribbble.com/yourname" },
  { id: "custom", label: "Custom", icon: FaLink, brandColor: "#64748b", brandGlyph: "•", placeholder: "https://example.com" },
];

export default platforms;

export function getPlatform(id) {
  return platforms.find((p) => p.id === id) || platforms[platforms.length - 1];
}

/**
 * Convert the raw value the user typed in the link form into the URL we
 * store in Firestore. Phone/email get the appropriate scheme prefix; we
 * also strip whitespace from phone numbers (but keep + and digits intact).
 * URL-mode platforms are passed through unchanged.
 */
export function buildLinkUrl(platformId, raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  const p = getPlatform(platformId);
  if (p.inputMode === "email") {
    return value.toLowerCase().startsWith("mailto:") ? value : `mailto:${value}`;
  }
  if (p.inputMode === "tel") {
    // Phone numbers commonly include spaces, dashes, parens; strip them so
    // the tel: URI is well-formed but keep the leading + and digits. We
    // also normalize the case where the user pasted a value that already
    // starts with `tel:` — strip it before cleaning so the resulting URI
    // doesn't keep stray spaces.
    const body = value.toLowerCase().startsWith("tel:")
      ? value.slice("tel:".length)
      : value;
    return `tel:${body.replace(/[^\d+]/g, "")}`;
  }
  return value;
}

/**
 * Inverse of buildLinkUrl: given a stored URL, return the value to show
 * in the input field for editing. Strips `mailto:` / `tel:` prefixes.
 */
export function extractLinkValue(platformId, url) {
  const value = (url || "").trim();
  if (!value) return "";
  const p = getPlatform(platformId);
  if (p.inputMode === "email" && value.toLowerCase().startsWith("mailto:")) {
    return value.slice("mailto:".length);
  }
  if (p.inputMode === "tel" && value.toLowerCase().startsWith("tel:")) {
    return value.slice("tel:".length);
  }
  return value;
}
