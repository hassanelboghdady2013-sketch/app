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
} from "react-icons/fa6";

const platforms = [
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin, placeholder: "https://linkedin.com/in/yourname" },
  { id: "github", label: "GitHub", icon: FaGithub, placeholder: "https://github.com/yourname" },
  { id: "twitter", label: "Twitter / X", icon: FaXTwitter, placeholder: "https://x.com/yourname" },
  { id: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "https://instagram.com/yourname" },
  { id: "tiktok", label: "TikTok", icon: FaTiktok, placeholder: "https://tiktok.com/@yourname" },
  { id: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "https://youtube.com/@yourname" },
  { id: "email", label: "Email", icon: FaEnvelope, placeholder: "mailto:you@example.com" },
  { id: "phone", label: "Phone", icon: FaPhone, placeholder: "tel:+1234567890" },
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
