import { defineArrayMember, defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Blog post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
    { name: "publishing", title: "Publishing" },
  ],
  fields: [
    defineField({ name: "title", title: "Title", type: "string", group: "content", validation: (rule) => rule.required().max(100) }),
    defineField({ name: "slug", title: "URL slug", type: "slug", group: "content", options: { source: "title", maxLength: 96 }, validation: (rule) => rule.required() }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text", rows: 3, group: "content", validation: (rule) => rule.required().max(260) }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", group: "content", options: { hotspot: true }, fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() })] }),
    defineField({ name: "author", title: "Author", type: "string", group: "content" }),
    defineField({ name: "categories", title: "Categories", type: "array", group: "content", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "publishedAt", title: "Publish date", type: "datetime", group: "publishing", validation: (rule) => rule.required() }),
    defineField({ name: "body", title: "Article", type: "portableText", group: "content", validation: (rule) => rule.required() }),
    defineField({ name: "seo", title: "Search & social metadata", type: "seo", group: "seo" }),
    defineField({ name: "noIndex", title: "Hide from search engines", type: "boolean", group: "seo", initialValue: false }),
  ],
  preview: { select: { title: "title", subtitle: "publishedAt", media: "coverImage" } },
});
