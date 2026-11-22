# Drivwon

Geelong-based digital studio website and private operations workspace.

## Architecture

- `client/src/features/cms` — public Sanity client, page rendering, page metadata and Studio link.
- `client/src/features/blog` — published blog index and article pages.
- `client/src/features/admin` — password-gated private operations dashboard at `/drivwon/der`.
- `client/src/features/chatbot` — public FAQ-matching assistant; it does not send visitor messages to an AI service.
- `client/src/components/layout` — shared public header and footer.
- `client/src/styles` — design tokens, base/accessibility rules and small shared utilities. `client/src/index.css` is the Tailwind v4 entrypoint.
- `sanity/` — editable page, landing-page, blog-post, FAQ, site-settings, SEO and content-block schemas.
- `server/features` — private password sessions, optional Google Drive OAuth, and protected project, invoice, update, analytics and Drive APIs.
- `shared/schema.ts` and `migrations/` — Postgres types, input validation and initial operations tables.

## Sanity CMS (pages, landing pages, blog, SEO, leads)

Every public page is built from Sanity. The old hand-coded pages are only used as a fallback until a Sanity document with the same slug is published. Editor guide: [`docs/CMS-GUIDE.md`](docs/CMS-GUIDE.md).

**Content types:** Site settings (brand, NAP, menu, footer, analytics IDs, verification codes, AI crawler rules), Pages, Landing pages, Services (`/services/<slug>`), Locations (`/locations/<slug>`), Case studies (`/projects/<slug>`), Blog posts, Categories (`/blog/category/<slug>`), Authors (`/authors/<slug>`), Testimonials, FAQs (also feed the chatbot), Lead forms, Leads, Saved (reusable) sections and Redirects.

**Page builder:** 24 section types — hero, quick answer (AEO), rich text, image + text, media/gallery/video, cards, stats, process (optional HowTo schema), services, case studies, results highlight, testimonials, logos, pricing (Offer schema), FAQ (FAQPage schema), comparison table, CTA, lead form, contact + map, areas served, team, blog posts, quote, embed and saved sections. Every section has anchor, background, spacing, width, alignment, animation and hide controls.

**SEO / AEO / GEO fields on every page:** focus + related keywords, search intent, SEO title/description with a live Google preview and checklist in Studio, breadcrumb label, social title/description/image, quick answer, key facts, about/mentions entities (Wikipedia/Wikidata), audience, sources/citations, llms.txt inclusion, speakable, schema type override, area served, extra JSON-LD, noindex/nofollow/noarchive/nosnippet/noimageindex, max-snippet, max-image-preview, unavailable-after, canonical, sitemap exclude/priority/frequency and hreflang alternates.

**Server-side SEO (`server/seo/`, `shared/seo/`):** every HTML request gets its full head (title, meta, robots, canonical, hreflang, Open Graph, Twitter, article tags, geo tags, verification codes) and a linked JSON-LD `@graph` (ProfessionalService/Organization with NAP, areas, founder and ACN; WebSite; WebPage type; BreadcrumbList; Service + Offer; BlogPosting + Person (E-E-A-T); FAQPage; HowTo; VideoObject; ItemList; ProfilePage). The CMS content is also rendered as plain semantic HTML inside `#root`, because most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not run JavaScript. Missing pages return a real 404, uppercase/trailing-slash URLs 301, CMS redirects 301/302, and a CMS outage returns 503 so Google does not drop pages.

Feeds: `/sitemap.xml` (with images, noindex/expired/canonicalised pages removed), `/robots.txt` (AI bot blocks are editable), `/llms.txt`, `/rss.xml`, and `/<IndexNow key>.txt`.

**Analytics & lead tracking:** GA4, GTM, Google Ads (with enhanced conversions), Meta Pixel, Microsoft Clarity, LinkedIn and TikTok are loaded from Site settings, with optional Google Consent Mode v2 banner. SPA page views, CTA clicks (`data-track`), phone/email/outbound clicks, scroll depth, form starts and `generate_lead` conversions are tracked. First- and last-touch UTMs, click IDs (gclid, fbclid, msclkid…), landing page, referrer, device and visit count are saved with every lead. Leads are stored in Sanity as **private** documents (`leads.<uuid>` — IDs with a dot are never readable without a token, even in a public dataset), auto-classified by channel (Paid search, Organic search, AI assistant, Google Business Profile…), and shown in Studio → Leads with a pipeline status. Optional email (Resend) and webhook (Zapier/Make/CRM) alerts.

### Set up

1. `npm install`
2. Deploy the Studio: `npm run sanity:deploy` (host name `drivwon` → https://drivwon.sanity.studio). Set `VITE_SANITY_STUDIO_URL` to that URL.
3. In sanity.io/manage → API → Tokens, create an **Editor** token. Use it once to seed: `SANITY_WRITE_TOKEN=… npm run sanity:seed` (creates **drafts only**; add `--publish` to publish, `--force` to overwrite). Never commit the token.
4. Create a second Editor token for the website server and save it as `SANITY_LEADS_TOKEN` in Vercel / Replit secrets so leads can be stored.
5. In Studio, search for `[CHECK]`, fix every item (phone number, case study results, location copy, cover images), then publish.
6. In Site settings add GA4 / GTM / Ads / Clarity IDs, Search Console and Bing verification codes, social profile URLs and your Google Business Profile URL.
7. Submit `https://drivwon.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

### Test

`npm run test:seo` builds a dry-run dataset and runs every GROQ query offline (groq-js), then checks titles, H1s, robots, canonicals, JSON-LD, status codes, redirects, feeds and that leads never leak. `npm run sanity:validate` validates the schema.

### Deploy

Vercel: `vercel.json` serves static assets first and sends every other route to `api/site.ts` (server-side SEO) and `/api/leads` to `api/leads.ts`. Express (`npm run build && npm run start`) uses the same handlers. Env vars: `APP_URL`, `SANITY_LEADS_TOKEN`, and optionally `RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL`, `LEAD_FROM_EMAIL`, `LEAD_WEBHOOK_URL`.

## Private workspace setup

The private dashboard is at `/drivwon/der`; it is not linked in the public navigation or footer, excluded from the sitemap, and returned with `noindex` headers. The old `/dashboard` path returns 404. The URL is unlisted, not a secret: every workspace API also checks the server session. The password is read only from the server-side `DRIVWON_ADMIN_PASSWORD` secret (minimum 16 characters), compared in constant time after scrypt, and login attempts are rate-limited. Changing the password invalidates existing sessions. Sessions are Postgres-backed, `httpOnly`, `SameSite=Lax`, secure in production, and expire after eight hours.

Google OAuth is only for connecting Drive after password sign-in. Drive is optional; if enabled, restrict Google OAuth to approved team email addresses and the app encrypts stored Drive credentials with `SESSION_SECRET`.

Set these values in Replit Secrets or the app host's server environment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Long random session/encryption secret; keep it server-only |
| `DRIVWON_ADMIN_PASSWORD` | Private workspace password; use a unique password of at least 16 characters |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth web client, only for Drive |
| `GOOGLE_REDIRECT_URI` | Exact optional OAuth callback URL, e.g. `https://drivwon.com/api/auth/google/callback` |
| `GOOGLE_ALLOWED_EMAILS` | Comma-separated approved Drive accounts; use the narrowest allowlist |
| `APP_URL` | Canonical production origin |
| `VITE_GOOGLE_PICKER_API_KEY` | Optional public browser key, restricted to the website origin and Google Picker API |
| `VITE_SANITY_STUDIO_URL` | Hosted Studio origin |
| `SANITY_WRITE_TOKEN` | Temporary server-side secret used only when running the CMS seed script |
| `SANITY_LEADS_TOKEN` | Server-side Editor token used to save form leads as private Sanity documents |
| `RESEND_API_KEY` / `LEAD_NOTIFY_EMAIL` / `LEAD_FROM_EMAIL` | Optional email alert for every new lead |
| `LEAD_WEBHOOK_URL` | Optional webhook (Zapier, Make, CRM) that receives every lead as JSON |

For optional Drive uploads, configure a Google OAuth app, add the exact callback URL, and enable the Google Drive API and Google Picker API. The app requests `drive.file`, not full-Drive access. After the admin password login, an approved Google account connects Drive and selects the shared company folder in **Documents**; it must already have permission to add files to it. Uploads create project and invoice subfolders there. The database stores file metadata and Drive links, not the uploaded file bytes. There is no local-storage fallback if Drive is unavailable.

Apply the database migration once:

```sh
psql "$DATABASE_URL" -f migrations/0001_drivwon_operations.sql
```

The dashboard includes project progress, monthly SEO/social/web updates, invoice and paid-receipt printing, project-linked Drive documents, and basic paid/outstanding totals. It does not email invoices, determine GST treatment, or replace accounting software; tax is entered manually and should be verified with your accountant.

## Run locally in VS Code

Needs Node.js 20 or newer.

1. Open the folder in VS Code and install the recommended extensions when asked.
2. Terminal → Run Task → **1. Setup** (copies `.env.sample` to `.env` and runs `npm install`). Or run `npm run setup`.
3. Open `.env`. The Sanity project ID `v6luawxh` is already filled in. Add `SANITY_LEADS_TOKEN` if you want form leads saved.
4. In https://www.sanity.io/manage/project/v6luawxh/api → **CORS origins**, add `http://localhost:5173` (no credentials) and `http://localhost:3333` (allow credentials). Without this the browser cannot load CMS content locally.
5. Terminal → Run Task → **Run website + Studio together**. Website: http://localhost:5173 · Studio: http://localhost:3333
6. To debug the server, press F5 (**Debug website server**).

The private dashboard needs `DATABASE_URL`; leave it empty and the dashboard is simply off.

## Run and deploy

```sh
npm install
npm run check
npm run dev
```

For a server-backed production deployment, run `npm run build` and `npm run start` with the environment above. The repository's current Replit deployment target is **static**, which cannot serve the Express password login, session, Postgres or Drive APIs. Switch the deployment to a server-capable target and set its run command to `npm run start` before enabling `/drivwon/der`. The existing Replit run workflow also starts the client-only command; use `npm run dev` to run the Express/Vite development server.

Never commit `.env` files, Google credentials, session secrets or Sanity write tokens. `.env.sample` contains names and placeholders only.
