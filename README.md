# Asahi CRM

Internal **sales lead CRM** for **Asahi Motors London**, a UK car dealership. Staff use it to turn **Gmail enquiries** (Autotrader, website, car dealer labels) into **tracked leads**, sync them to **Sanity** as the system of record, and run the pipeline on mobile-friendly **React + Vite** UI.

---

## Why I built it

**Problem:** Enquiry mail arrived in shared inboxes with no single place to see **who was contacted**, **what stage** a lead was in, or **which messages still needed action**. Spreadsheets and ad-hoc labels did not scale.

**What this app does:**

- **Gmail as the intake:** Configurable **user labels** map to lead sources (e.g. Autotrader, Website). The app lists those threads alongside **manual / showroom** leads stored only in the CRM.
- **Sanity as the CRM database:** Saving a lead writes a `lead` document (keyed by Gmail message ID where applicable), with status, notes, follow-up, and optional **“mark done”** tracking synced from Gmail + CRM.
- **Access control:** Firebase **email/password** (and optional Google linking for Gmail API), **domain allowlists**, and **Sanity-backed roles** (Team / superadmin) so only approved staff reach the dashboard.
- **UX for a busy forecourt:** Pipeline KPIs, filters, **colour-coded rows** (new today, pending sync, marked done), pagination, and lead detail with Autotrader parsing helpers where emails follow a standard format.

---

## Tech stack

| Area | Choice |
|------|--------|
| Front-end | React 18, Vite, Tailwind CSS, Framer Motion |
| Auth | Firebase Authentication |
| Data | Sanity (structured content / lead documents) |
| Integrations | Gmail API (labels, read, modify), optional Google Gemini for drafts |

---

## Local development

**Prerequisites:** Node.js 18+ (20+ recommended).

```bash
npm install
cp .env.example .env   # fill in real values — never commit .env
npm run dev
```

See **Environment variables** below and `.env.example` for every key.

---

## Environment variables

Vite only exposes variables that are **prefixed with `VITE_`**. They are read from **`import.meta.env`** and are **inlined at build time** — they are not read from a `.env` file in the browser after deploy.

**Required for a working app:**

- All **`VITE_FIREBASE_*`** keys (see Firebase console → Project settings → Your apps)
- **`VITE_SANITY_PROJECT_ID`**, **`VITE_SANITY_DATASET`**, **`VITE_SANITY_API_TOKEN`** (Sanity project → API; use an Editor token for this internal tool; add CORS origins for localhost and production)

**Optional:** `VITE_GEMINI_API_KEY`, `VITE_STAFF_FIRST_NAME`, `VITE_SUPERADMIN_EMAILS` — see `.env.example`.

**Security:** Treat `VITE_SANITY_API_TOKEN` like a password. It ships in the client bundle (acceptable for a small internal deployment; for a fully public site you would proxy through a backend). Do not commit real values.

---

## Why it works locally but shows “configuration” on GitHub Pages

**Locally:** You have a `.env` file. When you run `npm run dev` or `npm run build`, Vite loads those values and bakes them into the app.

**On GitHub Pages:** There is **no `.env` file** in the repo (and there should not be). The hosted site is whatever was produced the last time **GitHub Actions** ran `npm run build`. That build only sees variables you **explicitly pass** in the workflow file (`.github/workflows/deploy-pages.yml`) from **Repository secrets**.

So if production shows missing config:

1. **Secrets are missing or empty** in **Settings → Secrets and variables → Actions** for this repository.
2. **Names must match exactly** — e.g. this project expects `VITE_SANITY_API_TOKEN`. A secret named `VITE_SANITY_TOKEN` will **not** be picked up unless the workflow maps it (it does not).
3. After adding or fixing secrets, **re-run the workflow** (push a commit or use “Re-run jobs”) so a **new** build embeds the values.
4. **Firebase authorized domains:** add `yourname.github.io` under Authentication → Settings → Authorized domains.

This is normal for static hosting: **environment is fixed at build time**, not at runtime.

---

## Production build & deploy

```bash
npm run build
```

Output: `dist/`. `vite.config.js` can set `base` for GitHub Pages (e.g. repository subpath).

### GitHub Pages (this repo)

1. **Settings → Pages → Build and deployment:** source **GitHub Actions**.
2. Add **repository secrets** with the **same names** as in `.env` (see workflow file for the exact list).
3. Push to `main` / `master` to trigger deploy.

---

## Sanity schema

Deploy the schema once so writes are accepted:

```bash
cd studio && npm install && npx sanity login && npx sanity schema deploy
```

See `studio/README.md` for details.

---

## Data flow (short)

- **Gmail:** Messages under labels in `src/constants.js` (`GMAIL_LEAD_LABELS`) appear as pipeline rows.
- **Sanity:** **Save & sync** upserts a `lead` document; Gmail threads are keyed by **message id** where applicable.
- **Company email:** Full Gmail sync; other accounts see CRM-saved leads only (see app behaviour and `resolveUserAccess`).

---

## Security notes

- `ALLOWED_EMAIL_DOMAINS` and related helpers in `src/constants.js` gate who can sign in.
- Rotate any token that was exposed; update `.env` and GitHub secrets only.
- Gmail access tokens are stored in `localStorage` until expiry; users may need **Connect Gmail** again after OAuth scope changes.

---

## License

Private / internal use unless the organisation decides otherwise.
