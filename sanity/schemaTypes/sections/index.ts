import { defineArrayMember, defineField, defineType, type FieldDefinition } from "sanity";
import {
  BlockContentIcon, BlockquoteIcon, BulbOutlineIcon, CaseIcon, ChartUpwardIcon, CodeBlockIcon, CommentIcon, ComponentIcon,
  DocumentsIcon, EnvelopeIcon, HelpCircleIcon, ImageIcon, InlineIcon, LaunchIcon, MarkerIcon, ProjectsIcon, RocketIcon,
  SplitHorizontalIcon, StarIcon, TagIcon, ThListIcon, UsersIcon, ArrowRightIcon, CreditCardIcon, PinIcon,
} from "../../lib/icons";
import { eyebrow, heading, headingLevel, imageField, intro, sectionSettings } from "../../lib/fields";

/** Lucide icon names the website can render. */
export const iconList = [
  "Search", "Globe", "Code2", "Bot", "Smartphone", "Palette", "Sparkles", "BarChart3", "ShoppingCart", "Megaphone", "Rocket", "Users",
  "ShieldCheck", "Layers", "Network", "MapPin", "Phone", "Mail", "Clock", "Zap", "Target", "TrendingUp", "Award", "CheckCircle2",
  "Star", "Heart", "Lightbulb", "Gauge", "LineChart", "PenTool", "Cpu", "Database", "Cloud", "Lock", "MessageSquare", "Workflow",
];

const iconField = defineField({ name: "icon", title: "Icon", type: "string", options: { list: iconList } });

function section(name: string, label: string, icon: any, fields: FieldDefinition[], subtitle?: string) {
  return defineType({
    name,
    title: label,
    type: "object",
    icon,
    fields: [...fields, sectionSettings],
    preview: {
      select: { title: "heading", question: "question", quote: "quote", hidden: "settings.hidden", media: "image" },
      prepare: ({ title, question, quote, hidden, media }) => ({ title: `${hidden ? "🚫 " : ""}${title || question || quote || label}`, subtitle: `${subtitle ?? label}${hidden ? " · hidden" : ""}`, media }),
    },
  });
}

const buttons = defineField({ name: "buttons", title: "Buttons", type: "array", of: [defineArrayMember({ type: "link" })], validation: (rule) => rule.max(3) });

export const heroSection = section("heroSection", "Hero", RocketIcon, [
  defineField({ name: "layout", title: "Layout", type: "string", initialValue: "centered", options: { list: ["centered", "split", "fullscreen", "minimal"], layout: "radio", direction: "horizontal" } }),
  eyebrow,
  defineField({ name: "heading", title: "Main heading (H1)", type: "string", description: "The page’s one H1. Include the main keyword naturally, e.g. “SEO & Web Design in Geelong”.", validation: (rule) => rule.required() }),
  defineField({ name: "highlight", title: "Words to highlight", type: "string", description: "Part of the heading to show in brand colour." }),
  defineField({ name: "subheading", title: "Supporting text", type: "text", rows: 3 }),
  buttons,
  imageField("image", "Image"),
  defineField({ name: "video", title: "Background / side video", type: "video" }),
  defineField({ name: "trustItems", title: "Trust points under buttons", type: "array", of: [{ type: "string" }], description: "e.g. “Based in Geelong”, “No lock-in contracts”, “Reply within 1 business day”." }),
  defineField({ name: "showRating", title: "Show Google rating badge", type: "boolean", initialValue: false, description: "Uses the rating in Site settings. Only turn on when it is real and current." }),
], "Hero");

export const richTextSection = section("richTextSection", "Rich text", BlockContentIcon, [eyebrow, heading, headingLevel(), defineField({ name: "body", title: "Content", type: "portableText" }), defineField({ name: "showToc", title: "Show table of contents", type: "boolean", initialValue: false })], "Rich text");

export const quickAnswerSection = section("quickAnswerSection", "Quick answer (AEO)", BulbOutlineIcon, [
  defineField({ name: "question", title: "Question", type: "string", description: "Write it how people search, e.g. “How much does SEO cost in Geelong?”", validation: (rule) => rule.required() }),
  defineField({ name: "answer", title: "Direct answer (40–60 words)", type: "text", rows: 4, validation: (rule) => rule.required() }),
  defineField({ name: "points", title: "Supporting points", type: "array", of: [{ type: "string" }] }),
  defineField({ name: "label", title: "Label", type: "string", initialValue: "Quick answer" }),
], "Quick answer");

export const splitSection = section("splitSection", "Image + text", SplitHorizontalIcon, [
  eyebrow, heading, headingLevel(), defineField({ name: "body", title: "Text", type: "portableText" }), buttons,
  imageField("image", "Image"), defineField({ name: "video", title: "Or a video", type: "video" }),
  defineField({ name: "imagePosition", title: "Image side", type: "string", initialValue: "right", options: { list: ["left", "right"], layout: "radio", direction: "horizontal" } }),
  defineField({ name: "bullets", title: "Tick list", type: "array", of: [{ type: "string" }] }),
], "Image + text");

export const mediaSection = section("mediaSection", "Image / video / gallery", ImageIcon, [
  heading, intro,
  defineField({ name: "mediaType", title: "Show", type: "string", initialValue: "image", options: { list: ["image", "video", "gallery"], layout: "radio", direction: "horizontal" } }),
  imageField("image", "Image"),
  defineField({ name: "video", title: "Video", type: "video" }),
  defineField({ name: "gallery", title: "Gallery images", type: "array", of: [defineArrayMember({ type: "image", options: { hotspot: true }, fields: [defineField({ name: "alt", type: "string", title: "Alt text" }), defineField({ name: "caption", type: "string" })] })] }),
  defineField({ name: "caption", title: "Caption", type: "string" }),
], "Media");

export const featureGridSection = section("featureGridSection", "Feature / service cards", ThListIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "columns", title: "Columns", type: "number", initialValue: 3, options: { list: [2, 3, 4], layout: "radio", direction: "horizontal" } }),
  defineField({ name: "style", title: "Card style", type: "string", initialValue: "card", options: { list: ["card", "plain", "numbered"], layout: "radio", direction: "horizontal" } }),
  defineField({
    name: "items", title: "Cards", type: "array",
    of: [defineArrayMember({ type: "object", name: "featureItem", fields: [iconField, defineField({ name: "title", type: "string" }), defineField({ name: "body", type: "text", rows: 3 }), imageField("image", "Image"), defineField({ name: "bullets", type: "array", of: [{ type: "string" }] }), defineField({ name: "link", type: "link" })], preview: { select: { title: "title", subtitle: "body", media: "image" } } })],
  }),
  defineField({ name: "link", title: "Link under the grid", type: "link" }),
], "Cards");

export const statsSection = section("statsSection", "Stats / numbers", ChartUpwardIcon, [
  eyebrow, heading, intro,
  defineField({ name: "items", title: "Stats", type: "array", of: [defineArrayMember({ type: "object", name: "stat", fields: [defineField({ name: "value", type: "string", description: "e.g. 50+, 4.9★, 30 days" }), defineField({ name: "label", type: "string" }), defineField({ name: "detail", type: "string" })], preview: { select: { title: "value", subtitle: "label" } } })], description: "Only real, provable numbers. AI engines and customers check." }),
], "Stats");

export const processSection = section("processSection", "Process / steps", ArrowRightIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "steps", title: "Steps", type: "array", of: [defineArrayMember({ type: "object", name: "step", fields: [defineField({ name: "title", type: "string" }), defineField({ name: "body", type: "text", rows: 3 }), defineField({ name: "bullets", type: "array", of: [{ type: "string" }] }), defineField({ name: "duration", type: "string", description: "e.g. Week 1" })], preview: { select: { title: "title", subtitle: "duration" } } })] }),
  defineField({ name: "asHowTo", title: "Output as HowTo schema", type: "boolean", initialValue: false }),
], "Process");

export const servicesSection = section("servicesSection", "Services list", LaunchIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "mode", title: "Show", type: "string", initialValue: "all", options: { list: [{ title: "All services", value: "all" }, { title: "Pick services", value: "manual" }], layout: "radio" } }),
  defineField({ name: "services", title: "Services", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "service" }] })], hidden: ({ parent }) => parent?.mode !== "manual" }),
  defineField({ name: "columns", title: "Columns", type: "number", initialValue: 3, options: { list: [2, 3, 4] } }),
  defineField({ name: "link", title: "Link under list", type: "link" }),
], "Services");

export const projectsSection = section("projectsSection", "Case studies / projects", ProjectsIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "mode", title: "Show", type: "string", initialValue: "latest", options: { list: [{ title: "Latest", value: "latest" }, { title: "Featured only", value: "featured" }, { title: "Pick", value: "manual" }], layout: "radio" } }),
  defineField({ name: "projects", title: "Case studies", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "caseStudy" }] })], hidden: ({ parent }) => parent?.mode !== "manual" }),
  defineField({ name: "limit", title: "How many", type: "number", initialValue: 6 }),
  defineField({ name: "link", title: "Link under list", type: "link" }),
], "Projects");

export const testimonialsSection = section("testimonialsSection", "Testimonials", CommentIcon, [
  eyebrow, heading, intro,
  defineField({ name: "testimonials", title: "Testimonials", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "testimonial" }] })], description: "Leave empty to show featured testimonials." }),
  defineField({ name: "layout", title: "Layout", type: "string", initialValue: "grid", options: { list: ["grid", "single", "carousel"], layout: "radio", direction: "horizontal" } }),
  defineField({ name: "reviewLink", title: "“Read our Google reviews” link", type: "link" }),
], "Testimonials");

export const logoCloudSection = section("logoCloudSection", "Client logos", StarIcon, [
  heading,
  defineField({ name: "logos", title: "Logos", type: "array", of: [defineArrayMember({ type: "image", fields: [defineField({ name: "alt", type: "string", title: "Company name" }), defineField({ name: "url", type: "url" })] })] }),
  defineField({ name: "grayscale", title: "Grayscale", type: "boolean", initialValue: true }),
], "Logos");

export const pricingSection = section("pricingSection", "Pricing / packages", CreditCardIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({
    name: "plans", title: "Plans", type: "array",
    of: [defineArrayMember({ type: "object", name: "plan", fields: [
      defineField({ name: "name", type: "string" }), defineField({ name: "price", type: "string", description: "e.g. $650" }), defineField({ name: "priceNumber", title: "Price as number (for schema)", type: "number" }),
      defineField({ name: "period", type: "string", description: "e.g. per month, one-off" }), defineField({ name: "description", type: "text", rows: 2 }),
      defineField({ name: "features", type: "array", of: [{ type: "string" }] }), defineField({ name: "highlighted", title: "Most popular", type: "boolean" }), defineField({ name: "link", type: "link" }),
    ], preview: { select: { title: "name", subtitle: "price" } } })],
  }),
  defineField({ name: "note", title: "Small print", type: "string", description: "e.g. Prices in AUD, GST included." }),
  defineField({ name: "outputOffers", title: "Output as Offer schema", type: "boolean", initialValue: true }),
], "Pricing");

export const faqSection = section("faqSection", "FAQs", HelpCircleIcon, [
  eyebrow, defineField({ name: "heading", title: "Heading", type: "string", initialValue: "Frequently asked questions" }), headingLevel(), intro,
  defineField({ name: "items", title: "Questions written here", type: "array", of: [defineArrayMember({ type: "object", name: "qa", fields: [defineField({ name: "question", type: "string", validation: (rule) => rule.required() }), defineField({ name: "answer", type: "text", rows: 4, validation: (rule) => rule.required() })], preview: { select: { title: "question", subtitle: "answer" } } })] }),
  defineField({ name: "faqs", title: "Or reuse saved FAQs", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "faq" }] })] }),
  defineField({ name: "schema", title: "Output FAQPage schema", type: "boolean", initialValue: true, description: "Only use for questions with one clear answer written by you." }),
], "FAQ");

export const ctaSection = section("ctaSection", "Call to action", ComponentIcon, [
  eyebrow, defineField({ name: "heading", title: "Heading", type: "string", validation: (rule) => rule.required() }), defineField({ name: "body", title: "Supporting text", type: "text", rows: 3 }), buttons,
  defineField({ name: "style", title: "Style", type: "string", initialValue: "banner", options: { list: ["banner", "card", "minimal"], layout: "radio", direction: "horizontal" } }),
  imageField("image", "Background image"),
], "CTA");

export const formSection = section("formSection", "Lead form", EnvelopeIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "form", title: "Form", type: "reference", to: [{ type: "leadForm" }], validation: (rule) => rule.required() }),
  defineField({ name: "layout", title: "Layout", type: "string", initialValue: "split", options: { list: [{ title: "Form + contact details", value: "split" }, { title: "Form only", value: "single" }], layout: "radio" } }),
  defineField({ name: "sideText", title: "Text next to form", type: "portableText" }),
  defineField({ name: "showContactDetails", title: "Show phone / email / address", type: "boolean", initialValue: true }),
], "Form");

export const contactSection = section("contactSection", "Contact details + map", PinIcon, [
  eyebrow, heading, intro,
  defineField({ name: "showMap", title: "Show Google map", type: "boolean", initialValue: true }),
  defineField({ name: "mapEmbedUrl", title: "Map embed URL", type: "url", description: "Google Maps → Share → Embed a map → copy the src URL. Defaults to Site settings." }),
  defineField({ name: "showHours", title: "Show opening hours", type: "boolean", initialValue: true }),
], "Contact");

export const teamSection = section("teamSection", "Team", UsersIcon, [
  eyebrow, heading, intro, defineField({ name: "people", title: "People", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "author" }] })] }),
], "Team");

export const postsSection = section("postsSection", "Blog posts", DocumentsIcon, [
  eyebrow, heading, intro,
  defineField({ name: "mode", title: "Show", type: "string", initialValue: "latest", options: { list: [{ title: "Latest", value: "latest" }, { title: "From a category", value: "category" }, { title: "Pick", value: "manual" }], layout: "radio" } }),
  defineField({ name: "category", type: "reference", to: [{ type: "category" }], hidden: ({ parent }) => parent?.mode !== "category" }),
  defineField({ name: "posts", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "post" }] })], hidden: ({ parent }) => parent?.mode !== "manual" }),
  defineField({ name: "limit", type: "number", initialValue: 3 }),
], "Posts");

export const comparisonSection = section("comparisonSection", "Comparison table", TagIcon, [
  eyebrow, heading, headingLevel(), intro,
  defineField({ name: "columns", title: "Column headings", type: "array", of: [{ type: "string" }], description: "First column is the feature name, e.g. Feature | Drivwon | Typical agency" }),
  defineField({ name: "rows", title: "Rows", type: "array", of: [defineArrayMember({ type: "object", name: "comparisonRow", fields: [defineField({ name: "cells", type: "array", of: [{ type: "string" }], description: "Use ✓ and ✗ for yes/no." })], preview: { select: { cells: "cells" }, prepare: ({ cells }) => ({ title: (cells ?? []).join(" | ") }) } })] }),
  defineField({ name: "note", type: "string" }),
], "Comparison");

export const locationsSection = section("locationsSection", "Areas we serve", MarkerIcon, [
  eyebrow, heading, intro,
  defineField({ name: "locations", title: "Locations", type: "array", of: [defineArrayMember({ type: "reference", to: [{ type: "location" }] })], description: "Leave empty to show all published locations." }),
  defineField({ name: "extraAreas", title: "Extra areas (text only)", type: "array", of: [{ type: "string" }] }),
], "Areas");

export const embedSection = section("embedSection", "Embed (Calendly, Loom, etc.)", CodeBlockIcon, [
  heading, intro, defineField({ name: "url", title: "Embed URL", type: "url", validation: (rule) => rule.required() }), defineField({ name: "title", title: "Accessible title", type: "string", validation: (rule) => rule.required() }), defineField({ name: "height", type: "number", initialValue: 600 }),
], "Embed");

export const quoteSection = section("quoteSection", "Big quote", BlockquoteIcon, [
  defineField({ name: "quote", type: "text", rows: 3 }), defineField({ name: "name", type: "string" }), defineField({ name: "role", type: "string" }), imageField("image", "Photo"),
], "Quote");

export const reusableSectionRef = defineType({
  name: "reusableSectionRef",
  title: "Saved section (reusable)",
  type: "object",
  icon: InlineIcon,
  fields: [defineField({ name: "section", title: "Saved section", type: "reference", to: [{ type: "reusableSection" }], validation: (rule) => rule.required() }), sectionSettings],
  preview: { select: { title: "section.title" }, prepare: ({ title }) => ({ title: title || "Saved section", subtitle: "Reusable section" }) },
});

export const caseHighlightSection = section("caseHighlightSection", "Results highlight", CaseIcon, [
  eyebrow, heading, defineField({ name: "caseStudy", type: "reference", to: [{ type: "caseStudy" }] }),
], "Result");

export const sectionTypes = [
  heroSection, quickAnswerSection, richTextSection, splitSection, mediaSection, featureGridSection, statsSection, processSection,
  servicesSection, projectsSection, caseHighlightSection, testimonialsSection, logoCloudSection, pricingSection, faqSection,
  comparisonSection, ctaSection, formSection, contactSection, locationsSection, teamSection, postsSection, quoteSection, embedSection,
  reusableSectionRef,
];

/** The array field used by every page builder. */
export function sectionsField(group = "content", exclude: string[] = []) {
  return defineField({
    name: "sections",
    title: "Page sections",
    type: "array",
    group,
    description: "Build the page from blocks. Drag to reorder. Start with a Hero (it holds the H1).",
    of: sectionTypes.filter((type) => !exclude.includes(type.name)).map((type) => defineArrayMember({ type: type.name })),
    options: {
      insertMenu: {
        groups: [
          { name: "intro", title: "Intro", of: ["heroSection", "quickAnswerSection"] },
          { name: "content", title: "Content", of: ["richTextSection", "splitSection", "mediaSection", "featureGridSection", "processSection", "comparisonSection", "quoteSection", "embedSection"] },
          { name: "proof", title: "Proof & trust", of: ["statsSection", "testimonialsSection", "logoCloudSection", "projectsSection", "caseHighlightSection", "teamSection"] },
          { name: "sell", title: "Convert", of: ["ctaSection", "formSection", "pricingSection", "faqSection", "contactSection"] },
          { name: "lists", title: "Lists", of: ["servicesSection", "locationsSection", "postsSection"] },
          { name: "saved", title: "Saved", of: ["reusableSectionRef"] },
        ],
        views: [{ name: "list" }],
      },
    } as any,
    validation: (rule) => rule.max(40),
  });
}
