import { Link } from "react-router-dom";
import { Wifi, Share2, BarChart3, Palette, Zap, Shield, ArrowRight, Star, ClipboardList, PenTool, Send } from "lucide-react";

const features = [
  { icon: Wifi, title: "NFC Smart Cards", desc: "Share your contact info with a single tap. Instant, wireless, and effortless." },
  { icon: Share2, title: "Smart Links", desc: "All your socials, portfolio, and contact info in one beautiful page." },
  { icon: BarChart3, title: "Analytics", desc: "Track views, clicks, and engagement in real time with detailed insights." },
  { icon: Palette, title: "Custom Themes", desc: "Make your page match your personal brand with presets or custom colors." },
  { icon: Zap, title: "Instant Setup", desc: "Go live in under 2 minutes. No code needed. Just tap and share." },
  { icon: Shield, title: "Secure", desc: "Your data is protected with enterprise-grade Firebase security rules." },
];

const steps = [
  { icon: ClipboardList, num: "01", title: "Create your page", desc: "Sign up and set up your profile in minutes." },
  { icon: PenTool, num: "02", title: "Personalize it", desc: "Add your links, socials, contact info, and choose a theme." },
  { icon: Send, num: "03", title: "Tap & share", desc: "Share your NFC card or link with anyone, anywhere." },
];

const testimonials = [
  { name: "Ahmed K.", role: "Entrepreneur", text: "Networking is a breeze now. Highly recommend Mo Tech." },
  { name: "Salma M.", role: "Designer", text: "Sleek, modern, and it just works. Worth every EGP." },
  { name: "Omar H.", role: "Developer", text: "Got my portfolio live in a week. Support was on point." },
  { name: "Nour A.", role: "Consultant", text: "Ditched paper cards for good. Clients are impressed every time." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0b1121] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0b1121]/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-6 lg:px-8 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mo Tech" className="w-9 h-9 rounded-full" />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Mo tech
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-white">Home</Link>
            <a href="#features" className="text-sm text-[#8896ab] hover:text-white transition-colors">Services</a>
            <a href="#how-it-works" className="text-sm text-[#8896ab] hover:text-white transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[#8896ab] hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm rounded-lg bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2563eb]/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24 relative">
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162033] text-xs text-[#8896ab] mb-6 border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                NFC-Powered Digital Identity
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] mb-4 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Tap Into The{" "}
                <span className="text-[#2563eb]">Future</span>
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-white/70 mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Share with one tap.
              </p>
              <p className="text-[#8896ab] max-w-lg mb-8 leading-relaxed">
                Smart NFC cards and digital portfolios. Create your page, customize it,
                and share your entire digital identity with a single tap.
              </p>
              <div className="flex gap-3 justify-center md:justify-start mb-10">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8] transition-colors"
                >
                  Get Started <ArrowRight size={16} />
                </Link>
                <a
                  href="#features"
                  className="px-6 py-3 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Learn More
                </a>
              </div>
              <div className="flex gap-8 justify-center md:justify-start text-center">
                <div>
                  <p className="text-2xl font-bold">500+</p>
                  <p className="text-xs text-[#8896ab] mt-0.5">Cards shipped</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold">4.9<Star size={12} className="inline text-yellow-400 fill-yellow-400 ml-0.5 -mt-0.5" /></p>
                  <p className="text-xs text-[#8896ab] mt-0.5">Average rating</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold">24h</p>
                  <p className="text-xs text-[#8896ab] mt-0.5">Avg. reply</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative w-72 h-72 md:w-96 md:h-96">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#162033] to-[#0d1629] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2563eb]/[0.04] to-transparent" />
                  <img src="/logo.png" alt="Mo Tech NFC Card" className="w-40 md:w-56 relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Our Services
            </h2>
            <p className="text-[#8896ab] max-w-lg mx-auto">
              From smart NFC cards to full digital solutions, we have everything you need.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl bg-[#111827] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-[#2563eb]" />
                </div>
                <h3 className="font-semibold mb-1.5 text-white">{f.title}</h3>
                <p className="text-sm text-[#8896ab] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              How it works
            </h2>
            <p className="text-[#8896ab]">
              Three steps. No app. No setup headaches.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((s) => (
              <div key={s.num} className="p-6 rounded-xl bg-[#111827] border border-white/[0.04] hover:border-white/[0.08] transition-colors text-center md:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                  <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                    <s.icon size={18} className="text-[#2563eb]" />
                  </div>
                  <span className="text-xl font-bold text-white/20">{s.num}</span>
                </div>
                <h3 className="font-semibold mb-1.5 text-white">{s.title}</h3>
                <p className="text-sm text-[#8896ab] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Loved by our customers
            </h2>
            <p className="text-[#8896ab]">
              Real words from real users.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="p-5 rounded-xl bg-[#111827] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-[#c0c9d6] mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-medium text-sm text-white">{t.name}</p>
                  <p className="text-xs text-[#8896ab]">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="rounded-2xl bg-[#111827] border border-white/[0.04] p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Ready to tap into the future?
            </h2>
            <p className="text-[#8896ab] mb-8 max-w-md mx-auto">
              Get your digital portfolio today and start sharing instantly.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-[#2563eb] text-white font-medium hover:bg-[#1d4ed8] transition-colors"
            >
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0a0f1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Mo Tech" className="w-7 h-7 rounded-full" />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Mo tech</span>
            </div>
            <div className="flex gap-6">
              <a href="#features" className="text-sm text-[#8896ab] hover:text-white transition-colors">Services</a>
              <a href="#how-it-works" className="text-sm text-[#8896ab] hover:text-white transition-colors">How it works</a>
              <Link to="/login" className="text-sm text-[#8896ab] hover:text-white transition-colors">Login</Link>
            </div>
            <p className="text-xs text-[#566378]">&copy; {new Date().getFullYear()} Mo tech. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
