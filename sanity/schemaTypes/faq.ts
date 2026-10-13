import { defineField, defineType } from "sanity";

export const faq = defineType({
  name: "faq",
  title: "Chatbot answer",
  type: "document",
  fields: [
    defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "answer", title: "Answer", type: "text", rows: 4, validation: (rule) => rule.required() }),
    defineField({ name: "keywords", title: "Matching words", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "order", title: "Display order", type: "number", initialValue: 0 }),
    defineField({ name: "active", title: "Available to chatbot", type: "boolean", initialValue: true }),
  ],
  preview: { select: { title: "question", subtitle: "answer" } },
});
