import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Check, X, Loader2, QrCode, Copy, Share2, ImageIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import reservedUsernames from "../../lib/reservedUsernames";
import toast from "react-hot-toast";
import SkeletonLoader from "../../components/ui/SkeletonLoader";

export default function ProfileSection() {
  const { user, profile } = useOutletContext();
  const [form, setForm] = useState({
    name: "",
    username: "",
    title: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const loading = !profile && !user;
  const debounceRef = useRef(null);
  const originalUsername = useRef("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && profile) {
      setForm({
        name: profile.name || "",
        username: profile.username || "",
        title: profile.title || "",
        bio: profile.bio || "",
      });
      setAvatarUrl(profile.avatarUrl || "");
      originalUsername.current = profile.username || "";
      initialized.current = true;
    }
  }, [profile]);

  const checkUsername = useCallback(
    (username) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!username || username.length < 3) {
        setUsernameStatus(null);
        return;
      }
      if (reservedUsernames.has(username.toLowerCase())) {
        setUsernameStatus("reserved");
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameStatus("invalid");
        return;
      }
      if (username === originalUsername.current) {
        setUsernameStatus("available");
        return;
      }
      setUsernameStatus("checking");
      debounceRef.current = setTimeout(async () => {
        try {
          const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
          setUsernameStatus(snap.exists() ? "taken" : "available");
        } catch {
          setUsernameStatus(null);
        }
      }, 300);
    },
    []
  );

  function handleAvatarChange(url) {
    setAvatarUrl(url);
    setAvatarError("");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setAvatarError("URL must start with https://");
        return;
      }
    } catch {
      setAvatarError("Enter a valid URL");
      return;
    }
    const img = new Image();
    img.onload = () => setAvatarError("");
    img.onerror = () => setAvatarError("Could not load image from this URL");
    img.src = url;
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "username") checkUsername(value);
  }

  async function handleSave() {
    if (usernameStatus === "taken" || usernameStatus === "reserved" || usernameStatus === "invalid" || usernameStatus === "checking") {
      toast.error("Please fix username before saving");
      return;
    }
    if (avatarError) {
      toast.error("Please fix avatar URL before saving");
      return;
    }
    setSaving(true);
    try {
      const username = form.username.toLowerCase().trim();

      if (originalUsername.current && originalUsername.current !== username) {
        await deleteDoc(doc(db, "usernames", originalUsername.current));
      }

      if (username && username !== originalUsername.current) {
        await setDoc(doc(db, "usernames", username), { uid: user.uid });
      }

      await setDoc(
        doc(db, "profiles", user.uid),
        {
          ...form,
          username,
          avatarUrl,
          themeJson: profile?.themeJson || {
            bgColor: "#0a0a0a",
            accentColor: "#d4af37",
            fontFamily: "'Syne', sans-serif",
            cardStyle: "glass",
          },
          createdAt: profile?.createdAt || serverTimestamp(),
        },
        { merge: true }
      );

      originalUsername.current = username;
      toast.success("Profile saved!");
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const profileUrl = form.username
    ? `${window.location.origin}/${form.username}`
    : null;

  async function handleCopyUrl() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function handleShare() {
    if (!profileUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: form.name, url: profileUrl });
      } catch { /* user cancelled */ }
    } else {
      handleCopyUrl();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <SkeletonLoader className="h-8 w-48" />
        <SkeletonLoader className="h-24 w-24 rounded-full" />
        <SkeletonLoader className="h-12 w-full" count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Profile
      </h2>

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-8">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-white/[0.06]" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#111827] border border-white/[0.06] flex items-center justify-center text-2xl font-bold text-[#2563eb]">
              {form.name?.[0] || "?"}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-lg">{form.name || "Your Name"}</p>
          <p className="text-sm text-[#8896ab]">{form.title || "Your Title"}</p>
        </div>
      </div>

      {/* URL + QR + Share */}
      {profileUrl && (
        <div className="mb-8 p-4 rounded-xl bg-[#111827] border border-white/[0.04]">
          <p className="text-xs text-[#8896ab] mb-2">Your profile URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-[#2563eb] truncate">{profileUrl}</code>
            <button
              onClick={handleCopyUrl}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="QR Code"
            >
              <QrCode size={16} />
            </button>
          </div>
          {showQR && (
            <div className="mt-4 flex justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG value={profileUrl} size={180} />
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm text-[#8896ab] mb-1.5">Display Name</label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-1.5">Username</label>
          <div className="relative">
            <input
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63] pr-10"
              placeholder="johndoe"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && <Loader2 size={16} className="animate-spin text-[#8896ab]" />}
              {usernameStatus === "available" && <Check size={16} className="text-green-400" />}
              {(usernameStatus === "taken" || usernameStatus === "reserved") && (
                <X size={16} className="text-red-400" />
              )}
              {usernameStatus === "invalid" && <X size={16} className="text-yellow-400" />}
            </div>
          </div>
          {usernameStatus === "taken" && (
            <p className="text-xs text-red-400 mt-1">Username is already taken</p>
          )}
          {usernameStatus === "reserved" && (
            <p className="text-xs text-red-400 mt-1">This username is reserved</p>
          )}
          {usernameStatus === "invalid" && (
            <p className="text-xs text-yellow-400 mt-1">Only letters, numbers, hyphens and underscores</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-1.5">Title</label>
          <input
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
            placeholder="Software Engineer"
          />
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-1.5">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors resize-none placeholder:text-[#3d4f63]"
            placeholder="Tell people about yourself..."
          />
        </div>

        <div>
          <label className="block text-sm text-[#8896ab] mb-1.5">
            <ImageIcon size={14} className="inline mr-1" />
            Avatar URL
          </label>
          <input
            value={avatarUrl}
            onChange={(e) => handleAvatarChange(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border text-white text-sm focus:outline-none transition-colors placeholder:text-[#3d4f63] ${
              avatarError ? "border-red-500 focus:border-red-500" : "border-white/[0.06] focus:border-[#2563eb]"
            }`}
            placeholder="https://example.com/your-photo.jpg"
          />
          {avatarError ? (
            <p className="text-xs text-red-400 mt-1">{avatarError}</p>
          ) : (
            <p className="text-xs text-[#8896ab] mt-1">Paste a direct link to your profile photo (must be https)</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
