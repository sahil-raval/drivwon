import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { pathForDoc } from "@shared/cms/routes";
import { slugifyHeading } from "@shared/seo/text";
import { CmsImage, CmsLink, CmsVideo } from "./ui";
import { cn } from "@/lib/utils";

const text = (value: any) => (value?.children ?? []).map((child: any) => child.text ?? "").join("");

const calloutIcons: Record<string, any> = { info: Info, tip: Lightbulb, warning: AlertTriangle, success: CheckCircle2 };

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="my-5 text-lg leading-relaxed text-white/80">{children}</p>,
    lead: ({ children }) => <p className="my-6 text-xl leading-relaxed text-white md:text-2xl">{children}</p>,
    h2: ({ children, value }) => <h2 id={slugifyHeading(text(value))} className="mt-14 mb-4 scroll-mt-28 font-display text-3xl font-bold text-white md:text-4xl">{children}</h2>,
    h3: ({ children, value }) => <h3 id={slugifyHeading(text(value))} className="mt-10 mb-3 scroll-mt-28 font-display text-2xl font-semibold text-white">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-8 mb-2 text-xl font-semibold text-white">{children}</h4>,
    blockquote: ({ children }) => <blockquote className="my-8 border-l-4 border-primary pl-6 text-xl italic text-white/90">{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-lg text-white/80 marker:text-primary">{children}</ul>,
    number: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-lg text-white/80 marker:text-primary">{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    highlight: ({ children }) => <mark className="rounded bg-primary/25 px-1 text-white">{children}</mark>,
    code: ({ children }) => <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[.9em]">{children}</code>,
    "strike-through": ({ children }) => <s>{children}</s>,
    underline: ({ children }) => <u>{children}</u>,
    link: ({ value, children }) => {
      const href = value?.href ?? "";
      const external = /^https?:/.test(href);
      const rel = [external && value?.blank ? "noopener noreferrer" : "", value?.rel].filter(Boolean).join(" ") || undefined;
      return <a href={href} target={value?.blank ? "_blank" : undefined} rel={rel} className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children}</a>;
    },
    internalLink: ({ value, children }) => {
      const href = value?.ref ? `${pathForDoc(value.ref)}${value.anchor ? `#${value.anchor}` : ""}` : "#";
      return <Link href={href} className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children}</Link>;
    },
  },
  types: {
    inlineImage: ({ value }) => (
      <figure className={cn("my-10", value.size === "wide" && "md:-mx-16", value.size === "full" && "md:-mx-32")}>
        <CmsImage image={value} width={1400} className="w-full rounded-2xl" sizes="(min-width: 1024px) 900px, 100vw" />
        {value.caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{value.caption}</figcaption>}
      </figure>
    ),
    video: ({ value }) => <div className="my-10"><CmsVideo video={value} /></div>,
    callout: ({ value }) => {
      const IconComponent = calloutIcons[value.tone] ?? Info;
      return <aside className="my-8 flex gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-6"><IconComponent className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden /><div>{value.title && <p className="font-semibold text-white">{value.title}</p>}<p className="mt-1 text-white/80">{value.text}</p></div></aside>;
    },
    keyTakeaways: ({ value }) => (
      <section className="my-10 rounded-2xl border border-white/10 bg-white/[.04] p-6 md:p-8" aria-label={value.title}>
        <p className="mb-4 font-display text-xl font-bold text-white">{value.title || "Key takeaways"}</p>
        <ul className="space-y-3">{(value.items ?? []).map((item: string) => <li key={item} className="flex gap-3 text-white/85"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />{item}</li>)}</ul>
      </section>
    ),
    inlineFaq: ({ value }) => (
      <div className="my-10 divide-y divide-white/10 rounded-2xl border border-white/10">
        {(value.items ?? []).map((qa: any) => <details key={qa._key ?? qa.question} className="group p-5"><summary className="cursor-pointer list-none font-semibold text-white">{qa.question}</summary><p className="mt-3 text-white/75">{qa.answer}</p></details>)}
      </div>
    ),
    ctaBlock: ({ value }) => (
      <aside className="my-10 rounded-3xl bg-gradient-to-br from-primary/25 to-primary/5 p-8 text-center">
        {value.heading && <p className="font-display text-2xl font-bold text-white">{value.heading}</p>}
        {value.text && <p className="mx-auto mt-2 max-w-xl text-white/80">{value.text}</p>}
        <div className="mt-5 flex justify-center"><CmsLink link={value.link} /></div>
      </aside>
    ),
    codeBlock: ({ value }) => <pre className="my-8 overflow-x-auto rounded-2xl bg-black p-5 text-sm text-white/90"><code data-language={value.language}>{value.code}</code></pre>,
    table: ({ value }) => (
      <div className="my-10 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          {value.caption && <caption className="p-3 text-left text-muted-foreground">{value.caption}</caption>}
          <tbody>{(value.rows ?? []).map((row: any, index: number) => <tr key={row._key ?? index} className="border-t border-white/10 first:border-0">{(row.cells ?? []).map((cell: string, cellIndex: number) => index === 0 ? <th key={cellIndex} scope="col" className="bg-white/5 p-3 font-semibold text-white">{cell}</th> : <td key={cellIndex} className="p-3 text-white/80">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    ),
    embed: ({ value }) => value.url ? <iframe src={value.url} title={value.title} loading="lazy" className="my-10 w-full rounded-2xl border-0 bg-white" style={{ height: value.height || 480 }} /> : null,
  },
};

export default function RichText({ value, className }: { value?: any[]; className?: string }) {
  if (!value?.length) return null;
  return <div className={cn("rich-text max-w-none", className)}><PortableText value={value} components={components} /></div>;
}
