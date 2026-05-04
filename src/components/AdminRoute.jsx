import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isUserAdmin } from "../lib/inviteCodes";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    isUserAdmin(user.uid).then((ok) => {
      if (!cancelled) setAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || (user && admin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div
          className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!admin) return <Navigate to="/dashboard" replace />;

  return children;
}
