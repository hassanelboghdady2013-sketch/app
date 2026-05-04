import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

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
        toast.error("This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.");
      } else if (err.code === "auth/operation-not-allowed") {
        toast.error("Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Providers.");
      } else {
        toast.error(err.message || "Google sign-in failed");
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1121] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="Mo Tech" className="w-9 h-9 rounded-full" />
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Mo tech
          </h1>
        </Link>

        <div className="bg-[#111827] border border-white/[0.04] rounded-xl p-7">
          <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
            Create your page
          </h2>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors mb-5"
          >
            <FcGoogle size={18} />
            <span className="text-sm font-medium text-white">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-[#566378]">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#8896ab] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8896ab] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8896ab] mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0b1121] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-[#2563eb] transition-colors placeholder:text-[#3d4f63]"
                placeholder="Confirm your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#2563eb] text-white font-medium text-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#8896ab] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#2563eb] hover:text-[#3b82f6] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
