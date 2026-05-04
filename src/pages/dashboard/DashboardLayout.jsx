import { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  User,
  Link2,
  Palette,
  BarChart3,
  LogOut,
  ExternalLink,
  Smartphone,
  X,
  ChevronDown,
} from "lucide-react";
import MobilePreview from "../../components/dashboard/MobilePreview";
import Logo from "../../components/ui/Logo";
import IconButton from "../../components/ui/IconButton";
import toast from "react-hot-toast";

const navItems = [
  { to: "/dashboard/profile", icon: User, label: "Profile" },
  { to: "/dashboard/links", icon: Link2, label: "Links" },
  { to: "/dashboard/appearance", icon: Palette, label: "Appearance" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
];

function pageTitleFor(pathname) {
  const item = navItems.find((n) => pathname.startsWith(n.to));
  return item?.label || "Dashboard";
}

function UserMenu({ user, profile, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (profile?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-card-hi transition-colors"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-brand-soft text-brand grid place-items-center text-sm font-semibold">
            {initials}
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          size={14}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-line shadow-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-medium truncate">
              {profile?.name || "Your name"}
            </p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          {profile?.username && (
            <a
              href={`/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-fg hover:bg-card-hi transition-colors"
            >
              <ExternalLink size={14} />
              View public profile
            </a>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors text-left"
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "profiles", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let unsub;
    try {
      const q = query(
        collection(db, "links"),
        where("uid", "==", user.uid),
        orderBy("order", "asc")
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          setLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        async () => {
          try {
            const fallbackQ = query(collection(db, "links"), where("uid", "==", user.uid));
            const snap = await getDocs(fallbackQ);
            const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setLinks(result);
          } catch {
            /* silent */
          }
        }
      );
    } catch {
      /* index not ready */
    }
    return () => unsub && unsub();
  }, [user]);

  useEffect(() => {
    document.title = `${pageTitleFor(location.pathname)} — Mo Tech`;
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out");
    } catch {
      toast.error("Failed to log out");
    }
  }, [logout, navigate]);

  const sectionTitle = pageTitleFor(location.pathname);

  return (
    <div className="min-h-screen bg-app text-fg pb-20 lg:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-app/80 backdrop-blur-lg border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={28} />
            <span aria-hidden="true" className="text-line-strong hidden sm:inline">/</span>
            <h1
              className="text-sm font-semibold hidden sm:block truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {sectionTitle}
            </h1>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-muted hover:text-fg hover:bg-card-hi"
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {profile?.username && (
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View public profile"
                title="View public profile"
                className="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-card-hi transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            )}
            <IconButton
              aria-label={previewOpen ? "Close preview" : "Show preview"}
              onClick={() => setPreviewOpen((o) => !o)}
              className="lg:hidden"
              title="Preview"
            >
              <Smartphone size={16} />
            </IconButton>
            <UserMenu user={user} profile={profile} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Main + preview */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <main className="min-w-0">
            <Outlet context={{ profile, links, user }} />
          </main>
          <aside className="hidden lg:flex flex-col items-center pt-2 sticky top-20 self-start">
            <p className="text-xs text-faint mb-3 font-medium tracking-wider uppercase">
              Live preview
            </p>
            <MobilePreview profile={profile} links={links} />
            {profile?.username && (
              <a
                href={`/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
              >
                <ExternalLink size={12} />
                Open in new tab
              </a>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Sections"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-app/95 backdrop-blur-lg border-t border-line"
      >
        <div className="max-w-md mx-auto px-2 grid grid-cols-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors ${
                  isActive ? "text-brand" : "text-muted hover:text-fg"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-10 h-7 rounded-lg grid place-items-center transition-colors ${
                      isActive ? "bg-brand-soft" : ""
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile preview drawer */}
      {previewOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-label="Live preview"
            className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-card border border-line rounded-2xl p-5 max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-faint font-medium tracking-wider uppercase">
                Live preview
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPreviewOpen(false)}
                className="w-8 h-8 grid place-items-center rounded-md text-muted hover:text-fg hover:bg-card-hi transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-center">
              <MobilePreview profile={profile} links={links} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
