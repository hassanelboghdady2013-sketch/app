import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wifi,
  Share2,
  BarChart3,
  Palette,
  Zap,
  Shield,
  ArrowRight,
  Star,
  ClipboardList,
  PenTool,
  Send,
  Menu,
  X,
  ShoppingBag,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { subscribeSiteSettings, isLikelyUrl } from "../lib/siteSettings";
import { FaGithub, FaXTwitter, FaInstagram } from "react-icons/fa6";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Logo from "../components/ui/Logo";

const features = [
  {
    icon: Wifi,
    title: "NFC Smart Cards",
    desc: "Share your identity with a single tap. Instant, wireless, frictionless.",
    accent: "text-brand bg-brand-soft",
  },
  {
    icon: Share2,
    title: "Smart Links",
    desc: "All your socials, portfolio, and contact info on one beautiful page.",
    accent: "text-success bg-success/10",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    desc: "Real-time views and clicks so you know what's working — and what isn't.",
    accent: "text-warning bg-warning/10",
  },
  {
    icon: Palette,
    title: "Custom Themes",
    desc: "Match your personal brand with presets or your own palette and fonts.",
    accent: "text-brand bg-brand-soft",
  },
  {
    icon: Zap,
    title: "2-Minute Setup",
    desc: "No code. No app. Sign up, add your links, and you're live.",
    accent: "text-warning bg-warning/10",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    desc: "Enterprise-grade Firebase auth, security rules, and encrypted storage.",
    accent: "text-success bg-success/10",
  },
];

const steps = [
  {
    icon: ClipboardList,
    num: "01",
    title: "Create your page",
    desc: "Sign up with email or Google. Pick a username and you're ready.",
  },
  {
    icon: PenTool,
    num: "02",
    title: "Personalize it",
    desc: "Add your links, colors, fonts, and theme. Live preview as you edit.",
  },
  {
    icon: Send,
    num: "03",
    title: "Tap & share",
    desc: "Order an NFC card or share your link. Everything just works.",
  },
];

const testimonials = [
  {
    name: "Ahmed K.",
    role: "Founder, Cairo",
    text: "Networking is frictionless now. Tap, share, done. Best investment of the year.",
  },
  {
    name: "Salma M.",
    role: "Product Designer",
    text: "Sleek, modern, and it just works. The analytics are surprisingly addictive.",
  },
  {
    name: "Omar H.",
    role: "Software Engineer",
    text: "Got my portfolio live in a single evening. Support replied within the hour.",
  },
  {
    name: "Nour A.",
    role: "Brand Consultant",
    text: "Ditched paper cards for good. Clients are visibly impressed every time.",
  },
];

function PhoneMock() {
  const sampleLinks = [
    { label: "Portfolio", color: "#2563eb" },
    { label: "LinkedIn", color: "#2563eb" },
    { label: "Instagram", color: "#ec4899" },
    { label: "Email", color: "#10b981" },
  ];
  return (
    <div className="relative w-[260px] h-[520px] md:w-[280px] md:h-[560px] mx-auto">
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-[3rem] bg-brand/10 blur-3xl pointer-events-none"
      />
      <div className="relative h-full rounded-[2.25rem] border border-line-strong bg-card-hi shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden animate-float-slow">
        <div className="h-7 flex items-center justify-center">
          <div className="w-20 h-1.5 rounded-full bg-line-strong" />
        </div>
        <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-brand/30 animate-[pulse-ring_2.5s_ease-out_infinite]"
            />
            <div className="relative w-16 h-16 rounded-full bg-brand grid place-items-center text-white text-2xl font-bold ring-2 ring-brand-soft">
              M
            </div>
          </div>
          <p
            className="mt-3 font-bold text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mo Elboghdady
          </p>
          <p className="text-xs text-muted">Founder · Mo Tech</p>
        </div>
        <div className="px-5 space-y-2.5">
          {sampleLinks.map((l, i) => (
            <div
              key={l.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-line-strong stagger-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-md grid place-items-center"
                style={{ backgroundColor: `${l.color}22`, color: l.color }}
              >
                <span className="block w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
              </span>
              <span className="text-sm font-medium">{l.label}</span>
              <span className="ml-auto text-faint text-xs">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [navOpen, setNavOpen] = useState(false);
  const { user } = useAuth();
  // Shop URL read from the public settings/site doc. Admins edit it
  // from /admin/codes so the Landing + public-profile CTAs can be
  // re-pointed without a code change.
  const [shopUrl, setShopUrl] = useState("");

  useEffect(() => {
    return subscribeSiteSettings((data) => {
      setShopUrl(data?.shopUrl || "");
    });
  }, []);

  const shopHref = isLikelyUrl(shopUrl) ? shopUrl : null;

  return (
    <div className="min-h-screen bg-app text-fg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-app/80 backdrop-blur-lg border-b border-line">
        <div className="flex items-center justify-between px-5 lg:px-8 py-3.5 max-w-7xl mx-auto">
          <Link to="/" aria-label="Mo Tech home">
            <Logo size={32} />
          </Link>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-muted hover:text-fg transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-fg transition-colors">
              How it works
            </a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {shopHref && (
              <a
                href={shopHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-fg transition-colors inline-flex items-center gap-1.5"
              >
                <ShoppingBag size={14} />
                Buy a card
              </a>
            )}
            {user ? (
              <Button
                as={Link}
                to="/dashboard"
                size="md"
                leftIcon={<LayoutDashboard size={15} />}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-muted hover:text-fg transition-colors"
                >
                  Log in
                </Link>
                <Button as={Link} to="/register" size="md">
                  Get started
                </Button>
              </>
            )}
          </div>
          <button
            type="button"
            className="md:hidden p-2 -mr-2 rounded-lg text-muted hover:text-fg hover:bg-card transition-colors"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-line">
            <div className="px-5 py-4 space-y-3 max-w-7xl mx-auto">
              <a
                href="#features"
                onClick={() => setNavOpen(false)}
                className="block py-2 text-sm text-muted hover:text-fg"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setNavOpen(false)}
                className="block py-2 text-sm text-muted hover:text-fg"
              >
                How it works
              </a>
              {shopHref && (
                <a
                  href={shopHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setNavOpen(false)}
                  className="block py-2 text-sm text-muted hover:text-fg inline-flex items-center gap-1.5"
                >
                  <ShoppingBag size={14} />
                  Buy a card
                </a>
              )}
              <div className="flex gap-2 pt-2">
                {user ? (
                  <Button
                    as={Link}
                    to="/dashboard"
                    size="md"
                    className="flex-1"
                    leftIcon={<LayoutDashboard size={15} />}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button as={Link} to="/login" variant="outline" size="md" className="flex-1">
                      Log in
                    </Button>
                    <Button as={Link} to="/register" size="md" className="flex-1">
                      Get started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-dot-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-radial" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="grid lg:grid-cols-[1.1fr_1fr] items-center gap-12 lg:gap-16">
            <div className="text-center lg:text-left">
              <Badge variant="brand" className="mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                NFC-powered digital identity
              </Badge>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-bold leading-[1.05] mb-5 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Tap into the{" "}
                <span className="text-brand">future</span>{" "}
                of networking.
              </h1>
              <p className="text-lg text-muted max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Smart NFC cards and digital portfolios. Build a profile that's uniquely yours,
                share it with a single tap, and track every view in real time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-12">
                <Button as={Link} to="/register" size="xl" rightIcon={<ArrowRight size={16} />}>
                  Get started — free
                </Button>
                {shopHref ? (
                  <Button
                    as="a"
                    href={shopHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    size="xl"
                    leftIcon={<ShoppingBag size={16} />}
                  >
                    Buy a card
                  </Button>
                ) : (
                  <Button as="a" href="#features" variant="outline" size="xl">
                    See how it works
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 max-w-md mx-auto lg:mx-0 gap-6 text-center lg:text-left">
                <div>
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">500+</p>
                  <p className="text-xs text-muted mt-1">Cards shipped</p>
                </div>
                <div className="border-l border-line pl-6">
                  <p className="text-2xl md:text-3xl font-bold tracking-tight inline-flex items-center gap-1">
                    4.9
                    <Star size={16} className="text-warning fill-warning -mt-0.5" />
                  </p>
                  <p className="text-xs text-muted mt-1">Customer rating</p>
                </div>
                <div className="border-l border-line pl-6">
                  <p className="text-2xl md:text-3xl font-bold tracking-tight">2 min</p>
                  <p className="text-xs text-muted mt-1">Avg setup time</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <PhoneMock />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-muted">
              From NFC cards to themed pages and analytics — built to make networking effortless.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <Card key={f.title} hoverable padding="lg">
                <div className={`w-11 h-11 rounded-xl ${f.accent} grid place-items-center mb-4`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold mb-1.5 text-fg">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 md:py-24 border-t border-line">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">How it works</Badge>
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three steps. No app. No headaches.
            </h2>
            <p className="text-muted">From sign-up to your first tap in under five minutes.</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-4">
            {steps.map((s) => (
              <li key={s.num}>
                <Card hoverable padding="lg" className="h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-brand-soft grid place-items-center">
                      <s.icon size={18} className="text-brand" />
                    </div>
                    <span
                      className="text-2xl font-bold text-line-strong"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {s.num}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-24 border-t border-line">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-4">Loved by users</Badge>
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Real words from real users.
            </h2>
            <p className="text-muted">Join hundreds of professionals already on Mo Tech.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {testimonials.map((t, i) => {
              const colors = [
                "bg-brand-soft text-brand",
                "bg-success/15 text-success",
                "bg-warning/15 text-warning",
                "bg-danger/15 text-danger",
              ];
              return (
                <Card key={t.name} hoverable padding="md" className="flex flex-col">
                  <div className="flex gap-0.5 mb-3" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        size={13}
                        className="text-warning fill-warning"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-fg/80 mb-5 leading-relaxed grow">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full grid place-items-center text-sm font-semibold ${colors[i % colors.length]}`}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-fg">{t.name}</p>
                      <p className="text-xs text-muted">{t.role}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-5 lg:px-8">
          <div className="relative rounded-3xl p-10 md:p-14 text-center overflow-hidden border border-brand/30 bg-gradient-to-br from-brand-soft via-card to-app">
            <div aria-hidden="true" className="absolute inset-0 bg-dot-grid opacity-30" />
            <div className="relative">
              <h2
                className="text-3xl md:text-4xl font-bold mb-3 tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to tap into the future?
              </h2>
              <p className="text-muted mb-8 max-w-md mx-auto">
                Get your digital portfolio live today. No credit card. No code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  as={Link}
                  to="/register"
                  size="xl"
                  rightIcon={<ArrowRight size={16} />}
                >
                  Get started — free
                </Button>
                {shopHref && (
                  <Button
                    as="a"
                    href={shopHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outline"
                    size="xl"
                    leftIcon={<ShoppingBag size={16} />}
                  >
                    Buy a Mo Tech card
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-app-soft">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <Logo size={32} />
              <p className="text-sm text-muted mt-4 max-w-xs leading-relaxed">
                NFC-powered digital identity. Tap. Share. Impress.
              </p>
              <div className="flex gap-2 mt-5">
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-fg hover:bg-card transition-colors"
                  aria-label="GitHub"
                >
                  <FaGithub size={16} />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-fg hover:bg-card transition-colors"
                  aria-label="X (Twitter)"
                >
                  <FaXTwitter size={16} />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-fg hover:bg-card transition-colors"
                  aria-label="Instagram"
                >
                  <FaInstagram size={16} />
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3 text-fg">Product</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-muted hover:text-fg transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-muted hover:text-fg transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <Link to="/login" className="text-muted hover:text-fg transition-colors">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3 text-fg">Company</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted hover:text-fg transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted hover:text-fg transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted hover:text-fg transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted hover:text-fg transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-faint">
              &copy; {new Date().getFullYear()} Mo Tech. All rights reserved.
            </p>
            <p className="text-xs text-faint">Built in Cairo. Shipped worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
