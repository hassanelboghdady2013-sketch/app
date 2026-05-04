#!/usr/bin/env node
/**
 * Grant the admin role to a Firebase user.
 *
 * The admin role is a presence check on `admins/{uid}` — see
 * `firestore.rules`. This script writes that doc using the Admin SDK so
 * Firestore rules don't get in the way (no chicken-and-egg problem when
 * bootstrapping the first admin).
 *
 * Usage:
 *   1. Download a service account key from Firebase Console:
 *        Project settings → Service accounts → Generate new private key.
 *      Save it as ./service-account.json (DO NOT commit it).
 *   2. Install firebase-admin once if you haven't already:
 *        npm install --no-save firebase-admin
 *   3. Run with the user's uid OR email:
 *        node scripts/grant-admin.cjs --uid=AAAA1234...
 *        node scripts/grant-admin.cjs --email=you@example.com
 *      Find a user's uid in Firebase Console → Authentication → Users.
 *
 * To revoke admin, pass --revoke to delete the doc:
 *   node scripts/grant-admin.cjs --uid=AAAA1234... --revoke
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const SERVICE_ACCOUNT_PATH = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "..", "service-account.json")
);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    `Service account not found at ${SERVICE_ACCOUNT_PATH}.\n` +
      "Download one from Firebase Console → Project settings → Service accounts."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

function parseArgs(argv) {
  const flags = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, ...rest] = a.slice(2).split("=");
      flags[k] = rest.length ? rest.join("=") : true;
    }
  }
  return flags;
}

async function resolveUid(flags) {
  if (flags.uid) return flags.uid;
  if (flags.email) {
    const user = await admin.auth().getUserByEmail(flags.email);
    return user.uid;
  }
  console.error("Pass --uid=<uid> or --email=<email>");
  process.exit(1);
  return null;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const uid = await resolveUid(flags);
  const ref = admin.firestore().collection("admins").doc(uid);

  if (flags.revoke) {
    await ref.delete();
    console.log(`Revoked admin from ${uid}`);
  } else {
    await ref.set(
      {
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        note: flags.note || null,
      },
      { merge: true }
    );
    console.log(`Granted admin to ${uid}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
