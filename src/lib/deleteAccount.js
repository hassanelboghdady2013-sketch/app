import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  doc,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

/**
 * Returns true if the current user signed in with Google (vs. email/
 * password). Used to pick the right re-auth UI.
 */
export function isGoogleUser(user) {
  return !!user?.providerData?.some((p) => p.providerId === "google.com");
}

/**
 * Re-authenticate the currently signed-in user. Firebase requires a
 * recent credential before sensitive operations (delete, password
 * change, etc.) — sessions older than ~5 minutes will fail
 * `auth/requires-recent-login` otherwise.
 *
 * Throws on cancel/failure. Caller should surface a friendly toast.
 */
export async function reauthenticate(user, { password } = {}) {
  if (!user) throw new Error("Not signed in");
  if (isGoogleUser(user)) {
    const provider = new GoogleAuthProvider();
    // Force the account-chooser so the user explicitly confirms which
    // Google account is being used to authorize the deletion. (Without
    // this, Chrome silently re-uses the last account.)
    provider.setCustomParameters({ prompt: "select_account" });
    await reauthenticateWithPopup(user, provider);
    return;
  }
  if (!password) {
    throw new Error("Password is required to confirm");
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Cascade-delete all data owned by `user`, then delete the auth user
 * itself.
 *
 * Order matters because of the Firestore security rules:
 *   - `profiles/{uid}` and `links/{id}` writes require `isRegistered()`
 *     i.e. an existing `users/{uid}` doc — so those must be deleted
 *     BEFORE the user doc.
 *   - `usernames/{username}` delete only checks ownership, so it's
 *     position-independent.
 *   - `inviteCodes/{code}` is left untouched on purpose: the claimed
 *     code stays bound to the deleted uid, which preserves the
 *     "one card → one identity" model. We can't free codes for
 *     reuse anyway because the rules only allow updates that *set*
 *     `claimedBy`, not unset it.
 *   - `auth.currentUser.delete()` runs LAST. If it fails, all other
 *     data is already gone, which is the safer failure mode.
 *
 * `onProgress(stage)` is invoked between stages so callers can render
 * a step-by-step progress UI.
 */
export async function deleteAccountData(user, onProgress = () => {}) {
  if (!user) throw new Error("Not signed in");
  const { uid } = user;

  onProgress("avatar");
  try {
    await deleteObject(ref(storage, `avatars/${uid}/avatar.jpg`));
  } catch (err) {
    // Avatars are optional — first-time Google users in particular
    // may have a Google profile photo URL but no object in our bucket.
    if (err?.code !== "storage/object-not-found") {
      // Non-fatal; log and continue. The orphan can be cleaned up
      // out-of-band if it ever exists.
      console.warn("Avatar delete failed during account deletion:", err);
    }
  }

  onProgress("links");
  const linksSnap = await getDocs(
    query(collection(db, "links"), where("uid", "==", uid))
  );
  // Sequential deletes to keep the rules check simple and deterministic
  // even for large link counts. (Most users have <20 links, so this is
  // not a hot path.)
  for (const d of linksSnap.docs) {
    await deleteDoc(d.ref);
  }

  onProgress("profile");
  const profileSnap = await getDoc(doc(db, "profiles", uid));
  const claimedUsername = profileSnap.exists()
    ? profileSnap.data()?.username || null
    : null;
  if (profileSnap.exists()) {
    await deleteDoc(doc(db, "profiles", uid));
  }

  onProgress("username");
  if (claimedUsername) {
    try {
      await deleteDoc(doc(db, "usernames", claimedUsername));
    } catch (err) {
      // Don't abort the whole flow on a stray username doc — worst
      // case the username stays reserved, which is preferable to
      // leaving auth alive.
      console.warn("username delete failed during account deletion:", err);
    }
  }

  onProgress("user");
  // Must be last among Firestore writes — once this is gone, the
  // owner-write rules above no longer let us touch anything else.
  await deleteDoc(doc(db, "users", uid));

  onProgress("auth");
  await user.delete();

  onProgress("done");
}
