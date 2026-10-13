import { defineArrayMember, defineField, defineType } from "sanity";

const image = defineField({
  name: "image",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() })],
});

const link = defineField({
  name: "link",
  title: "Button",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Button label", type: "string" }),
    defineField({ name: "href", title: "Destination", type: "string", description: "Use an internal path such as /contact or an absolute URL." }),
  ],
});

const block = defineType({
  name: "contentBlock",
  title: "Content block",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Body", type: "text", rows: 4 }),
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true }, fields: [defineField({ name: "alt", title: "Alt text", type: "string" })] }),
    defineField({ name: "videoUrl", title: "Video URL", type: "url", description: "Use a public MP4 or a supported embed URL." }),
    link,
  ],
  preview: { select: { title: "heading", subtitle: "eyebrow", media: "image" } },
});

export const heroSection = defineType({
  name: "heroSection",
  title: "Hero",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "subheading", title: "Supporting text", type: "text", rows: 3 }),
    image,
    defineField({ name: "videoUrl", title: "Background video URL", type: "url" }),
    defineField({ name: "primaryButton", title: "Primary button", type: "object", fields: [defineField({ name: "label", type: "string" }), defineField({ name: "href", type: "string" })] }),
    defineField({ name: "secondaryButton", title: "Secondary button", type: "object", fields: [defineField({ name: "label", type: "string" }), defineField({ name: "href", type: "string" })] }),
  ],
});

export const richTextSection = defineType({
  name: "richTextSection",
  title: "Rich text",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "body", title: "Content", type: "portableText" }),
  ],
});

export const imageSection = defineType({
  name: "imageSection",
  title: "Image",
  type: "object",
  fields: [defineField({ name: "heading", title: "Heading", type: "string" }), image, defineField({ name: "caption", title: "Caption", type: "string" })],
});

export const videoSection = defineType({
  name: "videoSection",
  title: "Video",
  type: "object",
  fields: [defineField({ name: "heading", title: "Heading", type: "string" }), defineField({ name: "videoUrl", title: "Video URL", type: "url", validation: (rule) => rule.required() }), defineField({ name: "caption", title: "Caption", type: "string" })],
});

export const featureGridSection = defineType({
  name: "featureGridSection",
  title: "Feature grid",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({ name: "intro", title: "Introduction", type: "text", rows: 3 }),
    defineField({
      name: "items",
      title: "Features",
      type: "array",
      of: [defineArrayMember({ type: "contentBlock" })],
      validation: (rule) => rule.max(12),
    }),
  ],
});

export const ctaSection = defineType({
  name: "ctaSection",
  title: "Call to action",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
    defineField({ name: "heading", title: "Heading", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "body", title: "Supporting text", type: "text", rows: 3 }),
    link,
  ],
});

export const faqSection = defineType({
  name: "faqSection",
  title: "Frequently asked questions",
  type: "object",
  fields: [
    defineField({ name: "heading", title: "Heading", type: "string" }),
    defineField({
      name: "items",
      title: "Questions",
      type: "array",
      of: [defineArrayMember({ type: "object", fields: [defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required() }), defineField({ name: "answer", title: "Answer", type: "text", rows: 3, validation: (rule) => rule.required() })] })],
    }),
  ],
});

export const testimonialSection = defineType({
  name: "testimonialSection",
  title: "Testimonial",
  type: "object",
  fields: [defineField({ name: "quote", title: "Quote", type: "text", rows: 4 }), defineField({ name: "name", title: "Name", type: "string" }), defineField({ name: "role", title: "Role / company", type: "string" }), image],
});

export const contentSections = [block, heroSection, richTextSection, imageSection, videoSection, featureGridSection, ctaSection, faqSection, testimonialSection];
