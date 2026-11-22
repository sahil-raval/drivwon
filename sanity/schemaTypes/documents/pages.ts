import { defineArrayMember, defineField, defineType } from "sanity";
import { DocumentIcon, RocketIcon, BlockElementIcon } from "../../lib/icons";
import { publishingFields, slugField } from "../../lib/fields";
import { sectionsField } from "../sections";

const groups = [
  { name: "content", title: "Content", default: true },
  { name: "seo", title: "SEO / AEO / GEO" },
  { name: "publishing", title: "Publishing" },
];

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  icon: DocumentIcon,
  groups,
  fields: [
    defineField({ name: "title", title: "Page title", type: "string", group: "content", validation: (rule) => rule.required() }),
    slugField("title", "content"),
    sectionsField(),
    defineField({ name: "seo", title: "SEO", type: "seo", group: "seo" }),
    defineField({ name: "parent", title: "Parent page", type: "reference", to: [{ type: "page" }], group: "publishing", description: "Used for breadcrumbs only." }),
    defineField({ name: "showBreadcrumbs", title: "Show breadcrumbs", type: "boolean", group: "publishing", initialValue: true }),
    ...publishingFields(),
  ],
  preview: { select: { title: "title", slug: "slug.current", noIndex: "seo.noIndex" }, prepare: ({ title, slug, noIndex }) => ({ title, subtitle: `${slug === "home" ? "/" : `/${slug ?? ""}`}${noIndex ? " · noindex" : ""}` }) },
});

/** Campaign pages for Google Ads, Meta ads, email or offers. */
export const landingPage = defineType({
  name: "landingPage",
  title: "Landing page",
  type: "document",
  icon: RocketIcon,
  groups: [...groups, { name: "campaign", title: "Campaign & tracking" }],
  fields: [
    defineField({ name: "title", title: "Internal name", type: "string", group: "content", validation: (rule) => rule.required() }),
    slugField("title", "content"),
    sectionsField(),
    defineField({ name: "hideNavigation", title: "Hide main menu", type: "boolean", group: "campaign", initialValue: true, description: "Fewer exits = more leads. Logo still links home." }),
    defineField({ name: "hideFooter", title: "Use minimal footer", type: "boolean", group: "campaign", initialValue: true }),
    defineField({ name: "hideChatbot", title: "Hide chat widget", type: "boolean", group: "campaign", initialValue: false }),
    defineField({ name: "stickyCta", title: "Sticky call-to-action bar", type: "link", group: "campaign" }),
    defineField({ name: "campaign", title: "Campaign name", type: "string", group: "campaign", description: "Saved on every lead from this page, e.g. google-ads-seo-geelong-2026." }),
    defineField({ name: "channel", title: "Main traffic channel", type: "string", group: "campaign", options: { list: ["Google Ads", "Meta Ads", "LinkedIn Ads", "Email", "Organic", "Referral", "Print / QR", "Other"] } }),
    defineField({ name: "conversionGoal", title: "Conversion goal", type: "string", group: "campaign", options: { list: ["Lead form", "Phone call", "Book a call", "Download"] } }),
    defineField({ name: "variant", title: "A/B variant label", type: "string", group: "campaign", description: "e.g. A or B. Sent to analytics so you can compare versions." }),
    defineField({ name: "expiresAt", title: "Offer ends", type: "datetime", group: "campaign", description: "After this date the page shows the expired message and is set to noindex." }),
    defineField({ name: "expiredMessage", title: "Expired message", type: "text", rows: 2, group: "campaign", initialValue: "This offer has ended. Contact us for current pricing." }),
    defineField({ name: "headScripts", title: "Extra conversion pixels (event names)", type: "array", group: "campaign", of: [{ type: "string" }], description: "Extra analytics event names fired on page load, e.g. view_offer." }),
    defineField({ name: "seo", title: "SEO", type: "seo", group: "seo", initialValue: { noIndex: false } }),
    ...publishingFields(),
  ],
  preview: { select: { title: "title", slug: "slug.current", campaign: "campaign" }, prepare: ({ title, slug, campaign }) => ({ title, subtitle: `/${slug ?? ""}${campaign ? ` · ${campaign}` : ""}` }) },
});

export const reusableSection = defineType({
  name: "reusableSection",
  title: "Saved section",
  type: "document",
  icon: BlockElementIcon,
  description: "Build a block once (e.g. the main CTA) and use it on many pages. Edit it here and every page updates.",
  fields: [
    defineField({ name: "title", title: "Name", type: "string", validation: (rule) => rule.required() }),
    { ...sectionsField("content", ["reusableSectionRef"]), group: undefined, title: "Sections" },
  ],
});

export const redirect = defineType({
  name: "redirect",
  title: "Redirect",
  type: "document",
  fields: [
    defineField({ name: "from", title: "From path", type: "string", description: "Old path, e.g. /old-page. Must start with /.", validation: (rule) => rule.required().regex(/^\/[^\s]*$/) }),
    defineField({ name: "to", title: "To", type: "string", description: "New path (/new-page) or full URL.", validation: (rule) => rule.required() }),
    defineField({ name: "permanent", title: "Permanent (301)", type: "boolean", initialValue: true, description: "301 passes ranking to the new URL. Use 302 only for short-term moves." }),
  ],
  preview: { select: { from: "from", to: "to", permanent: "permanent" }, prepare: ({ from, to, permanent }) => ({ title: `${from} → ${to}`, subtitle: permanent ? "301" : "302" }) },
});

export const faq = defineType({
  name: "faq",
  title: "FAQ / chatbot answer",
  type: "document",
  fields: [
    defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "answer", title: "Answer", type: "text", rows: 4, validation: (rule) => rule.required(), description: "Start with the direct answer in the first sentence." }),
    defineField({ name: "topic", title: "Topic", type: "string", options: { list: ["General", "Pricing", "SEO", "Web development", "AI & automation", "Process", "Support"] } }),
    defineField({ name: "keywords", title: "Chatbot matching words", type: "array", of: [{ type: "string" }], options: { layout: "tags" } }),
    defineField({ name: "link", title: "Learn more link", type: "link" }),
    defineField({ name: "order", title: "Display order", type: "number", initialValue: 0 }),
    defineField({ name: "active", title: "Available to chatbot", type: "boolean", initialValue: true }),
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "question", subtitle: "topic" } },
});

export const leadForm = defineType({
  name: "leadForm",
  title: "Lead form",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Form name", type: "string", validation: (rule) => rule.required(), description: "Saved on each lead, e.g. “Contact form” or “Free SEO audit”." }),
    defineField({ name: "fields", title: "Fields", type: "array", of: [defineArrayMember({ type: "formField" })], validation: (rule) => rule.required().min(1) }),
    defineField({ name: "submitLabel", title: "Button text", type: "string", initialValue: "Send enquiry" }),
    defineField({ name: "successTitle", title: "Success heading", type: "string", initialValue: "Thanks — we got your message" }),
    defineField({ name: "successMessage", title: "Success message", type: "text", rows: 2, initialValue: "We reply within one business day. If it is urgent, give us a call." }),
    defineField({ name: "redirectTo", title: "Redirect to thank-you page", type: "reference", to: [{ type: "page" }, { type: "landingPage" }], description: "A thank-you page makes conversion tracking in Google Ads easier. Set it to noindex." }),
    defineField({ name: "leadType", title: "Lead type", type: "string", initialValue: "enquiry", options: { list: ["enquiry", "quote", "audit", "booking", "newsletter", "download"] } }),
    defineField({ name: "estimatedValue", title: "Estimated lead value (AUD)", type: "number", description: "Sent with the conversion event so GA4/Ads can value leads." }),
    defineField({ name: "privacyNote", title: "Privacy note under form", type: "string", initialValue: "We only use your details to reply to you. No spam." }),
    defineField({ name: "consentCheckbox", title: "Add a marketing consent checkbox", type: "boolean", initialValue: false }),
  ],
  preview: { select: { title: "title", subtitle: "leadType" } },
});
