const themePresets = [
  {
    id: "dark-luxury",
    name: "Dark Luxury",
    bgColor: "#0a0a0a",
    accentColor: "#d4af37",
    fontFamily: "'Syne', sans-serif",
    cardStyle: "glass",
  },
  {
    id: "minimal",
    name: "Minimal",
    bgColor: "#fafafa",
    accentColor: "#111111",
    fontFamily: "'DM Sans', sans-serif",
    cardStyle: "flat",
  },
  {
    id: "neon",
    name: "Neon",
    bgColor: "#0d0221",
    accentColor: "#ff6ec7",
    fontFamily: "'Syne', sans-serif",
    cardStyle: "glass",
  },
  {
    id: "pastel",
    name: "Pastel",
    bgColor: "#fef6e4",
    accentColor: "#f582ae",
    fontFamily: "'DM Sans', sans-serif",
    cardStyle: "flat",
  },
];

export default themePresets;

export function getThemeCSS(theme) {
  if (!theme) return {};
  const isDark = isColorDark(theme.bgColor);
  return {
    "--theme-bg": theme.bgColor || "#0a1628",
    "--theme-accent": theme.accentColor || "#2563eb",
    "--theme-font": theme.fontFamily || "'DM Sans', sans-serif",
    "--theme-text": isDark ? "#ffffff" : "#111111",
    "--theme-text-secondary": isDark ? "#a1a1a1" : "#555555",
    "--theme-card-bg": theme.cardStyle === "glass"
      ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")
      : (isDark ? "#1a1a1a" : "#ffffff"),
    "--theme-card-border": isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    "--theme-card-backdrop": theme.cardStyle === "glass" ? "blur(12px)" : "none",
  };
}

function isColorDark(hex) {
  if (!hex) return true;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
