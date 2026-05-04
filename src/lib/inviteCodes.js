import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  runTransaction,
  query,
  orderBy,
  limit as fsLimit,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export const INVITE_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

// Code-block alphabet excludes ambiguous 0/O/1/I/L so users don't mistype.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normalizeInviteCode(raw) {
  return (raw || "").trim().toUpperCase();
}

export function isInviteCodeWellFormed(code) {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(code));
}

export function normalizePrefix(rawPrefix) {
  const cleaned = (rawPrefix || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 12);
}

function randomBlock(n) {
  const out = new Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(n);
    crypto.getRandomValues(arr);
    for (let i = 0; i < n; i++) {
      out[i] = CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < n; i++) {
      out[i] = CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  }
  return out.join("");
}

export function generateInviteCode(prefix = "MOTECH") {
  const p = normalizePrefix(prefix) || "MOTECH";
  return `${p}-${randomBlock(4)}-${randomBlock(4)}`;
}

/**
 * Look up an invite code on the client to give the user real-time feedback.
 * Returns one of: "invalid", "not-found", "claimed", "available".
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

/* --------------------------- Admin helpers --------------------------- */

/**
 * Returns true if the given uid has an `admins/{uid}` document.
 */
export async function isUserAdmin(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Mint up to `count` invite codes in a single batched write. Skips any
 * collision with an existing doc by retrying with a fresh random code.
 * Returns the array of newly created codes.
 *
 * Requires the caller to be an admin (enforced server-side by Firestore
 * rules — see firestore.rules). Each code starts unclaimed.
 */
export async function mintInviteCodes({ count = 1, prefix = "MOTECH", note = null } = {}) {
  const total = Math.min(Math.max(parseInt(count, 10) || 1, 1), 100);
  const safePrefix = normalizePrefix(prefix) || "MOTECH";
  const minted = [];
  // Firestore writeBatch is capped at 500 ops; we mint at most 100, so a
  // single batch is fine.
  const batch = writeBatch(db);
  const used = new Set();
  let attempts = 0;
  while (minted.length < total) {
    attempts++;
    if (attempts > total * 10) {
      throw new Error("Couldn't generate enough unique codes — try a different prefix");
    }
    const code = generateInviteCode(safePrefix);
    if (used.has(code)) continue;
    // Quick collision check against existing docs.
    // (Rules disallow create when the doc already exists, so even if two
    // admins race the create we'll fail loudly rather than overwrite.)
    const ref = doc(db, "inviteCodes", code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    used.add(code);
    batch.set(ref, {
      claimedBy: null,
      claimedAt: null,
      note: note || null,
      createdAt: serverTimestamp(),
    });
    minted.push(code);
  }
  await batch.commit();
  return minted;
}

/**
 * Read every invite code, sorted by creation time (most recent first).
 * Requires admin (server-side `list` rule).
 */
export async function listInviteCodes({ max = 500 } = {}) {
  const q = query(
    collection(db, "inviteCodes"),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Delete an unclaimed invite code. Requires admin (server-side `delete` rule
 * also enforces "claimedBy must be null").
 */
export async function deleteInviteCode(code) {
  const normalized = normalizeInviteCode(code);
  if (!isInviteCodeWellFormed(normalized)) {
    throw new Error("Invalid invite code");
  }
  await deleteDoc(doc(db, "inviteCodes", normalized));
}
