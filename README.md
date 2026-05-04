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

## Invite-Code Gating

Registration is gated by single-use invite codes so only people who buy a Mo
Tech card can claim a profile. Workflow:

1. **Mint codes** with the Admin SDK script:
   ```bash
   # one-time setup: download a service account key from
   # Firebase Console → Project settings → Service accounts → Generate new
   # private key, save as ./service-account.json (gitignored).
   npm install --no-save firebase-admin
   node scripts/mint-invite-codes.js 10
   # or with a note for tracking:
   node scripts/mint-invite-codes.js 1 --note="Order #123 / Salma's card"
   ```
   Each generated code is printed to stdout — print on the card or email it to
   the buyer.
2. **Buyer registers** at `/register`, enters their code, and either signs up
   with email/password or Google. The code is claimed in a transaction and
   becomes immutable; reusing it fails.
3. **Server-side enforcement** — `firestore.rules` only allows writes to
   `profiles/`, `links/`, and `usernames/` if the caller has a `users/{uid}`
   document, which is only created after a successful invite-code claim. So
   even a malicious user who creates an Auth account directly cannot write
   profile data without consuming a code.

Once claimed, codes cannot be unclaimed — to "transfer" a profile, the user
should change their username and the original code stays tied to their uid.

## License

MIT
