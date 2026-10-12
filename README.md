# Drivwon

Geelong-based digital studio website and private operations workspace.

## Architecture

- `client/src/features/cms` — public Sanity client, page rendering, page metadata and Studio link.
- `client/src/features/blog` — published blog index and article pages.
- `client/src/features/admin` — private Google Workspace login and operations dashboard.
- `client/src/features/chatbot` — public FAQ-matching assistant; it does not send visitor messages to an AI service.
- `client/src/components/layout` — shared public header and footer.
- `client/src/styles` — design tokens, base/accessibility rules and small shared utilities. `client/src/index.css` is the Tailwind v4 entrypoint.
- `sanity/` — editable page, landing-page, blog-post, FAQ, site-settings, SEO and content-block schemas.
- `server/features` — Google OAuth/session handling and private project, invoice, update, analytics and Drive APIs.
- `shared/schema.ts` and `migrations/` — Postgres types, input validation and initial operations tables.

## Sanity CMS

The Studio is hosted separately from the public Vite app. Public pages query published Sanity content without a write token; the Studio requires an approved Sanity account.

1. Confirm that project `v6luawxh` has a **public-read** `production` dataset and that your Sanity account can manage the project.
2. From the repository, run `npm install`, then `npm run sanity:deploy`. Sign in to Sanity and choose the Studio hostname. Set `VITE_SANITY_STUDIO_URL` to that URL before building the website.
3. Publish a `Site settings` document and `Page` documents for the existing slugs `home`, `about`, `services`, `projects`, `contact`, `quotation`, and `privacy-policy`. A published page replaces the legacy page at that route. Existing legacy copy remains as a fallback until it is migrated.
4. To create a landing page, publish another `Page` with a unique single-segment slug. Add sections, images/video URLs, buttons, FAQs and SEO fields in Studio; its public route is `/<slug>`. Routes such as `/blog`, `/dashboard` and `/studio` are reserved.
5. Publish `Post` documents to create blog articles. Only published posts appear on `/blog`, in article metadata and in the sitemap. Maintain the FAQ entries to update chatbot answers.

SEO fields include title and description, canonical URL, index/no-index, social title/description/image, focus keywords and custom JSON-LD. The server injects page metadata into the initial HTML for search and social crawlers, reads site-wide defaults and Search Console verification from Site settings, emits organization/article JSON-LD, and serves `robots.txt` and a Sanity-aware `sitemap.xml`. Set `APP_URL` to the exact production origin. Review custom canonical URLs, structured data, image alt text and Search Console verification before publishing.

Public published-content reads and Sanity's account login for Studio do not require a write token in this app. Never commit Sanity write tokens; revoke and replace any token that has been exposed.

## Private workspace setup

The dashboard is at `/dashboard`. Google OAuth email verification is combined with an explicit server-side allowlist; only approved accounts can access client, invoice and document records. The private app uses Postgres-backed sessions and encrypts the stored Google Drive OAuth credentials with `SESSION_SECRET`.

Set these values in Replit Secrets or the app host's server environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Long random session/encryption secret; keep it server-only |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client |
| `GOOGLE_REDIRECT_URI` | Exact OAuth redirect URL, e.g. `https://drivwon.com/api/auth/google/callback` |
| `GOOGLE_ALLOWED_EMAILS` | Comma-separated team accounts; use the narrowest allowlist |
| `APP_URL` | Canonical production origin |
| `VITE_GOOGLE_PICKER_API_KEY` | Public browser key, restricted to the website origin and Google Picker API |
| `VITE_SANITY_STUDIO_URL` | Hosted Studio origin |

In Google Cloud, configure an internal Workspace OAuth app, add the exact callback URL, and enable the Google Drive API and Google Picker API. The app requests `drive.file`, not full-Drive access. Every approved team member signs in and selects the shared company folder once in **Documents**; they must already have permission to add files to it. Uploads create project and invoice subfolders there. The database stores file metadata and Drive links, not the uploaded file bytes. There is no local-storage fallback if Drive is unavailable.

Apply the database migration once:

```sh
psql "$DATABASE_URL" -f migrations/0001_drivwon_operations.sql
```

The dashboard includes project progress, monthly SEO/social/web updates, invoice and paid-receipt printing, project-linked Drive documents, and basic paid/outstanding totals. It does not email invoices, determine GST treatment, or replace accounting software; tax is entered manually and should be verified with your accountant.

## Run and deploy

```sh
npm install
npm run check
npm run dev
```

For a server-backed production deployment, run `npm run build` and `npm run start` with the environment above. The repository's current Replit deployment target is **static**, which cannot serve the Express OAuth, session, Postgres or Drive APIs. Switch the deployment to a server-capable target and set its run command to `npm run start` before enabling `/dashboard`. The existing Replit run workflow also starts the client-only command; use `npm run dev` to run the Express/Vite development server.

Never commit `.env` files, Google credentials, session secrets or Sanity write tokens. `.env.example` contains names and placeholders only.
