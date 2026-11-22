# Drivwon local SEO review — Geelong (22 Nov 2026)

Scope: drivwon.com codebase, seeded CMS content and a public SERP check for Geelong agency searches. No ranking or Local Pack placement is promised.

## Evidence

- Live drivwon.com could not be fetched from the build environment. Search for “drivwon Geelong” returned **no results for the business** — the brand entity is not yet known to Google or AI engines.
- Search for “SEO agency Geelong” and “web design Geelong” is dominated by established agencies (Sixgun, WP Creative, Safari Digital, Zib Digital, Supple, Kia Ora Digital, Chromatix, Sitecentre) plus directories (Bark, Oneflare, Airtasker). At least one competitor (Paperstack) already markets AI-search (GEO) tracking.
- Keyword volumes: **unavailable** — the OpenSEO account had no credits. Keyword targets below are based on SERP evidence and intent, not measured demand. Re-check with real volumes before writing more pages.

## Problems found in the old site (fixed in this branch)

| Problem | Impact | Fix |
| --- | --- | --- |
| Static SPA on Vercel: `sitemap.xml` and `robots.txt` routes only existed in Express, so on Vercel they returned the HTML app | Google could not read the sitemap | Vercel function `api/site.ts` serves real XML/text feeds |
| Titles/meta only set by JavaScript on Vercel | Bing, social previews and most AI crawlers saw the same tags on every page | Server-rendered head on every request |
| Page content only rendered by JavaScript | GPTBot, ClaudeBot and PerplexityBot (no JS) saw an empty page | Crawler-visible semantic HTML of the CMS content |
| Unknown URLs returned 200 | Soft-404s | Real 404 + noindex |
| Placeholder project descriptions (e.g. a cleaning company described as a “blockchain identity system”) | Destroys trust (E-E-A-T) and confuses AI engines | Replaced with neutral, true text marked `[CHECK]` |
| Unverifiable stats (“50+ projects”, “24/7 support”) for a company founded Aug 2026 | Trust / accuracy risk | Removed from seeded content |
| Privacy page listed `hello@Drivwon.com`, rest of site uses `info@drivwon.com` | Inconsistent entity data | Unified to info@drivwon.com |
| Studio could not build (`styled-components` missing, React 19.3/19.2 mismatch, Tailwind PostCSS leaking) | `sanity deploy` failed | Fixed |

## Entity / NAP facts (seeded — confirm before publishing)

| Field | Value | Status |
| --- | --- | --- |
| Name | Drivwon | ✓ |
| Legal name | Drivwon Pty Ltd | **[CHECK]** exact ASIC name |
| ACN | 701 664 360 | ✓ |
| Phone | 0474 817 548 | ✓ Confirmed. Use this exact number on the website, Google Business Profile, quotes/invoices and every directory |
| Email | info@drivwon.com | ✓ |
| Address | Geelong VIC 3220, street hidden (service-area business) | **[CHECK]** if you have a staffed office, show it |
| Hours | not set | **[CHECK]** add real hours |
| Founded | August 2026 | ✓ |
| Social / GBP URLs | not set | **[CHECK]** add every real profile |

## Query → page map (one page per intent, no cannibalisation)

| Target | Page |
| --- | --- |
| seo geelong, seo agency/company/services geelong, local seo geelong | `/services/seo-geelong` |
| web design geelong, website design/developer geelong | `/services/web-design-geelong` (home also targets the brand + “web design geelong” as secondary) |
| ai search optimisation, generative engine optimisation, chatgpt seo | `/services/ai-search-optimisation` |
| ecommerce / shopify / woocommerce geelong | `/services/ecommerce-development` |
| ai automation geelong, ai agency geelong | `/services/ai-automation` |
| app development geelong | `/services/app-development` |
| web design/seo torquay, surf coast | `/locations/web-design-seo-torquay-surf-coast` |
| web design/seo bellarine, ocean grove, drysdale | `/locations/web-design-seo-bellarine-peninsula` |
| web design/seo armstrong creek, waurn ponds | `/locations/web-design-seo-armstrong-creek` |
| website cost geelong | `/blog/website-cost-geelong` |
| what is geo | `/blog/what-is-generative-engine-optimisation` |
| local seo checklist | `/blog/local-seo-checklist-geelong` |

No `/locations/geelong` page on purpose: it would compete with the two main Geelong service pages.

## Positioning

Do not compete as “another SEO agency”. Defensible angle: **developers and AI engineers who do SEO, websites and GEO in-house, month to month, in Geelong**. The credentials (Master of Applied AI, Deakin; AWS Solutions Architect) are real proof — they are on the author page and in Person schema.

## Off-site work the CMS cannot do (owner: Sahil)

1. Create/verify the **Google Business Profile** (service-area business, category “Website designer” or “Internet marketing service”), same NAP as the website.
2. **Bing Places** and **Apple Business Connect** (Bing feeds ChatGPT search and Copilot).
3. Consistent listings: True Local, Yellow Pages, Hotfrog, Clutch, LinkedIn company page, Geelong Chamber of Commerce.
4. Ask every past client for a Google review and permission to publish a case study with real numbers.
5. Earn local mentions: Geelong Chamber, Deakin alumni, local news/podcasts, sponsoring a local club.
6. Track a fixed set of AI prompts monthly (e.g. “best web designer in Geelong”, “SEO agency Geelong recommendations”) and GA4 AI referrals.

## Verification after deploy

- `curl -A GPTBot https://drivwon.com/services/seo-geelong` → content and JSON-LD present
- Google Rich Results Test + Schema Markup Validator on home, one service, one post
- Search Console: submit sitemap, URL-inspect the 5 key pages
- PageSpeed Insights (mobile) on home and one service page

Rollback: revert the branch; Sanity content can stay (the old pages ignore new fields).
