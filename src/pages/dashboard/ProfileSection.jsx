import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Check,
  X,
  Loader2,
  QrCode,
  Copy,
  Share2,
  ExternalLink,
  Download,
  Wifi,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import reservedUsernames from "../../lib/reservedUsernames";
import { downloadQrAsPng } from "../../lib/qrDownload";
import toast from "react-hot-toast";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Card from "../../components/ui/Card";
import IconButton from "../../components/ui/IconButton";
import AvatarUploader from "../../components/dashboard/AvatarUploader";
import NfcProgramDialog from "../../components/dashboard/NfcProgramDialog";
import DeleteAccountDialog from "../../components/dashboard/DeleteAccountDialog";
import ProfileCompleteness from "../../components/dashboard/ProfileCompleteness";

const NAME_MAX = 60;
const TITLE_MAX = 80;
const BIO_MAX = 240;

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ProfileSection() {
  const { user, profile, links } = useOutletContext();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    title: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showNfc, setShowNfc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialState, setInitialState] = useState(null);
  // Profile is null until the auth + Firestore snapshot resolve; for brand-new
  // users the snapshot returns an empty object (set in DashboardLayout) so the
  // form renders with empty defaults and the save bar can appear.
  const loading = !user || profile === null;
  const debounceRef = useRef(null);
  const originalUsername = useRef("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && profile) {
      const initial = {
        name: profile.name || "",
        username: profile.username || "",
        title: profile.title || "",
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
      };
      setForm({
        name: initial.name,
        username: initial.username,
        title: initial.title,
        bio: initial.bio,
      });
      setAvatarUrl(initial.avatarUrl);
      setInitialState(initial);
      originalUsername.current = profile.username || "";
      initialized.current = true;
    }
  }, [profile]);

  const dirty =
    initialState &&
    !deepEqual(
      { ...form, avatarUrl },
      initialState
    );

  const checkUsername = useCallback((username) => {
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
  }, []);

  // Avatar changes persist *immediately* to Firestore — we don't fold
  // them into the deferred Save flow because the AvatarUploader has
  // already mutated Storage (uploaded a new file, or deleted the old
  // one) by the time it calls us. Storing eagerly keeps Firestore and
  // Storage in sync; otherwise a Discard click would leave Firestore
  // pointing at a Storage object that no longer matches.
  //
  // Errors propagate up to AvatarUploader so it can show its own toast
  // and skip its success path; we deliberately don't toast here to
  // avoid showing two error messages for the same failure.
  async function handleAvatarChange(url) {
    if (!user?.uid) return;
    const next = url || "";
    // Persist *first*, then bump local state. If we set state
    // optimistically and the Firestore write throws, the avatar
    // circle would be showing the new image and `dirty` would flip
    // true — directly contradicting the error toast the uploader is
    // about to show. AvatarUploader already shows the in-flight
    // preview off its own local blob URL, so visual feedback isn't
    // lost by waiting for the round-trip.
    await setDoc(
      doc(db, "profiles", user.uid),
      { avatarUrl: next, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setAvatarUrl(next);
    // Keep dirty-tracking in sync so the Save bar doesn't surface
    // "unsaved changes" purely because the avatar changed.
    setInitialState((prev) => (prev ? { ...prev, avatarUrl: next } : prev));
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "username") checkUsername(value);
  }

  async function handleSave() {
    if (
      usernameStatus === "taken" ||
      usernameStatus === "reserved" ||
      usernameStatus === "invalid" ||
      usernameStatus === "checking"
    ) {
      toast.error("Please fix username before saving");
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
      setInitialState({ ...form, username, avatarUrl });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!initialState) return;
    setForm({
      name: initialState.name,
      username: initialState.username,
      title: initialState.title,
      bio: initialState.bio,
    });
    setAvatarUrl(initialState.avatarUrl);
  }

  const profileUrl = form.username
    ? `${window.location.origin}/${form.username}`
    : null;

  async function handleCopyUrl() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function handleShare() {
    if (!profileUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: form.name || "My profile", url: profileUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyUrl();
    }
  }

  async function handleDownloadQR() {
    if (!profileUrl) return;
    try {
      await downloadQrAsPng({
        svgId: "profile-qr-svg",
        filename: `${form.username || "profile"}-qr`,
      });
    } catch (err) {
      toast.error(err.message || "Couldn't download QR");
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
    <div className="max-w-2xl pb-24 lg:pb-0">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Profile
        </h2>
        <p className="text-sm text-muted mt-1">
          Your basic info and the URL people will visit.
        </p>
      </header>

      <ProfileCompleteness profile={profile} links={links} />

      {/* Avatar + identity */}
      <Card padding="lg" className="mb-6">
        <AvatarUploader
          uid={user?.uid}
          value={avatarUrl}
          fallbackLetter={(form.name || user?.email || "?").charAt(0).toUpperCase()}
          onChange={handleAvatarChange}
        />
      </Card>

      {/* URL + actions */}
      {profileUrl && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium tracking-wider uppercase text-faint">
              Your profile URL
            </p>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <ExternalLink size={12} />
              Open
            </a>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-fg/90 font-mono truncate bg-input border border-line rounded-lg px-3 py-2">
              {profileUrl}
            </code>
            <IconButton aria-label="Copy URL" onClick={handleCopyUrl} title="Copy URL">
              {copied ? (
                <Check size={16} className="text-success" />
              ) : (
                <Copy size={16} />
              )}
            </IconButton>
            <IconButton aria-label="Share" onClick={handleShare} title="Share">
              <Share2 size={16} />
            </IconButton>
            <IconButton
              aria-label={showQR ? "Hide QR code" : "Show QR code"}
              onClick={() => setShowQR((v) => !v)}
              title="QR code"
              variant={showQR ? "brand" : "ghost"}
            >
              <QrCode size={16} />
            </IconButton>
            <IconButton
              aria-label="Program NFC card"
              onClick={() => setShowNfc(true)}
              title="Program NFC card"
            >
              <Wifi size={16} />
            </IconButton>
          </div>
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-3 p-5 bg-white rounded-xl">
              <QRCodeSVG id="profile-qr-svg" value={profileUrl} size={200} />
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Download size={14} />}
                onClick={handleDownloadQR}
                className="text-app hover:text-app hover:bg-black/5"
              >
                Download PNG
              </Button>
            </div>
          )}
        </Card>
      )}

      {showNfc && profileUrl && (
        <NfcProgramDialog
          url={profileUrl}
          onClose={() => setShowNfc(false)}
        />
      )}

      {/* Form */}
      <div className="space-y-5">
        <Input
          label="Display name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value.slice(0, NAME_MAX))}
          placeholder="John Doe"
          maxLength={NAME_MAX}
        />

        <Input
          label="Username"
          value={form.username}
          onChange={(e) =>
            handleChange("username", e.target.value.toLowerCase().replace(/\s/g, ""))
          }
          placeholder="johndoe"
          hint="Letters, numbers, hyphens, and underscores. 3+ characters."
          error={
            usernameStatus === "taken"
              ? "This username is already taken"
              : usernameStatus === "reserved"
              ? "This username is reserved"
              : usernameStatus === "invalid"
              ? "Only letters, numbers, hyphens, and underscores"
              : undefined
          }
          rightSlot={
            <span className="w-8 h-8 grid place-items-center" aria-hidden="true">
              {usernameStatus === "checking" && (
                <Loader2 size={16} className="animate-spin text-muted" />
              )}
              {usernameStatus === "available" && (
                <Check size={16} className="text-success" />
              )}
              {(usernameStatus === "taken" || usernameStatus === "reserved") && (
                <X size={16} className="text-danger" />
              )}
              {usernameStatus === "invalid" && (
                <X size={16} className="text-warning" />
              )}
            </span>
          }
        />

        <Input
          label="Title"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value.slice(0, TITLE_MAX))}
          placeholder="Software Engineer"
          maxLength={TITLE_MAX}
        />

        <Textarea
          label="Bio"
          value={form.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="Tell people about yourself…"
        />

      </div>

      {/* Danger zone */}
      <Card padding="lg" className="mt-10 border-danger/30 bg-danger/[0.04]">
        <div className="flex items-start gap-3 mb-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-danger/15 text-danger shrink-0">
            <AlertTriangle size={16} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg">Danger zone</h3>
            <p className="text-xs text-muted mt-0.5">
              Permanently remove your profile, links, and sign-in. This cannot
              be undone.
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          size="md"
          leftIcon={<Trash2 size={14} />}
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete my account
        </Button>
      </Card>

      {showDeleteDialog && (
        <DeleteAccountDialog
          user={user}
          username={profile?.username || form.username || ""}
          onClose={() => setShowDeleteDialog(false)}
          onCompleted={() => {
            setShowDeleteDialog(false);
            // The auth user is gone at this point; navigate to landing
            // and onAuthStateChanged in AuthContext will push us to a
            // signed-out state.
            navigate("/", { replace: true });
            toast.success("Account deleted");
          }}
        />
      )}

      {/* Sticky save bar */}
      <div
        className={`fixed inset-x-0 bottom-16 lg:bottom-6 z-30 px-4 transition-all duration-200 pointer-events-none ${
          dirty ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="pointer-events-auto max-w-2xl mx-auto bg-card-hi border border-line-strong rounded-xl p-3 flex items-center justify-between gap-3 shadow-card">
          <p className="text-sm text-muted">You have unsaved changes.</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={handleReset} disabled={saving}>
              Discard
            </Button>
            <Button size="md" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
