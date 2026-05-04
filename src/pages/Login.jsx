import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/ui/AuthShell";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Log in — Mo Tech";
  }, []);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to log in");
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

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your Mo Tech profile.">
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
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
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
        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-brand hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
