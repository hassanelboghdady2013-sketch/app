import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MailCheck, ShieldAlert } from "lucide-react";
import AuthShell from "../components/ui/AuthShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";

// Minimum gap between consecutive reset-link sends. Prevents an
// impatient user from spamming the button and burning Firebase's
// auth/too-many-requests budget on their own account.
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Password-reset entry point. Asks for an email, hands it to
 * Firebase's `sendPasswordResetEmail`, then shows a generic
 * "if an account exists, we sent a link" confirmation regardless
 * of the underlying result. The generic confirmation is deliberate
 * — revealing whether an email is registered leaks information an
 * attacker can use to enumerate accounts.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Held in a ref so the tick handler doesn't need to re-bind every
  // render. Cleared in the cleanup so a fast unmount can't leak a
  // setInterval into the next page.
  const cooldownTimerRef = useRef(null);
  const { resetPassword } = useAuth();

  useEffect(() => {
    document.title = "Reset password — Mo Tech";
  }, []);

  // Tick the cooldown counter down once per second. Stops at 0 so
  // the button re-enables and the label stops showing a duration.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldown]);

  async function sendResetLink(targetEmail) {
    setLoading(true);
    try {
      await resetPassword(targetEmail);
      setSubmitted(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (err) {
      // Don't surface auth/user-not-found because that would defeat
      // the anti-enumeration stance; surface only operational
      // failures the user can actually act on.
      if (err?.code === "auth/invalid-email") {
        toast.error("That doesn't look like a valid email.");
      } else if (err?.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Try again in a few minutes.");
      } else if (err?.code === "auth/user-not-found") {
        // Email-enumeration protection on by default means we shouldn't
        // see this in production, but keep the generic UX for legacy
        // projects too.
        setSubmitted(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return true;
      } else {
        toast.error(err?.message || "Couldn't send the reset email.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    await sendResetLink(trimmed);
  }

  async function handleResend() {
    const trimmed = email.trim();
    if (!trimmed || cooldown > 0 || loading) return;
    const ok = await sendResetLink(trimmed);
    if (ok) {
      toast.success("Reset link sent again.");
    }
  }

  if (submitted) {
    const resendDisabled = cooldown > 0 || loading;
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${email.trim()}, we sent a password reset link.`}
      >
        <div className="space-y-5">
          {/* Primary confirmation. Less visually loud than the spam
              callout below because the spam folder is where most
              missing emails end up. */}
          <div className="rounded-xl border border-line bg-card-hi/40 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
              <MailCheck size={18} />
            </div>
            <div className="text-sm text-muted leading-relaxed">
              The link expires in about an hour. Click it to set a
              new password and you&apos;re back in.
            </div>
          </div>

          {/* High-visibility spam folder callout. Most password
              reset emails get filtered there, so we surface it as a
              warning-tone card instead of burying it in muted body
              text. */}
          <div
            className="rounded-xl border p-4 flex gap-3"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.35)",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.18)",
                color: "#f59e0b",
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-fg">
                Don&apos;t see it? Check your spam folder.
              </p>
              <p className="text-muted mt-1">
                Password reset emails are often filtered as junk. If
                you find it there, mark it as &quot;Not spam&quot;
                so future emails from Mo Tech land in your inbox.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={resendDisabled}
            loading={loading}
            onClick={handleResend}
          >
            {cooldown > 0
              ? `Send another link in ${cooldown}s`
              : "Send another link"}
          </Button>

          <p className="text-center text-sm text-muted">
            Wrong email?{" "}
            <button
              type="button"
              className="text-brand hover:underline font-medium"
              onClick={() => {
                setSubmitted(false);
                setCooldown(0);
                setEmail("");
              }}
            >
              Use a different one
            </button>
          </p>
          <p className="text-center text-sm text-muted">
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-brand hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send a reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          autoFocus
        />
        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="w-full"
          disabled={!email.trim()}
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Remembered it?{" "}
        <Link to="/login" className="text-brand hover:underline font-medium">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
