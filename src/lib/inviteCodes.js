import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";

export const INVITE_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

export function normalizeInviteCode(raw) {
  return (raw || "").trim().toUpperCase();
}

export function isInviteCodeWellFormed(code) {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(code));
}

/**
 * Look up an invite code on the client to give the user real-time feedback.
 * Returns one of: "not-found", "claimed", "available".
 */
export async function checkInviteCode(rawCode) {
  const code = normalizeInviteCode(rawCode);
  if (!isInviteCodeWellFormed(code)) return "invalid";
  const snap = await getDoc(doc(db, "inviteCodes", code));
  if (!snap.exists()) return "not-found";
  const data = snap.data() || {};
  if (data.claimedBy) return "claimed";
  return "available";
}

/**
 * Claim an invite code for the given uid and create the user's `users/{uid}`
 * doc atomically. Throws if the code is missing, already claimed, or if any
 * step fails.
 */
export async function claimInviteCode({ uid, email, code }) {
  const normalized = normalizeInviteCode(code);
  if (!isInviteCodeWellFormed(normalized)) {
    throw new Error("Invite code format is invalid");
  }
  const codeRef = doc(db, "inviteCodes", normalized);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(codeRef);
    if (!snap.exists()) throw new Error("Invite code not found");
    const data = snap.data() || {};
    if (data.claimedBy) throw new Error("Invite code already used");
    tx.update(codeRef, {
      claimedBy: uid,
      claimedAt: serverTimestamp(),
    });
  });

  // Now that the code is consumed, write the user doc that gates the rest of
  // the app. Done outside the transaction because it lives in a different
  // collection and the rules already restrict it to the owner.
  await setDoc(
    doc(db, "users", uid),
    {
      email: email || null,
      inviteCode: normalized,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
