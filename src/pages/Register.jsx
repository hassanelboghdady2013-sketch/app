import { useState, useEffect, useRef, useCallback } from "react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff, Check, X, Loader2, Ticket, LogOut } from "lucide-react";
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
  // null = unknown, true = users/{uid} exists, false = signed in but no profile yet.
  const [hasProfile, setHasProfile] = useState(null);
  const { user, loading: authLoading, register, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debounceRef = useRef(null);
  // Set while a register/Google handler is mid-flight so the profile-check
  // effect below doesn't observe `user` becoming non-null between
  // createUser/signInWithPopup and claimInviteCode resolving — that race
  // would briefly render the claim-only panel and let the user fire a
  // concurrent claim from there.
  const inFlightRegistrationRef = useRef(false);

  useEffect(() => {
    document.title = "Sign up — Mo Tech";
  }, []);

  const needsInvite = searchParams.get("need-invite") === "1";

  // Whenever the auth state changes, check whether this user already has a
  // users/{uid} doc. If yes, they're fully registered and shouldn't be on
  // this page; if no, we'll surface the "claim-only" panel below.
  useEffect(() => {
    if (authLoading) return;
    // Skip while a registration/Google handler is in flight; once the
    // handler navigates or finally{} clears the ref + setLoading, the
    // setLoading state change re-renders and re-runs this effect.
    if (inFlightRegistrationRef.current) return;
    if (!user) {
      // Resets the lookup so a user who signs out and back in gets a fresh
      // check; the eslint rule below is fine to bypass because the assignment
      // only happens once per user transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasProfile(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!cancelled) setHasProfile(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setHasProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loading]);

  // Note: we intentionally no longer auto-redirect already-registered
  // users away from /register. The Landing nav surfaces a "Get
  // started" CTA that must remain functional even when a session
  // already exists — for a card-owner showing the page to a friend
  // beside them, or for switching between accounts. The "Already
  // signed in" panel below offers a direct shortcut to the dashboard
  // and a sign-out option that returns the form to its usable state.

  useEffect(() => {
    if (needsInvite) {
      toast.error("Enter your invite code to finish creating your account.");
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
    inFlightRegistrationRef.current = true;
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
        runCheck(inviteCode);
      }
      toast.error(err.message || "Failed to create account");
    } finally {
      inFlightRegistrationRef.current = false;
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!inviteOk) {
      toast.error("Enter a valid invite code first");
      return;
    }
    inFlightRegistrationRef.current = true;
    setLoading(true);
    try {
      let signedInUser;
      try {
        signedInUser = await loginWithGoogle();
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
        return;
      }
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
    } finally {
      inFlightRegistrationRef.current = false;
      setLoading(false);
    }
  }

  // Claim-only flow: the visitor is already authenticated (typically via
  // Google sign-in on /login) but hasn't paired their account with an invite
  // code yet. They just need to provide a code — no need to re-authenticate
  // or pick a password.
  async function handleClaimAuthed(e) {
    e.preventDefault();
    if (!user) return;
    if (!inviteOk) {
      toast.error("Please enter a valid invite code");
      return;
    }
    setLoading(true);
    try {
      await claimInviteCode({
        uid: user.uid,
        email: user.email,
        code: inviteCode,
      });
      toast.success("Welcome!");
      navigate("/dashboard");
    } catch (err) {
      runCheck(inviteCode);
      toast.error(err.message || "Couldn't redeem invite code");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchAccount() {
    try {
      await logout();
      toast.success("Signed out — you can pick a different account.");
    } catch (err) {
      toast.error(err.message || "Couldn't sign out");
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

  // Loading state while we figure out whether the signed-in user already has
  // a profile (avoids flashing the wrong panel). When `loading` is true a
  // register/Google handler is in flight, so don't show the loading shell —
  // keep rendering the form below where the submit/Google button shows its
  // own spinner.
  if (authLoading || (user && hasProfile === null && !loading)) {
    return (
      <AuthShell title="Loading…" subtitle="Checking your account…">
        <div className="flex justify-center py-6">
          <div
            className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
          />
        </div>
      </AuthShell>
    );
  }

  // Already-registered panel: signed in with a complete users/{uid}
  // doc. Don't auto-redirect — give them a clear shortcut to the
  // dashboard, plus a sign-out option so the registration form
  // becomes usable for a fresh account.
  if (user && hasProfile === true) {
    const displayName = user.displayName || user.email || "your account";
    const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
    return (
      <AuthShell
        title="You're already signed in"
        subtitle="Pick what you want to do next."
      >
        <div className="flex items-center gap-3 p-3 mb-5 rounded-lg bg-card-hi border border-line">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand/15 text-brand grid place-items-center font-semibold">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-fg truncate">
              {displayName}
            </div>
            {user.email && user.email !== displayName && (
              <div className="text-xs text-muted truncate">{user.email}</div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Go to dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={async () => {
              try {
                await logout();
                toast.success("Signed out — you can register a new account.");
              } catch {
                toast.error("Couldn't sign out");
              }
            }}
          >
            Sign out and register a new account
          </Button>
        </div>
      </AuthShell>
    );
  }

  // Claim-only panel: signed in but no users/{uid} doc yet (i.e. they just
  // logged in via Google for the first time). Skip email/password + the
  // Google button — we already know who they are.
  if (user && hasProfile === false) {
    const photoURL = user.photoURL;
    const displayName = user.displayName || user.email || "your account";
    const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
    return (
      <AuthShell
        title="One more step"
        subtitle="Enter the invite code from your Mo Tech card to finish setting up your account."
      >
        <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-card-hi border border-line">
          {photoURL ? (
            <img
              src={photoURL}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand/15 text-brand grid place-items-center font-semibold">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-fg truncate">
              Signed in as {displayName}
            </div>
            {user.email && user.email !== displayName && (
              <div className="text-xs text-muted truncate">{user.email}</div>
            )}
          </div>
        </div>

        <form onSubmit={handleClaimAuthed} className="space-y-4">
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
            type="submit"
            size="lg"
            loading={loading}
            className="w-full"
            disabled={loading || !inviteOk}
          >
            {loading ? "Claiming…" : "Claim and continue"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors"
          >
            <LogOut size={14} />
            Use a different account
          </button>
        </div>
      </AuthShell>
    );
  }

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
          disabled={!inviteOk || loading}
          loading={loading}
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
