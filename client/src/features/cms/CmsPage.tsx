import { Link } from "wouter";
import { PortableText } from "@portabletext/react";
import { ArrowRight } from "lucide-react";
import { useSanityPage } from "./useSanityPage";
import { imageUrl } from "./client";
import type { SanityPage } from "./types";
import type { ComponentType } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageSEO from "./PageSEO";

function ActionLink({ link, primary = false }: { link?: { label?: string; href?: string }; primary?: boolean }) {
  if (!link?.label || !link.href) return null;
  const classes = `inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-colors ${primary ? "bg-primary text-white hover:bg-primary/90" : "border border-white/20 text-white hover:bg-white/10"}`;
  return link.href.startsWith("/") ? (
    <Link href={link.href} className={classes}>{link.label} <ArrowRight size={16} /></Link>
  ) : (
    <a href={link.href} className={classes} target="_blank" rel="noreferrer">{link.label} <ArrowRight size={16} /></a>
  );
}

function Section({ section }: { section: SanityPage["sections"][number] }) {
  const image = imageUrl(section.image, 1800);
  if (section._type === "heroSection") {
    return (
      <section className="relative flex min-h-[72vh] items-center overflow-hidden px-6 py-28">
        {image && <img src={image} alt={section.image?.alt ?? ""} className="absolute inset-0 h-full w-full object-cover opacity-35" />}
        {section.videoUrl && <video className="absolute inset-0 h-full w-full object-cover opacity-35" src={section.videoUrl} autoPlay muted loop playsInline aria-hidden="true" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/75 to-background" />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {section.eyebrow && <p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-primary">{section.eyebrow}</p>}
          <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] md:text-7xl">{section.heading}</h1>
          {section.subheading && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">{section.subheading}</p>}
          <div className="mt-8 flex flex-wrap gap-3"><ActionLink link={section.primaryButton} primary /><ActionLink link={section.secondaryButton} /></div>
        </div>
      </section>
    );
  }
  if (section._type === "richTextSection") {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20">
        {section.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-primary">{section.eyebrow}</p>}
        {section.heading && <h2 className="mb-8 text-3xl font-bold md:text-5xl">{section.heading}</h2>}
        {section.body && <div className="prose prose-invert prose-lg max-w-none"><PortableText value={section.body} /></div>}
      </section>
    );
  }
  if (section._type === "imageSection" && image) {
    return <figure className="mx-auto max-w-6xl px-6 py-10"><img src={image} alt={section.image?.alt ?? ""} className="max-h-[70vh] w-full rounded-3xl object-cover" />{section.caption && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{section.caption}</figcaption>}</figure>;
  }
  if (section._type === "videoSection") {
    return <section className="mx-auto max-w-6xl px-6 py-12">{section.heading && <h2 className="mb-6 text-3xl font-bold">{section.heading}</h2>}<video controls playsInline preload="metadata" src={section.videoUrl} className="aspect-video w-full rounded-3xl bg-black" />{section.caption && <p className="mt-3 text-sm text-muted-foreground">{section.caption}</p>}</section>;
  }
  if (section._type === "featureGridSection") {
    return (
      <section className="mx-auto max-w-6xl px-6 py-20">
        {section.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-primary">{section.eyebrow}</p>}
        {section.heading && <h2 className="mb-4 text-3xl font-bold md:text-5xl">{section.heading}</h2>}
        {section.intro && <p className="mb-10 max-w-2xl text-muted-foreground">{section.intro}</p>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(section.items ?? []).map((item: any) => <article key={item._key} className="rounded-2xl border border-white/10 bg-white/[.035] p-7">{item.image && <img src={imageUrl(item.image, 900)} alt={item.image?.alt ?? ""} className="mb-5 aspect-[16/10] w-full rounded-xl object-cover" />}{item.eyebrow && <p className="mb-2 text-xs uppercase tracking-wider text-primary">{item.eyebrow}</p>}{item.heading && <h3 className="mb-3 text-xl font-semibold">{item.heading}</h3>}{item.body && <p className="leading-relaxed text-muted-foreground">{item.body}</p>}{item.link && <div className="mt-5"><ActionLink link={item.link} /></div>}</article>)}
        </div>
      </section>
    );
  }
  if (section._type === "ctaSection") {
    return <section className="mx-auto max-w-6xl px-6 py-20"><div className="rounded-3xl bg-primary/10 px-7 py-14 text-center md:px-16">{section.eyebrow && <p className="mb-3 text-sm uppercase tracking-widest text-primary">{section.eyebrow}</p>}<h2 className="text-3xl font-bold md:text-5xl">{section.heading}</h2>{section.body && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{section.body}</p>}<div className="mt-8 flex justify-center"><ActionLink link={section.link} primary /></div></div></section>;
  }
  if (section._type === "faqSection") {
    return <section className="mx-auto max-w-4xl px-6 py-16"><h2 className="mb-8 text-3xl font-bold">{section.heading ?? "Frequently asked questions"}</h2><div className="divide-y divide-white/10">{(section.items ?? []).map((item: any) => <details key={item._key} className="py-5"><summary className="cursor-pointer font-semibold">{item.question}</summary><p className="mt-3 leading-relaxed text-muted-foreground">{item.answer}</p></details>)}</div></section>;
  }
  if (section._type === "testimonialSection") {
    return <section className="mx-auto max-w-4xl px-6 py-20 text-center"><blockquote className="text-2xl leading-relaxed md:text-4xl">“{section.quote}”</blockquote><p className="mt-6 font-semibold">{section.name}</p>{section.role && <p className="text-sm text-muted-foreground">{section.role}</p>}</section>;
  }
  return null;
}

export default function CmsPage({ slug, fallback: Fallback }: { slug: string; fallback?: ComponentType }) {
  const { page, loading } = useSanityPage(slug);
  if (!page && loading && !Fallback) return <div className="min-h-screen bg-background" aria-label="Loading page" />;
  if (!page) return Fallback ? <Fallback /> : <div className="min-h-screen bg-background"><Navbar /><main className="mx-auto max-w-4xl px-6 py-40"><h1 className="text-4xl font-bold">Page not found</h1><p className="mt-4 text-muted-foreground">This page is not published yet.</p></main><Footer /></div>;
  return <div className="min-h-screen overflow-x-hidden bg-background text-foreground"><PageSEO data={{ title: page.title, seo: page.seo, path: slug === "home" ? "/" : `/${slug}` }} /><Navbar /><main>{page.sections?.map((section) => <Section key={section._key} section={section} />)}</main><Footer /></div>;
}
