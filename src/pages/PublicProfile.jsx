import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPlatform } from "../lib/platforms";
import { getThemeCSS } from "../lib/themes";
import { Share2, Download, ChevronRight } from "lucide-react";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import toast, { Toaster } from "react-hot-toast";

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const usernameDoc = await getDoc(doc(db, "usernames", username));
        if (!usernameDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const uid = usernameDoc.data().uid;
        const profileDoc = await getDoc(doc(db, "profiles", uid));
        if (!profileDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(profileDoc.data());

        try {
          const linksQ = query(
            collection(db, "links"),
            where("uid", "==", uid),
            orderBy("order", "asc")
          );
          const linksSnap = await getDocs(linksQ);
          setLinks(linksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          try {
            const fallbackQ = query(
              collection(db, "links"),
              where("uid", "==", uid)
            );
            const snap = await getDocs(fallbackQ);
            const result = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setLinks(result);
          } catch { /* silent */ }
        }

        addDoc(collection(db, "pageViews"), {
          username,
          device: navigator.userAgent,
          referrer: document.referrer || "",
          createdAt: serverTimestamp(),
        }).catch(() => { /* silent */ });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (username) fetchProfile();
  }, [username]);

  function handleLinkClick(linkId, url) {
    addDoc(collection(db, "linkClicks"), {
      linkId,
      createdAt: serverTimestamp(),
    }).catch(() => { /* silent */ });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSaveContact() {
    if (!profile) return;
    const emailLink = links.find((l) => l.platform === "email");
    const phoneLink = links.find((l) => l.platform === "phone");
    const websiteLink = links.find((l) => l.platform === "website");

    const email = emailLink?.url?.replace("mailto:", "") || "";
    const phone = phoneLink?.url?.replace("tel:", "") || "";
    const website = websiteLink?.url || `${window.location.origin}/${username}`;

    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${profile.name || ""}`,
      `TITLE:${profile.title || ""}`,
      email ? `EMAIL:${email}` : "",
      phone ? `TEL:${phone}` : "",
      `URL:${website}`,
      profile.avatarUrl ? `PHOTO;VALUE=uri:${profile.avatarUrl}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name || username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contact downloaded!");
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.name || username, url });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      } catch {
        toast.error("Failed to copy");
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-full max-w-[420px] px-6 py-12 space-y-6">
          <div className="flex flex-col items-center">
            <SkeletonLoader className="w-24 h-24 rounded-full" />
            <SkeletonLoader className="h-6 w-32 mt-4" />
            <SkeletonLoader className="h-4 w-48 mt-2" />
          </div>
          <SkeletonLoader className="h-14 w-full" count={4} />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-6xl font-bold text-[#2563eb] mb-4" style={{ fontFamily: "var(--font-display)" }}>
            404
          </h1>
          <p className="text-[#94a3b8] mb-6">This profile doesn&apos;t exist yet.</p>
          <a
            href="/"
            className="px-6 py-3 rounded-xl bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors inline-block"
          >
            Create Your Own
          </a>
        </div>
      </div>
    );
  }

  const theme = profile?.themeJson || {};
  const cssVars = getThemeCSS(theme);
  const activeLinks = links.filter((l) => l.active !== false);

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        ...cssVars,
        backgroundColor: cssVars["--theme-bg"] || "#0a1628",
        fontFamily: cssVars["--theme-font"] || "var(--font-body)",
        color: cssVars["--theme-text"] || "#ffffff",
      }}
    >
      <Toaster position="top-center" />
      <div className="w-full max-w-[420px] px-6 py-12">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-10">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover animate-scale-in"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold animate-scale-in"
              style={{ backgroundColor: cssVars["--theme-accent"] || "#2563eb", color: cssVars["--theme-bg"] || "#0a1628" }}
            >
              {profile?.name?.[0] || "?"}
            </div>
          )}
          <h1
            className="text-2xl font-bold mt-4"
            style={{ fontFamily: cssVars["--theme-font"] || "var(--font-display)" }}
          >
            {profile?.name}
          </h1>
          {profile?.title && (
            <p className="text-sm mt-1" style={{ color: cssVars["--theme-text-secondary"] }}>
              {profile.title}
            </p>
          )}
          {profile?.bio && (
            <p
              className="text-sm mt-3 max-w-xs leading-relaxed"
              style={{ color: cssVars["--theme-text-secondary"] }}
            >
              {profile.bio}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveContact}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: cssVars["--theme-accent"] || "#2563eb",
                color: cssVars["--theme-bg"] || "#0a1628",
              }}
            >
              <Download size={14} />
              Save Contact
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors"
              style={{ borderColor: cssVars["--theme-card-border"] || "rgba(255,255,255,0.1)" }}
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          {activeLinks.map((link, index) => {
            const platform = getPlatform(link.platform);
            const Icon = platform.icon;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id, link.url)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] ripple stagger-up"
                style={{
                  backgroundColor: cssVars["--theme-card-bg"] || "rgba(255,255,255,0.06)",
                  border: `1px solid ${cssVars["--theme-card-border"] || "rgba(255,255,255,0.1)"}`,
                  backdropFilter: cssVars["--theme-card-backdrop"] || "blur(12px)",
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cssVars["--theme-accent"] || "#2563eb"}15` }}
                >
                  <Icon size={18} style={{ color: cssVars["--theme-accent"] || "#2563eb" }} />
                </div>
                <span className="flex-1 font-medium text-sm">
                  {link.title || platform.label}
                </span>
                <ChevronRight size={16} style={{ color: cssVars["--theme-text-secondary"] }} />
              </button>
            );
          })}
        </div>

        {activeLinks.length === 0 && (
          <p className="text-center text-sm" style={{ color: cssVars["--theme-text-secondary"] }}>
            No links yet
          </p>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: cssVars["--theme-text-secondary"] }}
          >
            Powered by <span style={{ color: cssVars["--theme-accent"] || "#2563eb" }}>Mo Tech</span>
          </a>
        </div>
      </div>
    </div>
  );
}
