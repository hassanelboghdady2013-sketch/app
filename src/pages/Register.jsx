import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/ui/AuthShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

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

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Sign up — Mo Tech";
  }, []);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const strength = passwordStrength(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      const result = await loginWithGoogle();
      if (result) {
        toast.success("Welcome!");
        navigate("/dashboard");
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

  return (
    <AuthShell
      title="Create your page"
      subtitle="Get your digital portfolio live in under two minutes."
    >
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        leftIcon={<FcGoogle size={18} />}
        onClick={handleGoogle}
      >
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs text-faint uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
        <Button type="submit" size="lg" loading={loading} className="w-full">
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
