# Mo Tech — NFC Portfolio SaaS

> Tap. Share. Impress.

A full-stack NFC portfolio SaaS — like Linktree for NFC business cards. Create a personalized digital profile, share it with a single tap, and track engagement with built-in analytics.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage, Hosting)
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Icons:** react-icons, lucide-react
- **QR Code:** qrcode.react
- **Toasts:** react-hot-toast

## Features

- Email/password + Google OAuth authentication
- Personalized profile with avatar, name, title, bio
- Username uniqueness checks with reserved word protection
- Drag-to-reorder links (14+ platforms supported)
- 4 theme presets + full custom theming (colors, fonts, card styles)
- Analytics dashboard with 30-day view chart + click tracking
- Public NFC-tap profile page with glassmorphism design
- QR code generation for profile URL
- Save Contact (.vcf download) from public profile
- Web Share API + clipboard fallback
- Skeleton loaders on all data-fetch states
- Confirm dialogs before destructive actions
- Toast notifications for all actions

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/mo2009/Moustafa-Elboghdady-site.git
cd Moustafa-Elboghdady-site
npm install
```

### 2. Firebase Project

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password + Google
3. Create a **Firestore Database**
4. Enable **Storage**

### 3. Environment Variables

```bash
cp .env.example .env
```

Fill in your Firebase config values in `.env`:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firebase Rules & Indexes

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build & Deploy

```bash
npm run build
firebase deploy --only hosting
```

## Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | User account metadata |
| `profiles/{uid}` | Profile data (name, bio, theme, etc.) |
| `links/{linkId}` | User's links with platform, URL, order |
| `pageViews/{id}` | Public profile page view logs |
| `linkClicks/{id}` | Link click tracking |
| `usernames/{username}` | Username → UID mapping for uniqueness |
| `inviteCodes/{code}` | Single-use registration codes (gated signup) |
| `admins/{uid}` | Presence-only admin role (manage invite codes) |

## Invite-Code Gating

Registration is gated by single-use invite codes so only people who buy a Mo
Tech card can claim a profile. Day-to-day, manage codes from the **admin
page** at `/admin/codes` (linked in your dashboard user menu once you're an
admin). It lets you mint up to 100 codes at a time, copy them to the
clipboard, see who's claimed which, and delete unclaimed codes.

### Bootstrapping the first admin

Admins are tracked in the `admins/{uid}` collection — presence in this
collection is the role. The very first admin has to be granted via the
Admin SDK because Firestore rules don't let anyone self-promote:

```bash
# one-time setup: download a service account key from
# Firebase Console → Project settings → Service accounts → Generate new
# private key, save as ./service-account.json (gitignored).
npm install --no-save firebase-admin

# Grant admin to a user (look up their uid in Firebase Console →
# Authentication → Users; or pass --email):
node scripts/grant-admin.cjs --email=you@example.com
# Or revoke:
node scripts/grant-admin.cjs --uid=AAAA1234... --revoke
```

Once your account is an admin, the "Invite codes" link appears in your
dashboard user menu and you can mint/manage codes through the UI.

### Generating codes via CLI (alternative)

The original `mint-invite-codes.cjs` script still works if you'd rather mint
in bulk from a terminal:

```bash
node scripts/mint-invite-codes.cjs 10
node scripts/mint-invite-codes.cjs 1 --note="Order #123 / Salma's card"
```

> **Why `.cjs`?** The repo is an ESM project (`"type": "module"` in
> `package.json`), so plain `.js` files would be parsed as ESM and break
> `require()`. `.cjs` keeps these scripts CommonJS without converting the
> rest of the project.

### How registration works

1. Buyer goes to `/register`, enters their code, and either signs up with
   email/password or Google. The code is claimed in a transaction and
   becomes immutable; reusing it fails.
2. **Server-side enforcement** — `firestore.rules` only allows writes to
   `profiles/`, `links/`, and `usernames/` if the caller has a `users/{uid}`
   document, which is only created after a successful invite-code claim. So
   even a malicious user who creates an Auth account directly cannot write
   profile data without consuming a code.
3. Admin-only operations: `inviteCodes` `list`, `create`, and `delete` are
   all gated on `isAdmin()` (presence in `admins/{uid}`). Single-doc reads
   stay public so the registration form can still verify a code.

Once claimed, codes cannot be unclaimed — to "transfer" a profile, the user
should change their username and the original code stays tied to their uid.

## License

MIT
