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
    id: "midnight-blue",
    name: "Midnight",
    bgColor: "#070b14",
    accentColor: "#3b82f6",
    fontFamily: "'DM Sans', sans-serif",
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
  {
    id: "forest",
    name: "Forest",
    bgColor: "#0a1f17",
    accentColor: "#34d399",
    fontFamily: "'DM Sans', sans-serif",
    cardStyle: "glass",
  },
];

export default themePresets;

export function getThemeCSS(theme) {
  if (!theme) return {};
  const isDark = isColorDark(theme.bgColor);
  const cardStyle = theme.cardStyle || "glass";
  return {
    "--theme-bg": theme.bgColor || "#0a1628",
    "--theme-accent": theme.accentColor || "#2563eb",
    "--theme-font": theme.fontFamily || "'DM Sans', sans-serif",
    "--theme-text": isDark ? "#ffffff" : "#111111",
    "--theme-text-secondary": isDark ? "#a4b0c2" : "#555555",
    "--theme-card-bg":
      cardStyle === "glass"
        ? isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.04)"
        : cardStyle === "shadow"
        ? isDark
          ? "#1a1a1a"
          : "#ffffff"
        : isDark
        ? "#1a1a1a"
        : "#ffffff",
    "--theme-card-border":
      cardStyle === "shadow"
        ? "transparent"
        : isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.08)",
    "--theme-card-backdrop": cardStyle === "glass" ? "blur(12px)" : "none",
    "--theme-card-shadow":
      cardStyle === "shadow"
        ? "0 8px 24px -8px rgba(0,0,0,0.35)"
        : "none",
  };
}

export function isColorDark(hex) {
  if (!hex) return true;
  const c = hex.replace("#", "");
  if (c.length !== 6 && c.length !== 3) return true;
  const expand = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(expand.substring(0, 2), 16);
  const g = parseInt(expand.substring(2, 4), 16);
  const b = parseInt(expand.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
