# Asahi CRM

Internal lead CRM: Firebase Google sign-in (allowed domains only), **Gmail labels** as the inbox (Autotrader / Car Dealer), **Sanity** for saved lead records, and a mobile-friendly UI (Vite, React, Tailwind, Framer Motion).

## Data flow

- **Gmail:** Messages under labels configured in `src/constants.js` (`GMAIL_LEAD_LABELS`) appear as lead cards.
- **Sanity:** **Save to Sanity** on a lead stores or updates a `lead` document keyed by **Gmail message ID** (plus subject, snippet, plain-text body, and CRM fields).

## Prerequisites

- Node.js 18+ (20+ recommended)
- Firebase project with **Google** sign-in
- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) enabled on the **same** Google Cloud project as Firebase
- OAuth consent scopes include at least  
  `https://www.googleapis.com/auth/gmail.readonly` and  
  `https://www.googleapis.com/auth/gmail.modify`  
  (add under **OAuth consent screen → Scopes**; Testing mode needs **Test users**.)
- A **Sanity** project, dataset (e.g. `production`), **Editor** API token, and **CORS** origins for `http://localhost:5173` and your production URL ([Sanity → Project → API](https://sanity.io/manage)).

### Sanity schema (once per project)

From the `studio/` folder:

```bash
cd studio && npm install && npx sanity login && npx sanity schema deploy
```

See `studio/README.md` for details. Without a deployed schema, writes may be rejected.

### Environment variables

Copy `.env.example` to `.env`. Required for the app:

- All `VITE_FIREBASE_*` values
- `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`, `VITE_SANITY_API_TOKEN`

**Treat `VITE_SANITY_API_TOKEN` like a password.** It is embedded in the client bundle (fine for a small internal tool; for public apps, use a server or token proxy). Never commit a real token.

Optional: `VITE_GEMINI_API_KEY`, `VITE_STAFF_FIRST_NAME` (see `.env.example`).

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Output: `dist/`. `vite.config.js` uses `GH_PAGES_BASE` for GitHub Pages.

## GitHub Pages

1. **Settings → Pages → Source:** GitHub Actions  
2. **Repository secrets** (same names as `.env`): Firebase vars, plus optional Gemini/staff; for CRM saves add:
   - `VITE_SANITY_PROJECT_ID`
   - `VITE_SANITY_DATASET` (e.g. `production`)
   - `VITE_SANITY_API_TOKEN`
3. Firebase **Authentication → Settings → Authorized domains:** add `yourname.github.io`

## Security notes

- `ALLOWED_EMAIL_DOMAINS` in `src/constants.js` gates sign-in.
- **Revoke any API token** that was pasted in chat, email, or a ticket; create a new token in Sanity and update `.env` / GitHub secrets only.
- The Google access token used for Gmail is stored in `localStorage` until expiry; users may need **Connect Gmail** again after scope changes.
