import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
import { User, Link2, Palette, BarChart3, LogOut, Menu, X } from "lucide-react";
import MobilePreview from "../../components/dashboard/MobilePreview";
import toast from "react-hot-toast";

const navItems = [
  { to: "/dashboard/profile", icon: User, label: "Profile" },
  { to: "/dashboard/links", icon: Link2, label: "Links" },
  { to: "/dashboard/appearance", icon: Palette, label: "Appearance" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      unsub = onSnapshot(q, (snap) => {
        setLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, async () => {
        try {
          const fallbackQ = query(
            collection(db, "links"),
            where("uid", "==", user.uid)
          );
          const snap = await getDocs(fallbackQ);
          const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setLinks(result);
        } catch { /* silent */ }
      });
    } catch {
      /* index not ready */
    }
    return () => unsub && unsub();
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logged out");
    } catch {
      toast.error("Failed to log out");
    }
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-[#0b1121]">
      <header className="sticky top-0 z-50 bg-[#0b1121]/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Mo Tech" className="w-8 h-8 rounded-full" />
              <span className="text-base font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Mo tech
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8896ab] hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-[#566378] max-w-[140px] truncate">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#8896ab] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-3 border-t border-white/5 mt-1 pt-2 space-y-0.5">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8896ab] hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#8896ab] hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut size={15} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <Outlet context={{ profile, links, user }} />
          </div>
          <div className="hidden xl:flex flex-col items-center pt-4 w-[300px] shrink-0">
            <p className="text-xs text-[#566378] mb-3 font-medium tracking-wide uppercase">Live Preview</p>
            <MobilePreview profile={profile} links={links} />
          </div>
        </div>
      </div>
    </div>
  );
}
