import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MailCheck } from "lucide-react";
import AuthShell from "../components/ui/AuthShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";

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
  const { resetPassword } = useAuth();

  useEffect(() => {
    document.title = "Reset password — Mo Tech";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      // Don't surface auth/user-not-found because that would defeat
      // the anti-enumeration stance above; surface only operational
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
      } else {
        toast.error(err?.message || "Couldn't send the reset email.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${email.trim()}, we sent a password reset link.`}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-card-hi/40 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
              <MailCheck size={18} />
            </div>
            <div className="text-sm text-muted leading-relaxed">
              The link expires in about an hour. If it doesn&apos;t
              arrive in a couple of minutes, check your spam folder
              or try again from the same email address.
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
          >
            Send another link
          </Button>
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
