import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import {
  isGoogleUser,
  reauthenticate,
  deleteAccountData,
} from "../../lib/deleteAccount";
import Button from "../ui/Button";
import Input from "../ui/Input";

const STAGE_LABELS = {
  avatar: "Removing your photo…",
  links: "Removing your links…",
  profile: "Removing your profile…",
  username: "Releasing your username…",
  user: "Closing your account record…",
  auth: "Removing your sign-in…",
  done: "Done.",
};

/**
 * Two-step delete-account flow:
 *   1. Confirm — user types their username verbatim and (for password
 *      accounts) their password.
 *   2. Run — re-auth, cascade delete, then sign-out + redirect.
 *
 * Closes itself on success after a brief pause so the user can read
 * the final stage message.
 */
export default function DeleteAccountDialog({
  user,
  username,
  onClose,
  onCompleted,
}) {
  const isGoogle = isGoogleUser(user);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  useEffect(() => {
    // Auto-focus the username input so the keyboard is ready for the
    // confirmation typing on mobile.
    firstFieldRef.current?.focus();
  }, []);

  // ESC / overlay click to close — but only when not actively running
  // a deletion (don't strand the user mid-cascade).
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const expected = (username || "").trim();
  const usernameMatches = expected
    ? confirmText.trim() === expected
    : confirmText.trim() === user.email;
  const passwordReady = isGoogle ? true : password.length > 0;
  const canSubmit = usernameMatches && passwordReady && !busy;

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await reauthenticate(user, { password });
      await deleteAccountData(user, (s) => setStage(s));
      // Brief pause on the final stage so the user sees "Done" before
      // we redirect them to the landing page.
      setTimeout(() => onCompleted?.(), 600);
    } catch (err) {
      const code = err?.code || "";
      const friendly =
        code === "auth/wrong-password"
          ? "That password didn't match."
          : code === "auth/popup-closed-by-browser"
          ? "Sign-in popup was closed before we could verify it."
          : code === "auth/popup-blocked"
          ? "Allow popups for this site, then try again."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Wait a minute and try again."
          : err?.message || "Something went wrong. Please try again.";
      setError(friendly);
      setStage(null);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md rounded-2xl bg-card border border-line shadow-card overflow-hidden"
      >
        <header className="flex items-start justify-between p-5 pb-3">
          <div className="flex gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-danger/15 text-danger shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h2
                id="delete-account-title"
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Delete your account
              </h2>
              <p className="text-sm text-muted mt-0.5">
                This is permanent. We can't recover your data once you confirm.
              </p>
            </div>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-muted hover:text-fg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <div className="px-5 pb-5">
          <ul className="text-sm text-muted space-y-1.5 list-disc pl-5 mb-5">
            <li>Your profile, links, photo, and analytics will be erased.</li>
            <li>
              Your username <code className="text-fg">{expected || "—"}</code>{" "}
              will be released so someone else can claim it.
            </li>
            <li>
              Your invite code stays linked to this account and{" "}
              <strong>cannot be reused</strong> on a new sign-up.
            </li>
            <li>You will be signed out and returned to the homepage.</li>
          </ul>

          {!busy && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                ref={firstFieldRef}
                label={
                  expected
                    ? `Type your username to confirm`
                    : `Type your email to confirm`
                }
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expected || user.email}
                autoComplete="off"
                spellCheck={false}
              />
              {!isGoogle && (
                <Input
                  label="Your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  hint="We re-check this so a stranger with your laptop can't delete your account."
                />
              )}
              {isGoogle && (
                <p className="text-xs text-muted">
                  We'll re-open a Google sign-in popup to confirm it's you,
                  then delete the account.
                </p>
              )}
              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!canSubmit}
                  className="flex-1"
                >
                  Delete my account
                </Button>
              </div>
            </form>
          )}

          {busy && (
            <div
              className="rounded-xl border border-line bg-card-hi p-4 flex items-start gap-3"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={18} className="animate-spin text-brand mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  {STAGE_LABELS[stage] || "Working…"}
                </p>
                <p className="text-muted text-xs mt-0.5">
                  Don't close this window until it finishes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
