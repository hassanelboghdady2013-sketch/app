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
const platforms = [
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin, placeholder: "https://linkedin.com/in/yourname" },
  { id: "github", label: "GitHub", icon: FaGithub, placeholder: "https://github.com/yourname" },
  { id: "twitter", label: "Twitter / X", icon: FaXTwitter, placeholder: "https://x.com/yourname" },
  { id: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "https://instagram.com/yourname" },
  { id: "facebook", label: "Facebook", icon: FaFacebook, placeholder: "https://facebook.com/yourname" },
  { id: "snapchat", label: "Snapchat", icon: FaSnapchat, placeholder: "https://snapchat.com/add/yourname" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, placeholder: "https://tiktok.com/@yourname" },
  { id: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "https://youtube.com/@yourname" },
  {
    id: "email",
    label: "Email",
    icon: FaEnvelope,
    placeholder: "you@example.com",
    inputMode: "email",
  },
  {
    id: "phone",
    label: "Phone",
    icon: FaPhone,
    placeholder: "+20 100 123 4567",
    inputMode: "tel",
  },
  { id: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, placeholder: "https://wa.me/1234567890" },
  { id: "telegram", label: "Telegram", icon: FaTelegram, placeholder: "https://t.me/yourname" },
  { id: "website", label: "Website", icon: FaGlobe, placeholder: "https://yourwebsite.com" },
  { id: "behance", label: "Behance", icon: FaBehance, placeholder: "https://behance.net/yourname" },
  { id: "dribbble", label: "Dribbble", icon: FaDribbble, placeholder: "https://dribbble.com/yourname" },
  { id: "custom", label: "Custom", icon: FaLink, placeholder: "https://example.com" },
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
    if (value.toLowerCase().startsWith("tel:")) return value;
    // Phone numbers commonly include spaces, dashes, parens; strip them so
    // the tel: URI is well-formed but keep the leading + and digits.
    const cleaned = value.replace(/[^\d+]/g, "");
    return `tel:${cleaned}`;
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
