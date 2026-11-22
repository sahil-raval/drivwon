import { defineArrayMember, defineField, defineType } from "sanity";
import { SearchIcon } from "../../lib/icons";
import { SeoInput } from "../../components/SeoInput";

const groups = [
  { name: "search", title: "Google", default: true },
  { name: "social", title: "Social share" },
  { name: "ai", title: "AI search (AEO / GEO)" },
  { name: "schema", title: "Schema" },
  { name: "advanced", title: "Indexing & advanced" },
];

/**
 * Full SEO, AEO and GEO controls. Used on every page-like document and as the site default.
 * Empty fields fall back to the page title/excerpt and then to the site default in Site settings.
 */
export const seoObject = defineType({
  name: "seo",
  title: "SEO, AEO & GEO",
  type: "object",
  icon: SearchIcon,
  groups,
  components: { input: SeoInput },
  fields: [
    // ── Google ────────────────────────────────────────────────────────────
    defineField({
      name: "focusKeyword",
      title: "Focus keyword",
      type: "string",
      group: "search",
      description: "The ONE main search phrase this page should rank for, e.g. “seo geelong”. Use each focus keyword on one page only, or pages will compete with each other.",
    }),
    defineField({ name: "secondaryKeywords", title: "Related keywords", type: "array", group: "search", of: [{ type: "string" }], options: { layout: "tags" }, description: "Close variants and questions, e.g. “seo agency geelong”, “seo company geelong”. Use them naturally in headings and copy." }),
    defineField({ name: "searchIntent", title: "Search intent", type: "string", group: "search", options: { list: [
      { title: "Local — wants a business nearby", value: "local" },
      { title: "Commercial — comparing options", value: "commercial" },
      { title: "Transactional — ready to buy / book", value: "transactional" },
      { title: "Informational — wants to learn", value: "informational" },
      { title: "Navigational — looking for us", value: "navigational" },
    ] } }),
    defineField({
      name: "metaTitle",
      title: "SEO title",
      type: "string",
      group: "search",
      description: "Shown as the blue link in Google. Aim for 50–60 characters. Put the keyword near the start, brand at the end: “SEO Geelong | Local SEO Agency | Drivwon”.",
      validation: (rule) => [rule.max(70).warning("Over 70 characters — Google will cut it off."), rule.min(25).warning("Very short — add the keyword and location.")],
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 3,
      group: "search",
      description: "The grey text under the link. 140–160 characters. Say who it is for, what they get and add a call to action.",
      validation: (rule) => [rule.max(170).warning("Over 170 characters — Google will cut it off."), rule.min(70).warning("Short — use more of the space to win the click.")],
    }),
    defineField({ name: "breadcrumbTitle", title: "Breadcrumb label", type: "string", group: "search", description: "Short name used in breadcrumbs and BreadcrumbList schema. Defaults to the page title." }),

    // ── Social ───────────────────────────────────────────────────────────
    defineField({ name: "ogTitle", title: "Share title", type: "string", group: "social", description: "Title when shared on Facebook, LinkedIn, WhatsApp, Slack. Defaults to SEO title.", validation: (rule) => rule.max(90).warning("Keep under 90 characters.") }),
    defineField({ name: "ogDescription", title: "Share description", type: "text", rows: 2, group: "social", validation: (rule) => rule.max(200).warning("Keep under 200 characters.") }),
    defineField({
      name: "ogImage",
      title: "Share image",
      type: "image",
      group: "social",
      options: { hotspot: true },
      description: "1200 × 630 px. Defaults to the page hero/cover image, then the site default.",
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
    defineField({ name: "twitterCard", title: "X / Twitter card", type: "string", group: "social", initialValue: "summary_large_image", options: { list: ["summary_large_image", "summary"] } }),

    // ── AI search ───────────────────────────────────────────────────────
    defineField({
      name: "quickAnswer",
      title: "Quick answer (TL;DR)",
      type: "text",
      rows: 3,
      group: "ai",
      description: "AEO: a 40–60 word direct answer to the main question this page answers. Shown at the top of the page and used in llms.txt. ChatGPT, Perplexity and Google AI Overviews prefer clear, quotable answers.",
      validation: (rule) => rule.max(420).warning("Keep the quick answer short — around 40–60 words."),
    }),
    defineField({ name: "keyFacts", title: "Key facts", type: "array", group: "ai", of: [{ type: "string" }], description: "GEO: short, checkable facts (prices from, turnaround time, location, experience). AI engines quote specific facts. Only add things that are true." }),
    defineField({ name: "about", title: "This page is about", type: "array", group: "ai", of: [defineArrayMember({ type: "entity" })], description: "Main entities (e.g. Search engine optimization, Geelong). Output as schema “about” with Wikipedia/Wikidata links." }),
    defineField({ name: "mentions", title: "Also mentions", type: "array", group: "ai", of: [defineArrayMember({ type: "entity" })] }),
    defineField({ name: "audience", title: "Who is this for?", type: "string", group: "ai", description: "e.g. “Small business owners in Geelong and the Surf Coast”." }),
    defineField({ name: "sources", title: "Sources & citations", type: "array", group: "ai", of: [defineArrayMember({ type: "object", name: "citation", fields: [defineField({ name: "title", type: "string" }), defineField({ name: "url", type: "url" })], preview: { select: { title: "title", subtitle: "url" } } })], description: "Link to the research or official docs you used. Shown at the end of articles and output as schema “citation”. Boosts trust (E-E-A-T)." }),
    defineField({ name: "includeInLlms", title: "List in llms.txt", type: "boolean", group: "ai", initialValue: true, description: "llms.txt is a plain-text guide to the site for AI tools." }),
    defineField({ name: "speakable", title: "Mark quick answer as speakable", type: "boolean", group: "ai", initialValue: true, description: "Adds speakable schema so voice assistants can read the answer." }),

    // ── Schema ──────────────────────────────────────────────────────────
    defineField({ name: "schemaType", title: "Page schema type", type: "string", group: "schema", description: "Leave empty for the best automatic choice.", options: { list: ["WebPage", "AboutPage", "ContactPage", "CollectionPage", "FAQPage", "ItemPage", "ProfilePage", "SearchResultsPage", "CheckoutPage"] } }),
    defineField({ name: "areaServed", title: "Area served (override)", type: "array", group: "schema", of: [{ type: "string" }], description: "Suburbs/regions for Service schema. Defaults to Site settings." }),
    defineField({
      name: "structuredData",
      title: "Extra JSON-LD",
      type: "text",
      rows: 8,
      group: "schema",
      description: "Advanced. A JSON object or array added to the page. It must match what is visible on the page — fake reviews or hidden content can get a manual penalty.",
      validation: (rule) => rule.custom((value?: string) => {
        if (!value) return true;
        try { JSON.parse(value); return true; } catch { return "Not valid JSON."; }
      }),
    }),

    // ── Indexing ────────────────────────────────────────────────────────
    defineField({ name: "noIndex", title: "Hide from search engines (noindex)", type: "boolean", group: "advanced", initialValue: false, description: "Use for thank-you pages, paid-ads-only landing pages and thin pages." }),
    defineField({ name: "noFollow", title: "Do not follow links (nofollow)", type: "boolean", group: "advanced", initialValue: false }),
    defineField({ name: "noArchive", title: "No cached copy (noarchive)", type: "boolean", group: "advanced", initialValue: false }),
    defineField({ name: "noSnippet", title: "No text snippet (nosnippet)", type: "boolean", group: "advanced", initialValue: false, description: "Warning: also stops the page being quoted in Google AI Overviews." }),
    defineField({ name: "noImageIndex", title: "Do not index images", type: "boolean", group: "advanced", initialValue: false }),
    defineField({ name: "maxSnippet", title: "Max snippet length", type: "number", group: "advanced", description: "-1 = no limit (recommended)." , initialValue: -1 }),
    defineField({ name: "maxImagePreview", title: "Max image preview", type: "string", group: "advanced", initialValue: "large", options: { list: ["large", "standard", "none"] } }),
    defineField({ name: "unavailableAfter", title: "Remove from Google after", type: "datetime", group: "advanced", description: "For offers that expire." }),
    defineField({ name: "canonicalUrl", title: "Canonical URL", type: "url", group: "advanced", description: "Only set this if the same content lives at another URL. Leave empty to use this page’s own URL." }),
    defineField({ name: "excludeFromSitemap", title: "Leave out of sitemap.xml", type: "boolean", group: "advanced", initialValue: false }),
    defineField({ name: "sitemapPriority", title: "Sitemap priority", type: "number", group: "advanced", options: { list: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3] } }),
    defineField({ name: "changeFrequency", title: "Change frequency", type: "string", group: "advanced", options: { list: ["daily", "weekly", "monthly", "yearly"] } }),
    defineField({ name: "alternates", title: "Language alternates (hreflang)", type: "array", group: "advanced", of: [defineArrayMember({ type: "object", name: "alternate", fields: [defineField({ name: "hreflang", type: "string", description: "e.g. en-NZ" }), defineField({ name: "url", type: "url" })], preview: { select: { title: "hreflang", subtitle: "url" } } })], description: "Only if you publish the same page for another country/language." }),
  ],
});
