import { useEffect, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, ExternalLink, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { track } from "@/features/analytics/tracking";
import { pathForDoc } from "@shared/cms/routes";
import { firstHero } from "@shared/seo/text";
import { builtInPages } from "@shared/seo/builtins";
import { useCmsRoute } from "./client";
import Head from "./Head";
import RichText from "./RichText";
import Sections, { ProjectCards } from "./Sections";
import { Breadcrumbs, CmsImage, CmsLink, SectionShell } from "./ui";

const sectionLabel: Record<string, [string, string]> = { service: ["Services", "/services"], location: ["Areas we serve", "/locations"], caseStudy: ["Projects", "/projects"] };

export function Loading() {
  return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading page" />;
}

export function NotFoundView({ path }: { path: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head doc={null} path={path} fallback={{ title: "Page not found | Drivwon", description: "This page does not exist.", noIndex: true }} />
      <Navbar />
      <main id="main" className="mx-auto max-w-4xl px-6 py-40">
        <p className="text-sm font-semibold uppercase tracking-[.2em] text-primary">404</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-white">Page not found</h1>
        <p className="mt-4 text-lg text-muted-foreground">The page may have moved. Try one of these instead:</p>
        <ul className="mt-6 flex flex-wrap gap-3">{[["/", "Home"], ["/services", "Services"], ["/blog", "Blog"], ["/contact", "Contact"]].map(([href, label]) => <li key={href}><Link href={href} className="rounded-full border border-white/15 px-5 py-2 text-white hover:border-primary">{label}</Link></li>)}</ul>
      </main>
      <Footer />
    </div>
  );
}

function DocExtras({ doc }: { doc: any }) {
  if (doc._type === "service") {
    return (
      <>
        {(doc.deliverables?.length || doc.priceFrom || doc.turnaround) && (
          <SectionShell settings={{ spacing: "normal" }}>
            <div className="grid gap-8 rounded-3xl border border-white/10 bg-white/[.03] p-8 md:grid-cols-[2fr_1fr] md:p-12">
              {doc.deliverables?.length > 0 && <div><h2 className="font-display text-3xl font-bold text-white">What is included</h2><ul className="mt-6 grid gap-3 sm:grid-cols-2">{doc.deliverables.map((item: string) => <li key={item} className="flex gap-3 text-white/85"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />{item}</li>)}</ul></div>}
              <dl className="space-y-5">
                {doc.priceFrom && <div><dt className="text-sm text-muted-foreground">Price</dt><dd className="font-display text-3xl font-bold text-white">From ${doc.priceFrom.toLocaleString("en-AU")}{doc.priceTo ? `–$${doc.priceTo.toLocaleString("en-AU")}` : ""}</dd>{doc.priceUnit && <dd className="text-sm text-muted-foreground">{doc.priceUnit}, AUD</dd>}</div>}
                {doc.turnaround && <div><dt className="text-sm text-muted-foreground">Typical timeframe</dt><dd className="text-lg text-white">{doc.turnaround}</dd></div>}
                <Link href="/quotation" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white" data-track="service_quote_click">Get a quote <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </dl>
            </div>
          </SectionShell>
        )}
        {doc.caseStudies?.length > 0 && <SectionShell><h2 className="mb-10 font-display text-3xl font-bold text-white md:text-5xl">Recent {doc.shortTitle || doc.title} work</h2><ProjectCards list={doc.caseStudies} /></SectionShell>}
      </>
    );
  }
  if (doc._type === "caseStudy") {
    return (
      <SectionShell settings={{ width: "narrow" }}>
        <dl className="mb-12 grid gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-6 sm:grid-cols-2">
          {[["Client", doc.client], ["Industry", doc.industry], ["Location", doc.clientLocation], ["Year", doc.year], ["Services", doc.services?.map((service: any) => service.shortTitle || service.title).join(", ")], ["Tech", doc.tech?.join(", ")]].filter(([, value]) => value).map(([label, value]) => <div key={label as string}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-white">{value}</dd></div>)}
          {doc.websiteUrl && <div><dt className="text-sm text-muted-foreground">Website</dt><dd><a href={doc.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">Visit site <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></dd></div>}
        </dl>
        {doc.results?.length > 0 && <dl className="mb-12 grid gap-4 sm:grid-cols-3">{doc.results.map((result: any) => <div key={result._key} className="rounded-2xl bg-primary/10 p-6 text-center"><dd className="font-display text-4xl font-bold text-white">{result.value}</dd><dt className="mt-1 text-sm text-white/70">{result.label}</dt></div>)}</dl>}
        {doc.challenge?.length > 0 && <><h2 className="font-display text-3xl font-bold text-white">The challenge</h2><RichText value={doc.challenge} /></>}
        {doc.solution?.length > 0 && <><h2 className="mt-12 font-display text-3xl font-bold text-white">What we did</h2><RichText value={doc.solution} /></>}
        {doc.gallery?.length > 0 && <div className="mt-12 grid gap-4 sm:grid-cols-2">{doc.gallery.map((image: any) => <CmsImage key={image._key} image={image} width={900} className="w-full rounded-2xl" />)}</div>}
        {doc.testimonial && <figure className="mt-12 rounded-3xl border border-white/10 p-8"><blockquote className="text-xl text-white">“{doc.testimonial.quote}”</blockquote><figcaption className="mt-4 text-muted-foreground">{doc.testimonial.name}{doc.testimonial.company ? `, ${doc.testimonial.company}` : ""}</figcaption></figure>}
      </SectionShell>
    );
  }
  if (doc._type === "location") {
    return (
      <>
        {doc.services?.length > 0 && <SectionShell><h2 className="mb-8 font-display text-3xl font-bold text-white md:text-4xl">Services in {doc.name}</h2><ul className="grid gap-4 md:grid-cols-3">{doc.services.map((service: any) => <li key={service._id}><Link href={pathForDoc(service)} className="block h-full rounded-2xl border border-white/10 bg-white/[.03] p-6 hover:border-primary"><span className="font-display text-xl font-bold text-white">{service.shortTitle || service.title}</span>{service.summary && <span className="mt-2 block text-muted-foreground">{service.summary}</span>}</Link></li>)}</ul></SectionShell>}
        {doc.localProof?.length > 0 && <SectionShell><h2 className="mb-10 font-display text-3xl font-bold text-white md:text-4xl">Work for {doc.name} businesses</h2><ProjectCards list={doc.localProof} /></SectionShell>}
        {doc.nearby?.length > 0 && <SectionShell settings={{ spacing: "small" }}><h2 className="mb-5 font-display text-2xl font-bold text-white">Nearby areas we serve</h2><ul className="flex flex-wrap gap-3">{doc.nearby.map((place: any) => <li key={place._id}><Link href={pathForDoc(place)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-white hover:border-primary"><MapPin className="h-4 w-4" aria-hidden />{place.name || place.title}</Link></li>)}</ul></SectionShell>}
      </>
    );
  }
  return null;
}

function DocFaqs({ faqs }: { faqs?: any[] }) {
  if (!faqs?.length) return null;
  return <Sections sections={[{ _type: "faqSection", _key: "doc-faqs", items: faqs }]} />;
}

function RelatedServices({ list, title = "Related services" }: { list?: any[]; title?: string }) {
  if (!list?.length) return null;
  return <SectionShell settings={{ spacing: "small" }}><h2 className="mb-6 font-display text-2xl font-bold text-white">{title}</h2><ul className="flex flex-wrap gap-3">{list.map((service) => <li key={service._id}><Link href={pathForDoc(service)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-white hover:border-primary">{service.shortTitle || service.title}<ArrowRight className="h-4 w-4" aria-hidden /></Link></li>)}</ul></SectionShell>;
}

/** Renders any section-based CMS document. */
export function DocumentView({ doc, path }: { doc: any; path: string }) {
  const landing = doc._type === "landingPage";
  const expired = landing && doc.expiresAt && new Date(doc.expiresAt) < new Date();
  const hero = firstHero(doc);
  const parent = sectionLabel[doc._type];
  const crumbs = path === "/" ? [] : [{ name: "Home", href: "/" }, ...(parent ? [{ name: parent[0], href: parent[1] }] : []), ...(doc.parent?.slug ? [{ name: doc.parent.title, href: pathForDoc(doc.parent) }] : []), { name: doc.seo?.breadcrumbTitle || doc.title }];
  const showCrumbs = !landing && doc.showBreadcrumbs !== false && crumbs.length > 1;

  useEffect(() => {
    document.documentElement.toggleAttribute("data-hide-chat", Boolean(landing && doc.hideChatbot));
    return () => document.documentElement.removeAttribute("data-hide-chat");
  }, [landing, doc.hideChatbot]);

  useEffect(() => {
    if (!landing) return;
    track("landing_page_view", { campaign: doc.campaign, variant: doc.variant, channel: doc.channel });
    for (const event of doc.headScripts ?? []) track(event, { campaign: doc.campaign });
  }, [doc._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Head doc={doc} path={path} />
      <Navbar minimal={landing && doc.hideNavigation} />
      <main id="main">
        {showCrumbs && <div className={hero ? "absolute left-0 right-0 top-24 z-20 mx-auto max-w-6xl px-6" : "mx-auto max-w-6xl px-6 pt-32"}><Breadcrumbs items={crumbs} /></div>}
        {!hero && (
          <header className={`mx-auto max-w-6xl px-6 ${showCrumbs ? "pt-2" : "pt-36"} pb-6`}>
            <h1 className="font-display text-5xl font-bold leading-tight text-white md:text-7xl">{doc.title}</h1>
            {doc.summary && <p className="mt-6 max-w-3xl text-xl text-muted-foreground">{doc.summary}</p>}
            {doc._type === "caseStudy" && doc.mainImage && <CmsImage image={doc.mainImage} priority width={1600} className="mt-10 w-full rounded-3xl object-cover" />}
          </header>
        )}
        {expired ? (
          <SectionShell settings={{ width: "narrow" }}><p className="rounded-2xl border border-white/10 p-8 text-lg text-white">{doc.expiredMessage || "This offer has ended."}</p><Link href="/contact" className="mt-6 inline-block text-primary">Contact us</Link></SectionShell>
        ) : (
          <>
            {doc.seo?.quickAnswer && !(doc.sections ?? []).some((section: any) => section._type === "quickAnswerSection") && (
              <Sections sections={[{ _type: "quickAnswerSection", _key: "seo-quick-answer", question: doc.seo.focusKeyword ? `${doc.title}: the short answer` : "The short answer", answer: doc.seo.quickAnswer, points: doc.seo.keyFacts, label: "Quick answer" }]} />
            )}
            <Sections sections={doc.sections} campaign={doc.campaign} />
            <DocExtras doc={doc} />
            <DocFaqs faqs={doc.faqs} />
            <RelatedServices list={doc.relatedServices} />
          </>
        )}
      </main>
      <Footer minimal={landing && doc.hideFooter} />
      {landing && doc.stickyCta?.label && !expired && (
        <div className="fixed inset-x-0 bottom-0 z-40 hidden justify-center border-t border-white/10 bg-background/95 p-3 backdrop-blur md:flex">
          <CmsLink link={doc.stickyCta} className="px-8" arrow={false} />
        </div>
      )}
    </div>
  );
}

/** Route component: loads the CMS document for the current URL, else shows the built-in fallback page or a 404. */
export default function CmsPage({ fallback: Fallback }: { fallback?: ComponentType }) {
  const [path] = useLocation();
  const { data, loading, match } = useCmsRoute(path);
  if (loading) return <Loading />;
  if (data && match.kind !== "blogIndex") return <DocumentView doc={data} path={path} />;
  if (Fallback) return <><Head doc={null} path={path} fallback={builtInPages[path]} /><Fallback /></>;
  return <NotFoundView path={path} />;
}
