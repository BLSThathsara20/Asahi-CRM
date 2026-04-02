# Sanity schema (Asahi CRM)

This folder defines the **`lead`** document type for project **Asahi Motors** (`ts0jmi7u`), dataset **`production`**. 

- **`sanity.cli.js`** — CommonJS; `api.projectId` / `api.dataset` for the CLI.
- **`sanity.config.js`** — Studio config (CommonJS). Keep `projectId` / `dataset` in sync with `sanity.cli.js`.

1. Install: `npm install`
2. Log in to Sanity (once): `npx sanity login`
3. Deploy schema so the API accepts `lead` writes: `npx sanity schema deploy`

Optional: run `npm run studio` to open Sanity Studio locally and browse documents.

**CORS:** In Sanity → API → CORS origins, add the **origin only** (no path), e.g. `https://blsthathsara20.github.io` — not `/Asahi-CRM`.
