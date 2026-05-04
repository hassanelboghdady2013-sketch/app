import { Link } from "react-router-dom";
import { ArrowLeft, Wifi, BarChart3, Palette } from "lucide-react";
import Logo from "./Logo";

const highlights = [
  {
    icon: Wifi,
    title: "Tap to share",
    desc: "Smart NFC cards that share your profile in a single tap.",
  },
  {
    icon: Palette,
    title: "Your brand, your rules",
    desc: "Custom themes, fonts, and colors. Make it unmistakably you.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Know who taps, what they click, and when.",
  },
];

export default function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-app text-fg lg:grid lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-5 sm:px-8 py-6 min-h-screen lg:min-h-0">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" aria-label="Mo Tech home">
            <Logo size={30} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>

        <div className="grow flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            {subtitle && <p className="text-sm text-muted mt-1.5">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>

        <p className="text-center text-xs text-faint mt-8">
          &copy; {new Date().getFullYear()} Mo Tech
        </p>
      </div>

      {/* Brand column */}
      <div className="hidden lg:flex relative overflow-hidden border-l border-line bg-app-soft">
        <div aria-hidden="true" className="absolute inset-0 bg-dot-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-radial" />
        <div className="relative z-10 flex flex-col justify-center px-12 py-12 max-w-xl mx-auto">
          <h2
            className="text-3xl font-bold mb-3 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tap into the <span className="text-brand">future</span> of networking.
          </h2>
          <p className="text-muted mb-10 leading-relaxed">
            Join hundreds of professionals using Mo Tech to share their digital identity with one tap.
          </p>
          <ul className="space-y-5">
            {highlights.map((h) => (
              <li key={h.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0">
                  <h.icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-fg">{h.title}</p>
                  <p className="text-sm text-muted leading-relaxed">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
