import { defineArrayMember, defineField, defineType } from "sanity";

export const page = defineType({
  name: "page",
  title: "Page / landing page",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
    { name: "publishing", title: "Publishing" },
  ],
  fields: [
    defineField({ name: "title", title: "Internal title", type: "string", group: "content", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "URL slug", type: "slug", group: "content", options: { source: "title", maxLength: 80 }, validation: (rule) => rule.required() }),
    defineField({ name: "isHome", title: "Use as home page", type: "boolean", group: "content" }),
    defineField({ name: "seo", title: "Search & social metadata", type: "seo", group: "seo" }),
    defineField({
      name: "sections",
      title: "Page sections",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "heroSection" }), defineArrayMember({ type: "richTextSection" }), defineArrayMember({ type: "imageSection" }), defineArrayMember({ type: "videoSection" }), defineArrayMember({ type: "featureGridSection" }), defineArrayMember({ type: "ctaSection" }), defineArrayMember({ type: "faqSection" }), defineArrayMember({ type: "testimonialSection" })],
      validation: (rule) => rule.max(30),
    }),
    defineField({ name: "publishedAt", title: "Published at", type: "datetime", group: "publishing" }),
    defineField({ name: "updatedAt", title: "Last reviewed", type: "datetime", group: "publishing" }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});
