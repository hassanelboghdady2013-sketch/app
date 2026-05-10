import { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
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
import { Share2, Download, ChevronRight, Copy, Check, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SkeletonLoader from "../components/ui/SkeletonLoader";
import toast, { Toaster } from "react-hot-toast";

/**
 * Fold a long content line per RFC 2426 §2.6: max 75 octets per line,
 * continuation lines are prefixed with a single space (or tab). We
 * count chars conservatively as octets — fine here because the input
 * is base64 ASCII.
 */
function foldVcardLine(line) {
  if (line.length <= 75) return [line];
  const out = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out;
}

/**
 * Turn an `avatarUrl` field into the lines it should produce inside
 * the vCard. Returns an array of strings (zero, one, or many lines
 * for the folded base64 case).
 *
 *   - data:image/<type>;base64,<data> -> `PHOTO;ENCODING=b;TYPE=<TYPE>:<data>`
 *     folded at 75 octets. Strips the data: prefix because vCard
 *     readers (iOS Contacts, Android Contacts, Outlook) expect raw
 *     base64 here, not a `data:` URL.
 *   - http(s):// URLs -> single `PHOTO;VALUE=uri:<url>` line.
 *   - falsy/unsupported -> `[]` so the PHOTO line gets omitted.
 */
function buildVcardPhoto(avatarUrl) {
  if (!avatarUrl) return [];
  const dataMatch = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(avatarUrl);
  if (dataMatch) {
    const mimeSubtype = dataMatch[1].toUpperCase();
    // vCard 3.0 uses TYPE=JPEG / TYPE=PNG (the subtype, uppercased).
    // Map the canvas-emitted "jpeg" through cleanly.
    const type = mimeSubtype === "JPEG" ? "JPEG" : mimeSubtype;
    const base64 = dataMatch[2];
    return foldVcardLine(`PHOTO;ENCODING=b;TYPE=${type}:${base64}`);
  }
  if (/^https?:\/\//i.test(avatarUrl)) {
    return [`PHOTO;VALUE=uri:${avatarUrl}`];
  }
  // Any other shape (relative path, blob:, javascript:, etc.) is
  // safer to omit than to emit something a parser will choke on.
  return [];
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

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
          } catch {
            /* silent */
          }
        }

        addDoc(collection(db, "pageViews"), {
          username,
          device: navigator.userAgent,
          referrer: document.referrer || "",
          createdAt: serverTimestamp(),
        }).catch(() => {
          /* silent */
        });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (username) fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile?.name) {
      document.title = `${profile.name} — Mo Tech`;
    } else if (notFound) {
      document.title = "Profile not found — Mo Tech";
    }
  }, [profile, notFound]);

  function handleLinkClick(linkId, url) {
    addDoc(collection(db, "linkClicks"), {
      linkId,
      createdAt: serverTimestamp(),
    }).catch(() => {
      /* silent */
    });
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

    // Build the PHOTO line. Two shapes depending on what the avatar
    // string actually is:
    //
    //   - data: URL  -> emit `PHOTO;ENCODING=b;TYPE=JPEG:<base64>`
    //     and fold lines at 75 octets per RFC 2426 §2.6. Stuffing a
    //     30+ KB data URL into a `PHOTO;VALUE=uri:` line produces a
    //     single multi-thousand-char line that iOS Contacts /
    //     Android Contacts / Outlook all reject (or silently strip
    //     the photo from). The encoded form below is what Apple and
    //     Google's own exporters use for inline images.
    //
    //   - https URL  -> short, fits on one line, the standard
    //     `PHOTO;VALUE=uri:<https-url>` form is correct. Legacy
    //     users whose avatarUrl still points at
    //     firebasestorage.googleapis.com fall through this branch.
    //
    // `null` means no avatar field at all, which is also fine.
    const photoLines = buildVcardPhoto(profile.avatarUrl);

    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${profile.name || ""}`,
      `TITLE:${profile.title || ""}`,
      email ? `EMAIL:${email}` : "",
      phone ? `TEL:${phone}` : "",
      `URL:${website}`,
      ...photoLines,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name || username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contact downloaded");
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile?.name || username, url });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
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
      <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-soft text-brand items-center justify-center mb-5">
            <span className="text-2xl font-bold">404</span>
          </div>
          <h1
            className="text-3xl font-bold mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Profile not found
          </h1>
          <p className="text-muted mb-7 leading-relaxed">
            The page <span className="font-mono text-fg">@{username}</span>{" "}
            doesn&apos;t exist — yet. Want to claim it?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <RouterLink
              to="/register"
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-hover transition-colors"
            >
              Create your page
            </RouterLink>
            <RouterLink
              to="/"
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg border border-line-strong text-muted hover:text-fg hover:bg-card font-medium text-sm transition-colors"
            >
              Back home
            </RouterLink>
          </div>
        </div>
      </div>
    );
  }

  const theme = profile?.themeJson || {};
  const cssVars = getThemeCSS(theme);
  const accent = cssVars["--theme-accent"] || "#2563eb";
  const bg = cssVars["--theme-bg"] || "#0a1628";
  const textSecondary = cssVars["--theme-text-secondary"] || "rgba(255,255,255,0.7)";
  const cardBg = cssVars["--theme-card-bg"] || "rgba(255,255,255,0.06)";
  const cardBorder = cssVars["--theme-card-border"] || "rgba(255,255,255,0.1)";
  const cardBackdrop = cssVars["--theme-card-backdrop"] || "blur(12px)";
  const cardShadow = cssVars["--theme-card-shadow"] || "none";
  const activeLinks = links.filter((l) => l.active !== false);

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        ...cssVars,
        backgroundColor: bg,
        fontFamily: cssVars["--theme-font"] || "var(--font-body)",
        color: cssVars["--theme-text"] || "#ffffff",
      }}
    >
      <Toaster position="top-center" />
      <div className="w-full max-w-[440px] px-6 py-12 sm:py-16">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-8">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover animate-scale-in"
              style={{ boxShadow: `0 8px 32px -8px ${accent}66` }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold animate-scale-in"
              style={{ backgroundColor: accent, color: bg }}
            >
              {profile?.name?.[0] || "?"}
            </div>
          )}
          <h1
            className="text-2xl font-bold mt-5 tracking-tight"
            style={{ fontFamily: cssVars["--theme-font"] || "var(--font-display)" }}
          >
            {profile?.name}
          </h1>
          {profile?.title && (
            <p className="text-sm mt-1" style={{ color: textSecondary }}>
              {profile.title}
            </p>
          )}
          {profile?.bio && (
            <p
              className="text-sm mt-4 max-w-xs leading-relaxed"
              style={{ color: textSecondary }}
            >
              {profile.bio}
            </p>
          )}
        </div>

        {/* Primary action row */}
        <div className="flex items-center gap-2 mb-8">
          <button
            type="button"
            onClick={handleSaveContact}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: accent, color: bg }}
          >
            <Download size={15} />
            Save contact
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share"
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95]"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              backdropFilter: cardBackdrop,
              boxShadow: cardShadow,
            }}
          >
            <Share2 size={15} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Link copied" : "Copy link"}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95]"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              backdropFilter: cardBackdrop,
              boxShadow: cardShadow,
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button
            type="button"
            onClick={() => setShowQR((v) => !v)}
            aria-label={showQR ? "Hide QR" : "Show QR"}
            aria-expanded={showQR}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95]"
            style={{
              backgroundColor: showQR ? accent : cardBg,
              color: showQR ? bg : "inherit",
              border: `1px solid ${cardBorder}`,
              backdropFilter: cardBackdrop,
              boxShadow: cardShadow,
            }}
          >
            <QrCode size={15} />
          </button>
        </div>

        {showQR && (
          <div className="mb-7 flex justify-center animate-scale-in">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={window.location.href} size={180} />
            </div>
          </div>
        )}

        {/* Links */}
        <div className="space-y-3">
          {activeLinks.map((link, index) => {
            const platform = getPlatform(link.platform);
            const Icon = platform.icon;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id, link.url)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] stagger-up"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${cardBorder}`,
                  backdropFilter: cardBackdrop,
                  boxShadow: cardShadow,
                  animationDelay: `${index * 70}ms`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${accent}1f` }}
                >
                  <Icon size={18} style={{ color: accent }} />
                </div>
                <span className="flex-1 font-medium text-sm">
                  {link.title || platform.label}
                </span>
                <ChevronRight size={16} style={{ color: textSecondary }} />
              </button>
            );
          })}
        </div>

        {activeLinks.length === 0 && (
          <p className="text-center text-sm" style={{ color: textSecondary }}>
            No links yet
          </p>
        )}

        {/* Footer */}
        <div className="mt-14 text-center">
          <a
            href="/"
            className="text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: textSecondary }}
          >
            Powered by <span style={{ color: accent }}>Mo Tech</span>
          </a>
        </div>
      </div>
    </div>
  );
}
