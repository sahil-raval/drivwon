import { defineArrayMember, defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "siteName", title: "Business name", type: "string", initialValue: "Drivwon" }),
    defineField({ name: "tagline", title: "Tagline", type: "string" }),
    defineField({ name: "logo", title: "Logo", type: "image", options: { hotspot: true }, fields: [defineField({ name: "alt", title: "Alt text", type: "string" })] }),
    defineField({ name: "defaultSeo", title: "Default SEO", type: "seo" }),
    defineField({ name: "addressLocality", title: "Locality", type: "string", initialValue: "Geelong" }),
    defineField({ name: "addressRegion", title: "State / region", type: "string", initialValue: "Victoria" }),
    defineField({ name: "addressCountry", title: "Country code", type: "string", initialValue: "AU" }),
    defineField({ name: "email", title: "Contact email", type: "string" }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "navigation", title: "Navigation", type: "array", of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", title: "Label", type: "string" }), defineField({ name: "href", title: "Path", type: "string" })] })] }),
    defineField({ name: "footerText", title: "Footer text", type: "text", rows: 3 }),
    defineField({ name: "socialLinks", title: "Social links", type: "array", of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", title: "Network", type: "string" }), defineField({ name: "url", title: "URL", type: "url" })] })] }),
    defineField({ name: "googleSiteVerification", title: "Google Search Console verification", type: "string" }),
    defineField({ name: "footerServices", title: "Footer services", type: "array", of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", title: "Label", type: "string" }), defineField({ name: "href", title: "Optional link", type: "string" })] })] }),
    defineField({ name: "footerLinks", title: "Footer company links", type: "array", of: [defineArrayMember({ type: "object", fields: [defineField({ name: "label", title: "Label", type: "string" }), defineField({ name: "href", title: "Path", type: "string" })] })] }),
  ],
  preview: { select: { title: "siteName", subtitle: "tagline", media: "logo" } },
});
