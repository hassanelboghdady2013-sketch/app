#!/usr/bin/env node
/**
 * Mint invite codes for Mo Tech using the Firebase Admin SDK.
 *
 * Usage:
 *   1. Download a service account key from Firebase Console:
 *        Project settings → Service accounts → Generate new private key.
 *      Save it as ./service-account.json (DO NOT commit it).
 *   2. Install firebase-admin once:
 *        npm install --no-save firebase-admin
 *   3. Run:
 *        node scripts/mint-invite-codes.cjs [count] [--prefix=MOTECH] [--note="Order #123"]
 *      Examples:
 *        node scripts/mint-invite-codes.cjs 10
 *        node scripts/mint-invite-codes.cjs 1 --note="Salma's card"
 *
 * Each generated code is written to the `inviteCodes` collection with
 * `claimedBy = null`. Hand the printed codes to your buyers (print on the
 * card, send by email, etc.). Each code is single-use.
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
const db = admin.firestore();

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, ...rest] = a.slice(2).split("=");
      flags[k] = rest.length ? rest.join("=") : true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip 0/O/1/I

function randomBlock(n) {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function makeCode(prefix) {
  return `${prefix}-${randomBlock(4)}-${randomBlock(4)}`;
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const count = parseInt(positional[0] || "1", 10);
  if (!Number.isFinite(count) || count <= 0 || count > 500) {
    console.error("count must be an integer between 1 and 500");
    process.exit(1);
  }
  const prefix = (flags.prefix || "MOTECH").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const note = flags.note || null;

  console.log(`Minting ${count} invite code(s) with prefix ${prefix}…\n`);

  const minted = [];
  for (let i = 0; i < count; i++) {
    let code;
    let ref;
    let snap;
    let attempts = 0;
    do {
      code = makeCode(prefix);
      ref = db.collection("inviteCodes").doc(code);
      snap = await ref.get();
      attempts++;
      if (attempts > 10) throw new Error("Couldn't generate a unique code");
    } while (snap.exists);

    await ref.set({
      claimedBy: null,
      claimedAt: null,
      note,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    minted.push(code);
    console.log(`  ${code}`);
  }

  console.log(`\nDone. Minted ${minted.length} code(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
