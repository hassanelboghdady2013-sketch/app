import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff, Check, X, Loader2, Ticket } from "lucide-react";
import AuthShell from "../components/ui/AuthShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  checkInviteCode,
  claimInviteCode,
  isInviteCodeWellFormed,
  normalizeInviteCode,
} from "../lib/inviteCodes";

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong"][score] || "";
  return { score, label };
}

const STATUS_HINTS = {
  invalid: "Codes are 4–32 characters: A–Z, 0–9, hyphens.",
  "not-found": "We don't recognize that code.",
  claimed: "That code has already been used.",
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debounceRef = useRef(null);

  useEffect(() => {
    document.title = "Sign up — Mo Tech";
  }, []);

  const needsInvite = searchParams.get("need-invite") === "1";

  useEffect(() => {
    // Don't auto-redirect if we landed here because the user is signed in but
    // hasn't claimed an invite code yet (ProtectedRoute redirected them with
    // ?need-invite=1). Otherwise we'd loop between /dashboard and /register.
    if (!authLoading && user && !needsInvite) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate, needsInvite]);

  useEffect(() => {
    if (needsInvite) {
      toast.error("Please register with an invite code to access your dashboard.");
    }
  }, [needsInvite]);

  const runCheck = useCallback((raw) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const code = normalizeInviteCode(raw);
    if (!code) {
      setInviteStatus(null);
      return;
    }
    if (!isInviteCodeWellFormed(code)) {
      setInviteStatus("invalid");
      return;
    }
    setInviteStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkInviteCode(code);
        setInviteStatus(result);
      } catch {
        setInviteStatus(null);
      }
    }, 350);
  }, []);

  function handleInviteChange(value) {
    const upper = value.toUpperCase();
    setInviteCode(upper);
    runCheck(upper);
  }

  const strength = passwordStrength(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const inviteOk = inviteStatus === "available";
  const submitDisabled = loading || !inviteOk || mismatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!inviteOk) {
      toast.error("Please enter a valid invite code");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    let createdUser;
    try {
      createdUser = await register(email, password);
      await claimInviteCode({
        uid: createdUser.uid,
        email: createdUser.email,
        code: inviteCode,
      });
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      // If the auth account was created but the invite couldn't be claimed
      // (race or rule rejection), sign out so the user has to start over.
      if (createdUser) {
        try {
          await logout();
        } catch {
          /* noop */
        }
        // Re-check status so the UI reflects the new state.
        runCheck(inviteCode);
      }
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!inviteOk) {
      toast.error("Enter a valid invite code first");
      return;
    }
    try {
      const signedInUser = await loginWithGoogle();
      if (!signedInUser) return; // redirect flow
      try {
        await claimInviteCode({
          uid: signedInUser.uid,
          email: signedInUser.email,
          code: inviteCode,
        });
        toast.success("Welcome!");
        navigate("/dashboard");
      } catch (err) {
        await logout().catch(() => {});
        runCheck(inviteCode);
        toast.error(err.message || "Couldn't redeem invite code");
      }
    } catch (err) {
      if (err.code === "auth/unauthorized-domain") {
        toast.error(
          "This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains."
        );
      } else if (err.code === "auth/operation-not-allowed") {
        toast.error(
          "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Providers."
        );
      } else {
        toast.error(err.message || "Google sign-in failed");
      }
    }
  }

  const strengthColor = ["bg-line-strong", "bg-danger", "bg-warning", "bg-warning", "bg-success", "bg-success"][strength.score];

  const inviteIcon = (() => {
    if (inviteStatus === "checking") return <Loader2 size={16} className="animate-spin text-muted" />;
    if (inviteStatus === "available") return <Check size={16} className="text-success" />;
    if (inviteStatus === "invalid") return <X size={16} className="text-warning" />;
    if (inviteStatus === "not-found" || inviteStatus === "claimed")
      return <X size={16} className="text-danger" />;
    return null;
  })();

  const inviteError =
    inviteStatus === "not-found" || inviteStatus === "claimed" || inviteStatus === "invalid"
      ? STATUS_HINTS[inviteStatus]
      : undefined;

  return (
    <AuthShell
      title="Create your page"
      subtitle="Enter the invite code from your Mo Tech card to get started."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={
            <span className="inline-flex items-center gap-1.5">
              <Ticket size={14} />
              Invite code
            </span>
          }
          value={inviteCode}
          onChange={(e) => handleInviteChange(e.target.value)}
          required
          autoComplete="off"
          placeholder="MOTECH-XXXX-XXXX"
          hint={inviteError ? undefined : "From your NFC card or order confirmation."}
          error={inviteError}
          rightSlot={
            <span className="w-8 h-8 grid place-items-center" aria-hidden="true">
              {inviteIcon}
            </span>
          }
        />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          leftIcon={<FcGoogle size={18} />}
          onClick={handleGoogle}
          disabled={!inviteOk}
        >
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-1" aria-hidden="true">
          <div className="flex-1 h-px bg-line" />
          <span className="text-xs text-faint uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
        <div>
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 6 characters"
            rightSlot={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
                className="w-8 h-8 grid place-items-center rounded-md text-faint hover:text-fg hover:bg-card-hi transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          {password && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-line overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full transition-all ${strengthColor}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted w-20 text-right" aria-live="polite">
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Confirm your password"
          error={mismatch ? "Passwords do not match" : undefined}
        />
        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="w-full"
          disabled={submitDisabled}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-brand hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
