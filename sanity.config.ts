import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes, singletonTypes, systemTypes } from "./sanity/schemaTypes";
import { structure } from "./sanity/structure";

const siteUrl = "https://www.drivwon.com.au";

function pathFor(doc: { _type?: string; slug?: { current?: string } }) {
  const slug = doc.slug?.current;
  if (!slug) return null;
  switch (doc._type) {
    case "page": return slug === "home" ? "/" : `/${slug}`;
    case "landingPage": return `/${slug}`;
    case "post": return `/blog/${slug}`;
    case "service": return `/services/${slug}`;
    case "location": return `/locations/${slug}`;
    case "caseStudy": return `/projects/${slug}`;
    case "category": return `/blog/category/${slug}`;
    case "author": return `/authors/${slug}`;
    default: return null;
  }
}

export const sanityStudioConfig = defineConfig({
  name: "drivwon",
  title: "Drivwon Content Studio",
  // Sanity Studio only exposes env vars that start with SANITY_STUDIO_.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "v6luawxh",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: "2026-10-12" })],
  schema: {
    types: schemaTypes,
    // Hide singletons and system types from the global "Create" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !singletonTypes.has(schemaType) && !systemTypes.has(schemaType)),
  },
  document: {
    actions: (input, context) => {
      if (singletonTypes.has(context.schemaType)) return input.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action));
      // Duplicating a lead would create a PUBLIC copy (no dot in the ID), so only allow edit/publish/delete.
      if (systemTypes.has(context.schemaType)) return input.filter(({ action }) => action && ["publish", "discardChanges", "delete", "restore"].includes(action));
      return input;
    },
    productionUrl: async (prev, { document }) => {
      const path = pathFor(document as any);
      return path ? `${siteUrl}${path}` : prev;
    },
  },
});

export default sanityStudioConfig;
