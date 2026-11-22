import { defineArrayMember, defineField, defineType } from "sanity";
import { CogIcon } from "../../lib/icons";
import { imageField } from "../../lib/fields";

const aiBots = [
  { title: "OpenAI GPTBot (training)", value: "GPTBot" },
  { title: "OpenAI OAI-SearchBot (ChatGPT search)", value: "OAI-SearchBot" },
  { title: "ChatGPT-User (live browsing)", value: "ChatGPT-User" },
  { title: "Anthropic ClaudeBot (training)", value: "ClaudeBot" },
  { title: "Claude-SearchBot", value: "Claude-SearchBot" },
  { title: "Claude-User (live browsing)", value: "Claude-User" },
  { title: "PerplexityBot", value: "PerplexityBot" },
  { title: "Perplexity-User", value: "Perplexity-User" },
  { title: "Google-Extended (Gemini training)", value: "Google-Extended" },
  { title: "Applebot-Extended", value: "Applebot-Extended" },
  { title: "Meta-ExternalAgent", value: "meta-externalagent" },
  { title: "Bytespider (TikTok)", value: "Bytespider" },
  { title: "CCBot (Common Crawl)", value: "CCBot" },
  { title: "Amazonbot", value: "Amazonbot" },
  { title: "DuckAssistBot", value: "DuckAssistBot" },
  { title: "MistralAI-User", value: "MistralAI-User" },
];

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "brand", title: "Brand", default: true },
    { name: "business", title: "Business & local SEO" },
    { name: "header", title: "Header" },
    { name: "footer", title: "Footer" },
    { name: "seo", title: "Default SEO" },
    { name: "analytics", title: "Analytics & tracking" },
    { name: "verification", title: "Search console verification" },
    { name: "crawlers", title: "Robots & AI crawlers" },
    { name: "leads", title: "Leads & forms" },
  ],
  fields: [
    // Brand
    defineField({ name: "siteName", title: "Brand name", type: "string", group: "brand", initialValue: "Drivwon", validation: (rule) => rule.required() }),
    defineField({ name: "tagline", title: "Tagline", type: "string", group: "brand" }),
    defineField({ name: "siteUrl", title: "Website URL", type: "url", group: "brand", initialValue: "https://drivwon.com", description: "Exact live origin, no trailing slash. Used for canonicals, sitemap and schema." }),
    imageField("logo", "Logo", { group: "brand" }),
    defineField({ name: "logoSquare", title: "Square logo (min 112×112)", type: "image", group: "brand", description: "Used in Organization schema — Google shows it in search and Knowledge Panels." }),
    defineField({ name: "favicon", title: "Favicon (PNG 512×512)", type: "image", group: "brand" }),
    defineField({ name: "themeColor", title: "Theme colour", type: "string", group: "brand", initialValue: "#09090b" }),
    defineField({ name: "description", title: "One-line business description", type: "text", rows: 2, group: "brand", description: "Plain, factual sentence: who you are, what you do, where. AI engines reuse this. e.g. “Drivwon is a Geelong web design, SEO and AI automation studio.”" }),
    defineField({ name: "longDescription", title: "About the business (for AI engines)", type: "text", rows: 6, group: "brand", description: "Used at the top of llms.txt and in Organization schema. Facts only." }),

    // Business
    defineField({ name: "legalName", title: "Legal name", type: "string", group: "business" }),
    defineField({ name: "businessType", title: "Schema business type", type: "string", group: "business", initialValue: "ProfessionalService", options: { list: ["ProfessionalService", "LocalBusiness", "Organization", "OnlineBusiness"] } }),
    defineField({ name: "acn", title: "ACN", type: "string", group: "business" }),
    defineField({ name: "abn", title: "ABN", type: "string", group: "business" }),
    defineField({ name: "foundingDate", title: "Founded", type: "date", group: "business" }),
    defineField({ name: "founders", title: "Founders", type: "array", group: "business", of: [defineArrayMember({ type: "reference", to: [{ type: "author" }] })] }),
    defineField({ name: "email", title: "Email", type: "string", group: "business" }),
    defineField({ name: "phone", title: "Phone (display)", type: "string", group: "business", description: "Must match your Google Business Profile EXACTLY. Same name, address and phone everywhere (NAP consistency) is a key local ranking factor." }),
    defineField({ name: "phoneE164", title: "Phone (international, e.g. +61474817548)", type: "string", group: "business" }),
    defineField({ name: "showAddress", title: "Show street address publicly", type: "boolean", group: "business", initialValue: false, description: "Turn off if you are a service-area business working from home. Google requires you hide the address on your Business Profile in that case." }),
    defineField({ name: "streetAddress", title: "Street address", type: "string", group: "business" }),
    defineField({ name: "addressLocality", title: "Suburb / city", type: "string", group: "business", initialValue: "Geelong" }),
    defineField({ name: "addressRegion", title: "State", type: "string", group: "business", initialValue: "VIC" }),
    defineField({ name: "postalCode", title: "Postcode", type: "string", group: "business", initialValue: "3220" }),
    defineField({ name: "addressCountry", title: "Country code", type: "string", group: "business", initialValue: "AU" }),
    defineField({ name: "geo", title: "Map coordinates", type: "geopoint", group: "business" }),
    defineField({ name: "areaServed", title: "Areas served", type: "array", group: "business", of: [{ type: "string" }], options: { layout: "tags" }, description: "Suburbs and regions, e.g. Geelong, Surf Coast, Bellarine Peninsula, Torquay, Ballarat, Melbourne." }),
    defineField({ name: "openingHours", title: "Opening hours", type: "array", group: "business", of: [defineArrayMember({ type: "openingHours" })] }),
    defineField({ name: "priceRange", title: "Price range", type: "string", group: "business", description: "e.g. $$ or “$650–$2,350”." }),
    defineField({ name: "currencies", title: "Currencies accepted", type: "string", group: "business", initialValue: "AUD" }),
    defineField({ name: "paymentAccepted", title: "Payment methods", type: "string", group: "business", initialValue: "Bank transfer, Credit card" }),
    defineField({ name: "knowsAbout", title: "Expertise topics", type: "array", group: "business", of: [{ type: "string" }], options: { layout: "tags" }, description: "Output as schema knowsAbout. e.g. Search engine optimisation, Web development, Generative engine optimisation." }),
    defineField({ name: "googleBusinessProfileUrl", title: "Google Business Profile URL", type: "url", group: "business", description: "Your Maps share link. Used as hasMap and sameAs." }),
    defineField({ name: "googleReviewUrl", title: "“Leave a review” link", type: "url", group: "business" }),
    defineField({ name: "mapEmbedUrl", title: "Google Map embed URL", type: "url", group: "business" }),
    defineField({ name: "rating", title: "Google rating (display only)", type: "object", group: "business", description: "Shown in a badge if turned on. NOT output as review schema: Google ignores self-served LocalBusiness reviews and it can be seen as spam.", fields: [defineField({ name: "value", type: "number" }), defineField({ name: "count", type: "number" }), defineField({ name: "checkedAt", title: "Last checked", type: "date" })] }),
    defineField({ name: "socialLinks", title: "Social & profile links (sameAs)", type: "array", group: "business", of: [defineArrayMember({ type: "object", name: "socialLink", fields: [defineField({ name: "label", title: "Network", type: "string", options: { list: ["LinkedIn", "Facebook", "Instagram", "X", "YouTube", "TikTok", "GitHub", "Clutch", "Google Business", "Yelp", "True Local", "Yellow Pages", "Crunchbase", "Other"] } }), defineField({ name: "url", type: "url" }), defineField({ name: "showInFooter", type: "boolean", initialValue: true })], preview: { select: { title: "label", subtitle: "url" } } })], description: "Every real profile of the business. These links tell Google and AI engines which profiles belong to the same entity." }),

    // Header
    defineField({ name: "announcement", title: "Announcement bar", type: "object", group: "header", fields: [defineField({ name: "enabled", type: "boolean", initialValue: false }), defineField({ name: "text", type: "string" }), defineField({ name: "link", type: "link" })] }),
    defineField({ name: "navigation", title: "Main menu", type: "array", group: "header", of: [defineArrayMember({ type: "navItem" })] }),
    defineField({ name: "headerCta", title: "Header button", type: "link", group: "header" }),

    // Footer
    defineField({ name: "footerText", title: "Footer text", type: "text", rows: 3, group: "footer" }),
    defineField({ name: "footerColumns", title: "Footer link columns", type: "array", group: "footer", of: [defineArrayMember({ type: "object", name: "footerColumn", fields: [defineField({ name: "title", type: "string" }), defineField({ name: "links", type: "array", of: [defineArrayMember({ type: "link" })] })], preview: { select: { title: "title" } } })] }),
    defineField({ name: "footerCta", title: "Footer call to action", type: "object", group: "footer", fields: [defineField({ name: "heading", type: "string" }), defineField({ name: "text", type: "text", rows: 2 }), defineField({ name: "link", type: "link" })] }),
    defineField({ name: "legalLinks", title: "Legal links", type: "array", group: "footer", of: [defineArrayMember({ type: "link" })] }),
    defineField({ name: "copyright", title: "Copyright line", type: "string", group: "footer", description: "Use {year} for the current year." }),

    // SEO
    defineField({ name: "titleTemplate", title: "Title template", type: "string", group: "seo", initialValue: "%s | Drivwon", description: "%s is replaced by the page title when no SEO title is set." }),
    defineField({ name: "defaultSeo", title: "Default SEO", type: "seo", group: "seo" }),
    imageField("defaultOgImage", "Default share image (1200×630)", { group: "seo" }),
    defineField({ name: "locale", title: "Locale", type: "string", group: "seo", initialValue: "en_AU" }),
    defineField({ name: "twitterHandle", title: "X / Twitter handle", type: "string", group: "seo" }),

    // Analytics
    defineField({ name: "ga4Id", title: "Google Analytics 4 ID", type: "string", group: "analytics", description: "G-XXXXXXX. Leave empty if you load GA4 through GTM.", validation: (rule) => rule.regex(/^G-[A-Z0-9]+$/, { name: "GA4 ID" }) }),
    defineField({ name: "gtmId", title: "Google Tag Manager ID", type: "string", group: "analytics", validation: (rule) => rule.regex(/^GTM-[A-Z0-9]+$/, { name: "GTM ID" }) }),
    defineField({ name: "googleAdsId", title: "Google Ads ID", type: "string", group: "analytics", description: "AW-XXXXXXXXX" }),
    defineField({ name: "googleAdsLeadLabel", title: "Google Ads lead conversion label", type: "string", group: "analytics" }),
    defineField({ name: "metaPixelId", title: "Meta (Facebook) Pixel ID", type: "string", group: "analytics" }),
    defineField({ name: "clarityId", title: "Microsoft Clarity ID", type: "string", group: "analytics", description: "Free heatmaps and session recordings." }),
    defineField({ name: "linkedinPartnerId", title: "LinkedIn Insight partner ID", type: "string", group: "analytics" }),
    defineField({ name: "tiktokPixelId", title: "TikTok Pixel ID", type: "string", group: "analytics" }),
    defineField({ name: "consentMode", title: "Cookie consent", type: "string", group: "analytics", initialValue: "banner", options: { list: [{ title: "Show a consent banner (Google Consent Mode v2)", value: "banner" }, { title: "No banner — load tracking straight away", value: "none" }], layout: "radio" }, description: "Australia does not strictly require a banner, but it is needed for EU/UK visitors and Google Ads in those regions." }),
    defineField({ name: "consentText", title: "Consent banner text", type: "text", rows: 2, group: "analytics", initialValue: "We use cookies to understand how people use our site and to improve our marketing. You can accept or decline." }),
    defineField({ name: "trackScrollDepth", title: "Track scroll depth", type: "boolean", group: "analytics", initialValue: true }),
    defineField({ name: "trackOutbound", title: "Track outbound, phone & email clicks", type: "boolean", group: "analytics", initialValue: true }),

    // Verification
    defineField({ name: "googleSiteVerification", title: "Google Search Console", type: "string", group: "verification", description: "Only the content value of the meta tag." }),
    defineField({ name: "bingSiteVerification", title: "Bing Webmaster Tools (msvalidate.01)", type: "string", group: "verification", description: "Bing powers ChatGPT search and Copilot — verify it." }),
    defineField({ name: "yandexVerification", title: "Yandex", type: "string", group: "verification" }),
    defineField({ name: "pinterestVerification", title: "Pinterest", type: "string", group: "verification" }),
    defineField({ name: "facebookDomainVerification", title: "Facebook domain verification", type: "string", group: "verification" }),
    defineField({ name: "indexNowKey", title: "IndexNow key", type: "string", group: "verification", description: "Optional. 8–128 letters/numbers. Served at /<key>.txt so Bing/Yandex can be pinged on publish." }),

    // Crawlers
    defineField({ name: "blockedAiBots", title: "Block these AI crawlers", type: "array", group: "crawlers", of: [{ type: "string" }], options: { list: aiBots }, description: "For GEO you normally want AI search bots ALLOWED so ChatGPT, Claude and Perplexity can cite you. Block only training bots if you care about that." }),
    defineField({ name: "robotsExtra", title: "Extra robots.txt lines", type: "text", rows: 4, group: "crawlers" }),
    defineField({ name: "llmsIntro", title: "llms.txt intro", type: "text", rows: 4, group: "crawlers", description: "Plain-English summary for AI tools. Defaults to the long description." }),

    // Leads
    defineField({ name: "defaultLeadForm", title: "Default lead form", type: "reference", group: "leads", to: [{ type: "leadForm" }] }),
    defineField({ name: "thankYouPage", title: "Default thank-you page", type: "reference", group: "leads", to: [{ type: "page" }, { type: "landingPage" }] }),
    defineField({ name: "stickyCta", title: "Mobile sticky call bar", type: "object", group: "leads", fields: [defineField({ name: "enabled", type: "boolean", initialValue: true }), defineField({ name: "callLabel", type: "string", initialValue: "Call" }), defineField({ name: "quoteLink", type: "link" })] }),
  ],
  preview: { select: { title: "siteName", subtitle: "tagline", media: "logo" } },
});
