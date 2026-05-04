import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import themePresets, { isColorDark } from "../../lib/themes";
import toast from "react-hot-toast";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Select from "../../components/ui/Select";

const fontOptions = [
  { value: "'Syne', sans-serif", label: "Syne (display)" },
  { value: "'DM Sans', sans-serif", label: "DM Sans (modern)" },
  { value: "'Georgia', serif", label: "Georgia (serif)" },
  { value: "'Courier New', monospace", label: "Courier New (mono)" },
];

const cardStyles = [
  { value: "glass", label: "Glass" },
  { value: "flat", label: "Flat" },
  { value: "shadow", label: "Shadow" },
];

const colorSwatches = [
  "#2563eb",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#d4af37",
  "#ffffff",
  "#000000",
];

const bgSwatches = [
  "#070b14",
  "#0a0a0a",
  "#0d0221",
  "#0a1f17",
  "#1e1e1e",
  "#fef6e4",
  "#fafafa",
  "#ffffff",
];

function ColorPicker({ value, onChange, swatches, label, id }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-muted mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2 mb-2.5">
        <label
          className="relative w-10 h-10 rounded-lg overflow-hidden border border-line cursor-pointer shrink-0"
          aria-label={`${label} picker`}
        >
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: value }}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-10 px-3 rounded-lg bg-input border border-line text-fg text-sm font-mono focus:outline-none focus:border-brand transition-colors"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Use ${c}`}
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-md transition-transform hover:scale-110 ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-brand ring-offset-2 ring-offset-app"
                : "border border-line"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AppearanceSection() {
  const { user, profile } = useOutletContext();
  const [theme, setTheme] = useState({
    bgColor: "#0a0a0a",
    accentColor: "#d4af37",
    fontFamily: "'Syne', sans-serif",
    cardStyle: "glass",
  });
  const [saving, setSaving] = useState(false);
  const [initialTheme, setInitialTheme] = useState(null);
  const loading = profile === undefined;

  useEffect(() => {
    if (initialTheme || !profile) return;
    const next = profile.themeJson || theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(next);
    setInitialTheme(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const dirty =
    initialTheme && JSON.stringify(theme) !== JSON.stringify(initialTheme);

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
      setInitialTheme(theme);
      toast.success("Theme saved");
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (initialTheme) setTheme(initialTheme);
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <SkeletonLoader className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonLoader className="h-24" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl pb-24 lg:pb-0">
      <header className="mb-6">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Appearance
        </h2>
        <p className="text-sm text-muted mt-1">
          Match your page to your personal brand. Changes apply after Save.
        </p>
      </header>

      {/* Presets */}
      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted mb-3">Theme presets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themePresets.map((preset) => {
            const isActive =
              theme.bgColor.toLowerCase() === preset.bgColor.toLowerCase() &&
              theme.accentColor.toLowerCase() === preset.accentColor.toLowerCase();
            const dark = isColorDark(preset.bgColor);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-label={`Apply ${preset.name} preset`}
                aria-pressed={isActive}
                className={`relative p-4 rounded-xl text-left transition-all ${
                  isActive
                    ? "ring-2 ring-brand ring-offset-2 ring-offset-app"
                    : "border border-line hover:border-line-strong"
                }`}
                style={{ backgroundColor: preset.bgColor }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-full ring-1 ring-black/5"
                    style={{ backgroundColor: preset.accentColor }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: dark ? "#fff" : "#111",
                      fontFamily: preset.fontFamily,
                    }}
                  >
                    {preset.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="h-2 flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          preset.cardStyle === "glass"
                            ? "rgba(255,255,255,0.18)"
                            : dark
                            ? "#1f2a3f"
                            : "#e5e5e5",
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom controls */}
      <section className="space-y-7">
        <div>
          <h3 className="text-sm font-medium text-muted mb-4">Custom colors</h3>
          <Card padding="lg" className="grid sm:grid-cols-2 gap-6">
            <ColorPicker
              id="bg-color"
              label="Background"
              value={theme.bgColor}
              onChange={(v) => setTheme((t) => ({ ...t, bgColor: v }))}
              swatches={bgSwatches}
            />
            <ColorPicker
              id="accent-color"
              label="Accent"
              value={theme.accentColor}
              onChange={(v) => setTheme((t) => ({ ...t, accentColor: v }))}
              swatches={colorSwatches}
            />
          </Card>
        </div>

        <Card padding="lg">
          <Select
            label="Font family"
            value={theme.fontFamily}
            onChange={(e) =>
              setTheme((t) => ({ ...t, fontFamily: e.target.value }))
            }
          >
            {fontOptions.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Card>

        <div>
          <h3 className="text-sm font-medium text-muted mb-3">Card style</h3>
          <div className="grid grid-cols-3 gap-2">
            {cardStyles.map((cs) => {
              const active = theme.cardStyle === cs.value;
              return (
                <button
                  key={cs.value}
                  type="button"
                  onClick={() => setTheme((t) => ({ ...t, cardStyle: cs.value }))}
                  aria-pressed={active}
                  className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line text-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  {cs.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sticky save bar */}
      <div
        className={`fixed inset-x-0 bottom-16 lg:bottom-6 z-30 px-4 transition-all duration-200 pointer-events-none ${
          dirty ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="pointer-events-auto max-w-2xl mx-auto bg-card-hi border border-line-strong rounded-xl p-3 flex items-center justify-between gap-3 shadow-card">
          <p className="text-sm text-muted">Theme changes pending.</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={handleReset} disabled={saving}>
              Discard
            </Button>
            <Button size="md" onClick={handleSave} loading={saving}>
              Save theme
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
