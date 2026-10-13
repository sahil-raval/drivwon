import { defineField, defineType } from "sanity";

export const seoFields = [
  defineField({ name: "metaTitle", title: "SEO title", type: "string", validation: (rule) => rule.max(60) }),
  defineField({ name: "metaDescription", title: "Meta description", type: "text", rows: 3, validation: (rule) => rule.max(160) }),
  defineField({ name: "canonicalUrl", title: "Canonical URL", type: "url" }),
  defineField({ name: "noIndex", title: "Hide from search engines", type: "boolean", initialValue: false }),
  defineField({ name: "keywords", title: "Focus keywords", type: "array", of: [{ type: "string" }] }),
  defineField({ name: "ogTitle", title: "Social share title", type: "string" }),
  defineField({ name: "ogDescription", title: "Social share description", type: "text", rows: 2 }),
  defineField({
    name: "ogImage",
    title: "Social share image",
    type: "image",
    options: { hotspot: true },
    fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
  }),
  defineField({
    name: "structuredData",
    title: "Additional JSON-LD",
    description: "Optional JSON-LD object. Keep business facts accurate and do not include claims you cannot verify.",
    type: "text",
    rows: 8,
  }),
];

export const seoObject = defineType({
  name: "seo",
  title: "SEO & social sharing",
  type: "object",
  fields: seoFields,
});
