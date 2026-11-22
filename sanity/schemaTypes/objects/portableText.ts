import { defineArrayMember, defineField, defineType } from "sanity";
import { routableTypes } from "../../lib/fields";

/** Rich text used in blogs, pages and services. Headings start at H2 because the page title is the H1. */
export const portableText = defineType({
  name: "portableText",
  title: "Rich text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "Heading 2", value: "h2" },
        { title: "Heading 3", value: "h3" },
        { title: "Heading 4", value: "h4" },
        { title: "Quote", value: "blockquote" },
        { title: "Lead paragraph", value: "lead" },
      ],
      lists: [{ title: "Bullet", value: "bullet" }, { title: "Numbered", value: "number" }],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Underline", value: "underline" },
          { title: "Strike", value: "strike-through" },
          { title: "Code", value: "code" },
          { title: "Highlight", value: "highlight" },
        ],
        annotations: [
          defineArrayMember({
            name: "internalLink",
            title: "Internal link",
            type: "object",
            description: "Link to another page on this site. Internal links help Google understand your site and spread ranking power.",
            fields: [
              defineField({ name: "reference", title: "Page", type: "reference", to: routableTypes.map((type) => ({ type })) }),
              defineField({ name: "anchor", title: "Section anchor (optional)", type: "string" }),
            ],
          }),
          defineArrayMember({
            name: "link",
            title: "External link",
            type: "object",
            fields: [
              defineField({ name: "href", title: "URL", type: "url", validation: (rule) => rule.uri({ scheme: ["http", "https", "mailto", "tel"] }) }),
              defineField({ name: "blank", title: "Open in new tab", type: "boolean", initialValue: true }),
              defineField({ name: "rel", title: "Link type", type: "string", initialValue: "", options: { list: [{ title: "Normal (trusted source)", value: "" }, { title: "nofollow", value: "nofollow" }, { title: "sponsored (paid)", value: "sponsored" }, { title: "ugc (user content)", value: "ugc" }] } }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      name: "inlineImage",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.warning().required() }),
        defineField({ name: "caption", title: "Caption", type: "string" }),
        defineField({ name: "size", title: "Size", type: "string", initialValue: "normal", options: { list: ["normal", "wide", "full"] } }),
      ],
    }),
    defineArrayMember({ type: "video" }),
    defineArrayMember({
      name: "callout",
      title: "Callout box",
      type: "object",
      fields: [
        defineField({ name: "tone", type: "string", initialValue: "info", options: { list: ["info", "tip", "warning", "success"] } }),
        defineField({ name: "title", type: "string" }),
        defineField({ name: "text", type: "text", rows: 3 }),
      ],
      preview: { select: { title: "title", subtitle: "text" }, prepare: ({ title, subtitle }) => ({ title: `💡 ${title || "Callout"}`, subtitle }) },
    }),
    defineArrayMember({
      name: "keyTakeaways",
      title: "Key takeaways",
      type: "object",
      description: "A short bullet summary. Very good for AI search and skim readers.",
      fields: [defineField({ name: "title", type: "string", initialValue: "Key takeaways" }), defineField({ name: "items", type: "array", of: [{ type: "string" }] })],
      preview: { select: { title: "title", items: "items" }, prepare: ({ title, items }) => ({ title: `✅ ${title}`, subtitle: `${items?.length ?? 0} points` }) },
    }),
    defineArrayMember({
      name: "inlineFaq",
      title: "FAQ (inside article)",
      type: "object",
      description: "Questions added here are included in FAQPage schema.",
      fields: [defineField({ name: "items", type: "array", of: [defineArrayMember({ type: "object", name: "qa", fields: [defineField({ name: "question", type: "string" }), defineField({ name: "answer", type: "text", rows: 3 })], preview: { select: { title: "question" } } })] })],
      preview: { select: { items: "items" }, prepare: ({ items }) => ({ title: "❓ FAQ", subtitle: `${items?.length ?? 0} questions` }) },
    }),
    defineArrayMember({
      name: "ctaBlock",
      title: "Call to action",
      type: "object",
      fields: [defineField({ name: "heading", type: "string" }), defineField({ name: "text", type: "text", rows: 2 }), defineField({ name: "link", type: "link" })],
      preview: { select: { title: "heading" }, prepare: ({ title }) => ({ title: `👉 ${title || "Call to action"}` }) },
    }),
    defineArrayMember({
      name: "codeBlock",
      title: "Code",
      type: "object",
      fields: [defineField({ name: "language", type: "string", initialValue: "html", options: { list: ["html", "css", "javascript", "typescript", "json", "bash", "php", "python", "groq"] } }), defineField({ name: "code", type: "text", rows: 8 })],
      preview: { select: { title: "language" }, prepare: ({ title }) => ({ title: `</> ${title}` }) },
    }),
    defineArrayMember({
      name: "table",
      title: "Table",
      type: "object",
      description: "Tables are easy for Google and AI engines to read. First row is the header.",
      fields: [
        defineField({ name: "caption", type: "string" }),
        defineField({ name: "rows", type: "array", of: [defineArrayMember({ type: "object", name: "tableRow", fields: [defineField({ name: "cells", type: "array", of: [{ type: "string" }] })], preview: { select: { cells: "cells" }, prepare: ({ cells }) => ({ title: (cells ?? []).join(" | ") }) } })] }),
      ],
      preview: { select: { title: "caption", rows: "rows" }, prepare: ({ title, rows }) => ({ title: `▦ ${title || "Table"}`, subtitle: `${rows?.length ?? 0} rows` }) },
    }),
    defineArrayMember({
      name: "embed",
      title: "Embed (iframe)",
      type: "object",
      fields: [defineField({ name: "url", type: "url", description: "Google Maps embed, Calendly, Loom, Typeform, etc." }), defineField({ name: "title", type: "string", validation: (rule) => rule.required() }), defineField({ name: "height", type: "number", initialValue: 480 })],
      preview: { select: { title: "title", subtitle: "url" } },
    }),
  ],
});
