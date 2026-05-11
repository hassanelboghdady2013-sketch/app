import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Site-wide configuration is stored in a single Firestore doc:
 *   settings/site = { shopUrl: "https://...", updatedAt: ... }
 *
 * Reads are public (rules allow it), so the Landing CTA and the
 * Mo Tech footer on public profiles can resolve the shop URL even
 * for unauthenticated visitors. Writes are admin-only.
 *
 * Both subscribe + once-off getters are exported because the Landing
 * page and the AdminCodes page have different read-shape needs.
 */

export const SITE_SETTINGS_DOC = doc(db, "settings", "site");

export async function getSiteSettings() {
  try {
    const snap = await getDoc(SITE_SETTINGS_DOC);
    return snap.exists() ? snap.data() : {};
  } catch {
    // Most likely a transient network issue. Fall back to empty so
    // the caller renders without the CTA rather than crashing.
    return {};
  }
}

export function subscribeSiteSettings(onChange) {
  return onSnapshot(
    SITE_SETTINGS_DOC,
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    () => onChange({})
  );
}

export async function setShopUrl(shopUrl) {
  await setDoc(
    SITE_SETTINGS_DOC,
    {
      shopUrl: shopUrl || "",
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

/** True if the value looks like an http(s) URL we can safely link to. */
export function isLikelyUrl(value) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
