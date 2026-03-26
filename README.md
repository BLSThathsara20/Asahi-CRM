# Asahi CRM

Internal lead CRM for Asahi Motors: Google sign-in (company domains, super admin, and invited users), lead board backed by Google Sheets, and a mobile-friendly UI (Tailwind CSS, Framer Motion).

## Prerequisites

- Node.js 18+
- A Firebase project with **Google** sign-in enabled
- Google **Sheets API** enabled on the same Google Cloud project as Firebase
- The spreadsheet shared with each user who needs access (at least **Editor**), or owned by them

Spreadsheet: sheet named **All leads**, columns **Date, Name, Phone, Email, Car, Source, Status, Notes** (row 1 can be a header row).

## Firebase and Google Sheets setup

1. Create a Firebase project and add a **Web** app. Copy the config into `.env` (see `.env.example`).

2. In Firebase **Authentication → Sign-in method**, enable **Google**.

3. In Firebase **Build → Firestore Database**, create a database (production mode is fine once rules are deployed). The app uses collection **`crmExtraAllowedUsers`** for invited emails (see security rules below).

4. In [Google Cloud Console](https://console.cloud.google.com/) select the **same project** as Firebase (e.g. `asahi-crm`), then:

   - Enable **Google Sheets API** (direct link for that API: [Enable Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com) — pick your project in the header if asked).
   - **APIs & Services → OAuth consent screen**: add the scope  
     `https://www.googleapis.com/auth/spreadsheets`  
     (or use “manually add scopes” if needed).

5. Under **Authentication → Settings → Authorized domains**, add your production host (e.g. `yourname.github.io`) when you deploy.

6. Deploy Firestore rules so the super admin can manage invites: either paste the contents of **`firestore.rules`** into **Firestore → Rules** in the Firebase Console, or run `firebase deploy --only firestore:rules` from a project with `firebase.json` pointing at that rules file. The rules allow **`sales@asahigroup.co.uk`** to create/delete documents in **`crmExtraAllowedUsers`**; any signed-in user can read that collection (the app still enforces access at sign-in).

7. Copy `.env.example` to `.env`, fill in all `VITE_FIREBASE_*` values, then restart `npm run dev`.

## Local development

```bash
npm install
npm run dev
```

## Production build (local)

```bash
npm run build
```

Output is in `dist/`. Production builds use `base: "/Asahi-CRM/"` in `vite.config.js` (must match the GitHub repo name; see `GH_PAGES_BASE`).

## Publish on GitHub Pages

1. Create a repository on GitHub. For this project the site is `https://blsthathsara20.github.io/Asahi-CRM/` (pattern: `https://<username>.github.io/<repo>/`).

2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.

3. In **Settings → Secrets and variables → Actions → New repository secret**, add these (same values as in your local `.env`):

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

4. Push the `main` branch (or `master`). The workflow `.github/workflows/deploy-pages.yml` builds and deploys automatically.

5. In **Firebase Console → Authentication → Settings → Authorized domains**, add:

   - `your-username.github.io` (no `https://`, no path)

6. After the first deploy, wait a minute and open `https://blsthathsara20.github.io/Asahi-CRM/`.

### Update the live site

Push any commit to `main` (or `master`). The workflow runs again and replaces the published site.

### If your repository name differs

Edit `GH_PAGES_BASE` in `vite.config.js` to `"/<your-repo-name>/"` (leading/trailing slashes as in the example) and push again.

## Security notes

- Sign-in is allowed if the Google account is on `ALLOWED_EMAIL_DOMAINS` (`src/constants.js`), is the super admin (`SUPER_ADMIN_EMAILS`, default `sales@asahigroup.co.uk`), or has a document in Firestore **`crmExtraAllowedUsers`** whose document ID is their email in lowercase. The super admin can add/remove those invites from **Manage access** (users icon) after signing in.
- Others see **Access denied** and are signed out.
- Environment variables are embedded in the client bundle; restrict Firebase and OAuth usage with authorized domains and Firebase security rules as appropriate.
- The Google OAuth token is stored in `localStorage` for Sheets access until it expires; users may be prompted to re-authenticate when it expires.
