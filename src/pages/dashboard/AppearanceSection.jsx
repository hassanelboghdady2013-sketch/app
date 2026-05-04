import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import themePresets from "../../lib/themes";
import toast from "react-hot-toast";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

const fontOptions = [
  { value: "'Syne', sans-serif", label: "Syne" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

const cardStyles = [
  { value: "glass", label: "Glass" },
  { value: "flat", label: "Flat" },
];

export default function AppearanceSection() {
  const { user, profile } = useOutletContext();
  const [theme, setTheme] = useState({
    bgColor: "#0a0a0a",
    accentColor: "#d4af37",
    fontFamily: "'Syne', sans-serif",
    cardStyle: "glass",
  });
  const [saving, setSaving] = useState(false);
  const loading = profile === undefined;
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && profile?.themeJson) {
      setTheme(profile.themeJson);
      initialized.current = true;
    } else if (!initialized.current && profile) {
      initialized.current = true;
    }
  }, [profile]);

  function applyPreset(preset) {
    setTheme({
      bgColor: preset.bgColor,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
      cardStyle: preset.cardStyle,
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), { themeJson: theme });
      toast.success("Theme saved!");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <SkeletonLoader className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonLoader className="h-24" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Appearance
      </h2>

      {/* Presets */}
      <div className="mb-8">
        <h3 className="text-sm text-[#8896ab] mb-3">Theme Presets</h3>
        <div className="grid grid-cols-2 gap-3">
          {themePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="p-4 rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors text-left"
              style={{ backgroundColor: preset.bgColor }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: preset.accentColor }}
                />
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isColorDark(preset.bgColor) ? "#fff" : "#111",
                    fontFamily: preset.fontFamily,
                  }}
                >
                  {preset.name}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full"
                    style={{
                      backgroundColor:
                        preset.cardStyle === "glass"
                          ? "rgba(255,255,255,0.1)"
                          : isColorDark(preset.bgColor)
                          ? "#1e3a5f"
                          : "#e5e5e5",
                    }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Controls */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#8896ab] mb-2 font-medium">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.bgColor}
                onChange={(e) => setTheme((t) => ({ ...t, bgColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
              />
              <input
                value={theme.bgColor}
                onChange={(e) => setTheme((t) => ({ ...t, bgColor: e.target.value }))}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#8896ab] mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
              />
              <input
                value={theme.accentColor}
                onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-2 font-medium">Font Family</label>
          <select
            value={theme.fontFamily}
            onChange={(e) => setTheme((t) => ({ ...t, fontFamily: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors"
          >
            {fontOptions.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-2 font-medium">Card Style</label>
          <div className="flex gap-3">
            {cardStyles.map((cs) => (
              <button
                key={cs.value}
                onClick={() => setTheme((t) => ({ ...t, cardStyle: cs.value }))}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  theme.cardStyle === cs.value
                    ? "border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]"
                    : "border-white/[0.06] text-[#8896ab] hover:border-white/[0.1] hover:text-white"
                }`}
              >
                {cs.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Theme"}
        </button>
      </div>
    </div>
  );
}

function isColorDark(hex) {
  if (!hex) return true;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
