import { defineField } from "sanity";

/** Document types that have a public URL. Keep in sync with shared/cms/routes.ts. */
export const routableTypes = ["page", "landingPage", "post", "service", "location", "caseStudy", "category", "author"];

/** Image with required alt text, caption and optional SEO title. */
export function imageField(name = "image", title = "Image", options: { required?: boolean; group?: string; description?: string } = {}) {
  return defineField({
    name,
    title,
    type: "image",
    group: options.group,
    description: options.description,
    options: { hotspot: true },
    validation: options.required ? (rule) => rule.required() : undefined,
    fields: [
      defineField({
        name: "alt",
        title: "Alt text",
        type: "string",
        description: "Describe the image for blind users and Google Images. Say what is in the picture. Do not stuff keywords. Leave empty only if the image is pure decoration.",
        validation: (rule) => rule.max(140).warning("Keep alt text under 140 characters."),
      }),
      defineField({ name: "caption", title: "Caption", type: "string" }),
      defineField({ name: "decorative", title: "Decorative only (hide from screen readers)", type: "boolean", initialValue: false }),
    ],
  });
}

/** Shared design controls added to every section. */
export const sectionSettings = defineField({
  name: "settings",
  title: "Section settings",
  type: "sectionSettings",
  options: { collapsible: true, collapsed: true },
});

export const eyebrow = defineField({ name: "eyebrow", title: "Small label above heading", type: "string" });
export const heading = defineField({ name: "heading", title: "Heading", type: "string" });
export const intro = defineField({ name: "intro", title: "Intro text", type: "text", rows: 3 });

export function headingLevel(initial: "h1" | "h2" = "h2") {
  return defineField({
    name: "headingLevel",
    title: "Heading tag",
    description: "Use H1 only once per page (normally in the hero). All other section headings should be H2.",
    type: "string",
    initialValue: initial,
    options: { list: ["h1", "h2", "h3"], layout: "radio", direction: "horizontal" },
  });
}

export function slugField(source = "title", group?: string) {
  return defineField({
    name: "slug",
    title: "URL slug",
    type: "slug",
    group,
    description: "Short, lowercase, words separated by hyphens. Include the main keyword, e.g. seo-geelong. Changing a live slug breaks links — add a redirect if you do.",
    options: { source, maxLength: 80, slugify: (input: string) => input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) },
    validation: (rule) => rule.required().custom((value: { current?: string } | undefined) => {
      const current = value?.current ?? "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)) return "Use lowercase letters, numbers and single hyphens only.";
      if (["studio", "api", "dashboard", "drivwon", "assets", "sitemap", "robots", "llms", "rss"].includes(current)) return "This slug is reserved for a built-in route.";
      return true;
    }),
  });
}

export const publishingFields = (group = "publishing") => [
  defineField({ name: "publishedAt", title: "First published", type: "datetime", group }),
  defineField({
    name: "updatedAt",
    title: "Last meaningful update",
    type: "datetime",
    group,
    description: "Change this only when the content really changes. It is shown to readers, used in the sitemap and in schema dateModified. Fresh, honest dates help AI engines and Google trust the page.",
  }),
];
