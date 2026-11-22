/* Helpers to turn CMS content into plain text, headings and FAQ lists. Shared by browser and server. */

type Block = { _type?: string; _key?: string; style?: string; children?: Array<{ text?: string }>; [key: string]: any };

export function ptToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return typeof blocks === "string" ? blocks : "";
  return (blocks as Block[])
    .map((block) => {
      if (block?._type === "block") return (block.children ?? []).map((child) => child.text ?? "").join("");
      if (block?._type === "callout") return [block.title, block.text].filter(Boolean).join(". ");
      if (block?._type === "keyTakeaways") return (block.items ?? []).join(". ");
      if (block?._type === "inlineFaq") return (block.items ?? []).map((item: any) => `${item.question} ${item.answer}`).join(" ");
      if (block?._type === "table") return (block.rows ?? []).map((row: any) => (row.cells ?? []).join(" ")).join(" ");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function slugifyHeading(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
}

export function headingsFromPt(blocks: unknown) {
  if (!Array.isArray(blocks)) return [] as Array<{ id: string; text: string; level: number }>;
  return (blocks as Block[])
    .filter((block) => block?._type === "block" && ["h2", "h3"].includes(block.style ?? ""))
    .map((block) => {
      const text = (block.children ?? []).map((child) => child.text ?? "").join("");
      return { id: slugifyHeading(text), text, level: block.style === "h2" ? 2 : 3 };
    })
    .filter((heading) => heading.text);
}

/** Plain text of all visible sections — used for word counts and crawler HTML. */
export function sectionsText(sections: unknown): string {
  if (!Array.isArray(sections)) return "";
  return sections
    .map((section: any) => {
      if (!section || section.settings?.hidden) return "";
      if (section._type === "reusableSectionRef") return sectionsText(section.resolved);
      const parts: string[] = [section.eyebrow, section.heading, section.subheading, section.intro, section.question, section.answer, section.quote, section.caption, section.note];
      parts.push(ptToText(section.body), ptToText(section.sideText));
      for (const list of [section.items, section.steps, section.plans]) {
        if (Array.isArray(list)) parts.push(list.map((item: any) => [item.title, item.name, item.question, item.body, item.answer, item.description, item.value, item.label, ...(item.bullets ?? []), ...(item.features ?? [])].filter(Boolean).join(" ")).join(" "));
      }
      for (const list of [section.points, section.bullets, section.trustItems]) if (Array.isArray(list)) parts.push(list.join(" "));
      return parts.filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join("\n");
}

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(chars?: number | null) {
  return Math.max(1, Math.round((chars ?? 0) / 1100));
}

export type QA = { question: string; answer: string };

/** Every question-and-answer pair visible on a document (for FAQPage schema). */
export function collectFaqs(doc: any): QA[] {
  const out: QA[] = [];
  const push = (items?: any[]) => {
    for (const item of items ?? []) if (item?.question && item?.answer) out.push({ question: String(item.question), answer: String(item.answer) });
  };
  const walk = (sections?: any[]) => {
    for (const section of sections ?? []) {
      if (!section || section.settings?.hidden) continue;
      if (section._type === "reusableSectionRef") walk(section.resolved);
      if (section._type === "faqSection" && section.schema !== false) { push(section.items); push(section.faqList); }
    }
  };
  walk(doc?.sections);
  push(doc?.faqs);
  if (Array.isArray(doc?.body)) for (const block of doc.body) if (block?._type === "inlineFaq") push(block.items);
  const seen = new Set<string>();
  return out.filter((qa) => (seen.has(qa.question) ? false : (seen.add(qa.question), true)));
}

export function firstHero(doc: any) {
  const sections: any[] = doc?.sections ?? [];
  return sections.find((section) => section?._type === "heroSection" && !section.settings?.hidden);
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}
