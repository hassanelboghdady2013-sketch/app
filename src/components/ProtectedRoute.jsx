import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [registered, setRegistered] = useState(null);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!cancelled) setRegistered(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setRegistered(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading) {
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

  if (registered === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div
          className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (registered === false) {
    return <Navigate to="/register?need-invite=1" replace />;
  }

  return children;
}
