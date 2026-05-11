/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resolve any in-flight redirect sign-in. Don't auto-provision a user
    // doc — the registration flow is responsible for creating it after a
    // valid invite code is claimed.
    getRedirectResult(auth).catch(() => {
      /* silent */
    });

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function loginWithGoogle() {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-browser") {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
  }

  async function logout() {
    await signOut(auth);
  }

  // Triggers Firebase's built-in password-reset email flow. The
  // recipient gets a magic link that opens Firebase's password-reset
  // page, where they set a new password. No backend or third-party
  // mailer required.
  //
  // Note: with Firebase's "Email enumeration protection" enabled
  // (default on new projects), this succeeds even for unknown
  // emails so attackers can't enumerate accounts. The UI surfaces a
  // generic success message regardless of the underlying result.
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  const value = {
    user,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
