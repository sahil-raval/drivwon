import { defineArrayMember, defineField, defineType } from "sanity";
import { LinkIcon, PlayIcon } from "../../lib/icons";
import { routableTypes } from "../../lib/fields";

export const link = defineType({
  name: "link",
  title: "Link / button",
  type: "object",
  icon: LinkIcon,
  fields: [
    defineField({ name: "label", title: "Text", type: "string", description: "Use clear action words, e.g. “Get a free SEO audit”. Avoid “Click here”." }),
    defineField({
      name: "linkType",
      title: "Goes to",
      type: "string",
      initialValue: "internal",
      options: { list: [
        { title: "A page on this site", value: "internal" },
        { title: "Path on this site (e.g. /contact#form)", value: "path" },
        { title: "Another website", value: "external" },
        { title: "Phone call", value: "phone" },
        { title: "Email", value: "email" },
      ], layout: "radio" },
    }),
    defineField({ name: "internal", title: "Page", type: "reference", to: routableTypes.map((type) => ({ type })), hidden: ({ parent }) => parent?.linkType !== "internal" }),
    defineField({ name: "path", title: "Path", type: "string", description: "Starts with /. You can add #section-id to jump to a section.", hidden: ({ parent }) => parent?.linkType !== "path" }),
    defineField({ name: "url", title: "URL", type: "url", validation: (rule) => rule.uri({ scheme: ["http", "https"] }), hidden: ({ parent }) => parent?.linkType !== "external" }),
    defineField({ name: "phone", title: "Phone number", type: "string", hidden: ({ parent }) => parent?.linkType !== "phone" }),
    defineField({ name: "email", title: "Email", type: "string", hidden: ({ parent }) => parent?.linkType !== "email" }),
    defineField({ name: "style", title: "Style", type: "string", initialValue: "primary", options: { list: ["primary", "secondary", "ghost", "link"], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "newTab", title: "Open in new tab", type: "boolean", initialValue: false }),
    defineField({ name: "nofollow", title: "rel=nofollow / sponsored", type: "boolean", initialValue: false, description: "Tick for paid, affiliate or untrusted external links." }),
    defineField({ name: "trackingEvent", title: "Analytics event name", type: "string", description: "Optional. Sent to GA4/GTM when clicked, e.g. cta_hero_quote. Default is cta_click." }),
  ],
  preview: { select: { title: "label", type: "linkType", path: "path", url: "url" }, prepare: ({ title, type, path, url }) => ({ title: title || "(no text)", subtitle: path || url || type }) },
});

export const sectionSettings = defineType({
  name: "sectionSettings",
  title: "Section settings",
  type: "object",
  fields: [
    defineField({ name: "anchorId", title: "Anchor ID", type: "string", description: "Lets you link to this section with #anchor. Lowercase and hyphens, e.g. pricing.", validation: (rule) => rule.regex(/^[a-z0-9-]+$/, { name: "anchor" }) }),
    defineField({ name: "background", title: "Background", type: "string", initialValue: "default", options: { list: ["default", "black", "subtle", "primary", "gradient"], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "spacing", title: "Vertical spacing", type: "string", initialValue: "normal", options: { list: ["none", "small", "normal", "large"], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "width", title: "Content width", type: "string", initialValue: "normal", options: { list: ["narrow", "normal", "wide", "full"], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "align", title: "Text alignment", type: "string", initialValue: "left", options: { list: ["left", "center"], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "animate", title: "Animate on scroll", type: "boolean", initialValue: true }),
    defineField({ name: "hidden", title: "Hide this section", type: "boolean", initialValue: false, description: "Keeps the section saved but hides it from the live site." }),
    defineField({ name: "hideOn", title: "Hide on", type: "string", options: { list: [{ title: "Nothing", value: "" }, { title: "Mobile", value: "mobile" }, { title: "Desktop", value: "desktop" }] } }),
  ],
});

export const video = defineType({
  name: "video",
  title: "Video",
  type: "object",
  icon: PlayIcon,
  fields: [
    defineField({ name: "source", title: "Source", type: "string", initialValue: "upload", options: { list: [{ title: "Upload a file", value: "upload" }, { title: "YouTube", value: "youtube" }, { title: "Vimeo", value: "vimeo" }, { title: "MP4 URL", value: "url" }], layout: "radio", direction: "horizontal" } }),
    defineField({ name: "file", title: "Video file", type: "file", options: { accept: "video/mp4,video/webm" }, hidden: ({ parent }) => parent?.source !== "upload" }),
    defineField({ name: "url", title: "Video URL", type: "url", description: "YouTube, Vimeo or a direct .mp4 link.", hidden: ({ parent }) => parent?.source === "upload" }),
    defineField({ name: "title", title: "Video title", type: "string", description: "Used for VideoObject schema and accessibility." }),
    defineField({ name: "description", title: "Video description", type: "text", rows: 2 }),
    defineField({ name: "poster", title: "Thumbnail / poster", type: "image", options: { hotspot: true }, description: "Required for Google video results." }),
    defineField({ name: "duration", title: "Duration (ISO 8601)", type: "string", description: "e.g. PT1M30S for 1 min 30 sec." }),
    defineField({ name: "uploadDate", title: "Upload date", type: "date" }),
    defineField({ name: "transcript", title: "Transcript", type: "text", rows: 6, description: "Full words spoken in the video. Great for SEO, AI engines and accessibility." }),
    defineField({ name: "autoplay", title: "Autoplay muted loop (background style)", type: "boolean", initialValue: false }),
  ],
  preview: { select: { title: "title", subtitle: "source", media: "poster" } },
});

export const navItem = defineType({
  name: "navItem",
  title: "Menu item",
  type: "object",
  fields: [
    defineField({ name: "link", title: "Link", type: "link" }),
    defineField({ name: "description", title: "Short description (for mega menu)", type: "string" }),
    defineField({ name: "children", title: "Dropdown items", type: "array", of: [defineArrayMember({ type: "object", name: "navChild", fields: [defineField({ name: "link", type: "link" }), defineField({ name: "description", type: "string" })], preview: { select: { title: "link.label", subtitle: "description" } } })] }),
  ],
  preview: { select: { title: "link.label", children: "children" }, prepare: ({ title, children }) => ({ title: title || "Menu item", subtitle: children?.length ? `${children.length} dropdown items` : undefined }) },
});

export const openingHours = defineType({
  name: "openingHours",
  title: "Opening hours",
  type: "object",
  fields: [
    defineField({ name: "days", title: "Days", type: "array", of: [{ type: "string" }], options: { list: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] } }),
    defineField({ name: "opens", title: "Opens (24h, e.g. 09:00)", type: "string", validation: (rule) => rule.regex(/^\d{2}:\d{2}$/) }),
    defineField({ name: "closes", title: "Closes (24h, e.g. 17:30)", type: "string", validation: (rule) => rule.regex(/^\d{2}:\d{2}$/) }),
    defineField({ name: "byAppointment", title: "By appointment only", type: "boolean", initialValue: false }),
  ],
  preview: { select: { days: "days", opens: "opens", closes: "closes" }, prepare: ({ days, opens, closes }) => ({ title: (days ?? []).join(", ") || "Days", subtitle: `${opens ?? "?"} – ${closes ?? "?"}` }) },
});

/** A real-world thing a page is about. Helps Google and AI engines link the page to known entities. */
export const entity = defineType({
  name: "entity",
  title: "Entity",
  type: "object",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "type", title: "Schema type", type: "string", initialValue: "Thing", options: { list: ["Thing", "Place", "City", "Organization", "Person", "Service", "Product", "SoftwareApplication", "Event", "DefinedTerm"] } }),
    defineField({ name: "sameAs", title: "Reference URLs", type: "array", of: [{ type: "url" }], description: "Wikipedia, Wikidata or official pages for this entity, e.g. https://en.wikipedia.org/wiki/Geelong" }),
  ],
  preview: { select: { title: "name", subtitle: "type" } },
});

export const keyValue = defineType({
  name: "keyValue",
  title: "Label & value",
  type: "object",
  fields: [defineField({ name: "label", type: "string" }), defineField({ name: "value", type: "string" })],
  preview: { select: { title: "value", subtitle: "label" } },
});

export const formField = defineType({
  name: "formField",
  title: "Form field",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Label", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "name", title: "Field key", type: "string", description: "Lowercase, no spaces. Use name, email, phone, company, website, service, budget or message so leads map correctly.", validation: (rule) => rule.required().regex(/^[a-z][a-zA-Z0-9_]*$/) }),
    defineField({ name: "type", title: "Type", type: "string", initialValue: "text", options: { list: ["text", "email", "tel", "url", "number", "textarea", "select", "radio", "checkbox", "date"] } }),
    defineField({ name: "placeholder", title: "Placeholder", type: "string" }),
    defineField({ name: "help", title: "Help text", type: "string" }),
    defineField({ name: "options", title: "Choices", type: "array", of: [{ type: "string" }], hidden: ({ parent }) => !["select", "radio"].includes(parent?.type) }),
    defineField({ name: "required", title: "Required", type: "boolean", initialValue: false }),
    defineField({ name: "width", title: "Width", type: "string", initialValue: "full", options: { list: ["full", "half"], layout: "radio", direction: "horizontal" } }),
  ],
  preview: { select: { title: "label", subtitle: "type" } },
});
