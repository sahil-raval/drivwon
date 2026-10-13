import { defineArrayMember, defineField, defineType } from "sanity";

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
        { title: "Quote", value: "blockquote" },
      ],
      marks: {
        decorators: [{ title: "Strong", value: "strong" }, { title: "Emphasis", value: "em" }],
        annotations: [
          defineType({
            name: "link",
            title: "Link",
            type: "object",
            fields: [
              defineField({ name: "href", title: "URL", type: "url" }),
              defineField({ name: "blank", title: "Open in new tab", type: "boolean", initialValue: false }),
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
      fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
    }),
  ],
});
