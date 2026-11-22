import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, Clock, Mail, MapPin, Phone, Quote, Star } from "lucide-react";
import { pathForDoc } from "@shared/cms/routes";
import { readingMinutes } from "@shared/seo/text";
import TextReveal from "@/components/ui/TextReveal";
import { cn } from "@/lib/utils";
import LeadForm from "@/features/leads/LeadForm";
import RichText from "./RichText";
import { Buttons, CmsImage, CmsLink, CmsVideo, Heading, Icon, SectionIntro, SectionShell } from "./ui";
import { useSiteSettings } from "./useSiteSettings";

type Section = Record<string, any> & { _type: string; _key: string };

const gridCols: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" };

function Reveal({ children, enabled = true, delay = 0, className }: { children: React.ReactNode; enabled?: boolean; delay?: number; className?: string }) {
  if (!enabled) return <div className={className}>{children}</div>;
  return <motion.div className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay }}>{children}</motion.div>;
}

function Hero({ section, isFirst }: { section: Section; isFirst: boolean }) {
  const settings = useSiteSettings();
  const layout = section.layout ?? "centered";
  const centered = layout === "centered" || layout === "fullscreen";
  const level = isFirst ? "h1" : "h2";
  const HeadingTag = level as "h1" | "h2";
  const heading = section.heading ?? "";
  const highlight = section.highlight && heading.includes(section.highlight) ? section.highlight : null;
  const headingContent = highlight ? <>{heading.split(highlight)[0]}<span className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">{highlight}</span>{heading.split(highlight).slice(1).join(highlight)}</> : centered && isFirst ? <TextReveal text={heading} /> : heading;
  const media = section.video?.autoplay || (section.video && layout !== "split") ? <CmsVideo video={section.video} background className="absolute inset-0 h-full w-full object-cover opacity-35" /> : section.image && layout !== "split" ? <CmsImage image={section.image} priority={isFirst} width={1920} className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null;
  return (
    <section id={section.settings?.anchorId} className={cn("relative flex items-center overflow-hidden px-6", layout === "fullscreen" ? "min-h-[100svh]" : layout === "minimal" ? "pt-36 pb-12" : "min-h-[78svh] pt-32 pb-20")}>
      {media}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,.20),transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-background" />
      <div className={cn("relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12", layout === "split" && "lg:grid-cols-2")}>
        <div className={cn(centered && "mx-auto max-w-4xl text-center")}>
          {section.eyebrow && <p className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[.16em] text-primary">{section.eyebrow}</p>}
          <HeadingTag className="font-display text-5xl font-bold leading-[1.04] tracking-tight text-white md:text-7xl">{headingContent}</HeadingTag>
          {section.subheading && <p className={cn("mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl", centered && "mx-auto max-w-2xl")}>{section.subheading}</p>}
          <Buttons buttons={section.buttons} className={cn("mt-9", centered && "justify-center")} />
          {(section.trustItems?.length || (section.showRating && settings?.rating?.value)) && (
            <ul className={cn("mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70", centered && "justify-center")}>
              {section.showRating && settings?.rating?.value && <li className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />{settings.rating.value} on Google{settings.rating.count ? ` (${settings.rating.count} reviews)` : ""}</li>}
              {(section.trustItems ?? []).map((item: string) => <li key={item} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" aria-hidden />{item}</li>)}
            </ul>
          )}
        </div>
        {layout === "split" && (section.video ? <CmsVideo video={section.video} /> : <CmsImage image={section.image} priority={isFirst} width={1100} className="w-full rounded-3xl border border-white/10 object-cover shadow-2xl" sizes="(min-width: 1024px) 50vw, 100vw" />)}
      </div>
    </section>
  );
}

function QuickAnswer({ section }: { section: Section }) {
  return (
    <SectionShell settings={{ spacing: "small", width: "narrow", ...section.settings }}>
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-7 md:p-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-primary">{section.label || "Quick answer"}</p>
        <h2 className="font-display text-2xl font-bold text-white md:text-3xl">{section.question}</h2>
        <p className="quick-answer mt-4 text-lg leading-relaxed text-white/85">{section.answer}</p>
        {section.points?.length > 0 && <ul className="mt-5 space-y-2">{section.points.map((point: string) => <li key={point} className="flex gap-3 text-white/80"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />{point}</li>)}</ul>}
      </div>
    </SectionShell>
  );
}

function FeatureGrid({ section }: { section: Section }) {
  const columns = gridCols[section.columns ?? 3] ?? gridCols[3];
  return (
    <SectionShell settings={section.settings}>
      <SectionIntro section={section} />
      <div className={cn("grid gap-6", columns)}>
        {(section.items ?? []).map((item: any, index: number) => (
          <Reveal key={item._key ?? index} enabled={section.settings?.animate !== false} delay={index * 0.05}>
            <article className={cn("group h-full", section.style !== "plain" && "rounded-2xl border border-white/10 bg-white/[.035] p-7 transition hover:-translate-y-1 hover:border-primary/50")}>
              {section.style === "numbered" ? <p className="mb-4 font-display text-4xl font-bold text-primary/70">{String(index + 1).padStart(2, "0")}</p> : item.icon && <div className="mb-5 w-fit rounded-full bg-white/5 p-3.5 text-primary transition group-hover:bg-primary/20"><Icon name={item.icon} className="h-7 w-7" /></div>}
              {item.image && <CmsImage image={item.image} width={800} className="mb-5 aspect-[16/10] w-full rounded-xl object-cover" sizes="(min-width: 1024px) 33vw, 100vw" />}
              {item.title && <h3 className="mb-3 font-display text-xl font-bold text-white">{item.title}</h3>}
              {item.body && <p className="leading-relaxed text-muted-foreground">{item.body}</p>}
              {item.bullets?.length > 0 && <ul className="mt-4 space-y-1.5 text-sm text-white/75">{item.bullets.map((bullet: string) => <li key={bullet} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{bullet}</li>)}</ul>}
              {item.link && <div className="mt-5"><CmsLink link={{ ...item.link, style: item.link.style || "link" }} /></div>}
            </article>
          </Reveal>
        ))}
      </div>
      {section.link && <div className="mt-10"><CmsLink link={section.link} /></div>}
    </SectionShell>
  );
}

function ServiceCards({ list, columns = 3 }: { list: any[]; columns?: number }) {
  return (
    <div className={cn("grid gap-6", gridCols[columns] ?? gridCols[3])}>
      {list.map((service) => (
        <Link key={service._id} href={pathForDoc(service)} className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.035] p-7 transition hover:-translate-y-1 hover:border-primary/50">
          {service.icon && <div className="mb-5 w-fit rounded-full bg-white/5 p-3.5 text-primary"><Icon name={service.icon} className="h-7 w-7" /></div>}
          <h3 className="font-display text-xl font-bold text-white">{service.shortTitle || service.title}</h3>
          {service.summary && <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{service.summary}</p>}
          <p className="mt-5 flex items-center justify-between text-sm">
            <span className="text-white/60">{service.priceFrom ? `From $${service.priceFrom.toLocaleString("en-AU")}${service.priceUnit ? ` ${service.priceUnit}` : ""}` : ""}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-primary">Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden /></span>
          </p>
        </Link>
      ))}
    </div>
  );
}

export function ProjectCards({ list }: { list: any[] }) {
  return (
    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
      {list.map((project) => (
        <Link key={project._id} href={pathForDoc(project)} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] transition hover:border-primary/50">
          {project.mainImage ? <CmsImage image={project.mainImage} width={900} height={560} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="aspect-[16/10] bg-gradient-to-br from-primary/30 to-cyan-400/10" />}
          <div className="p-6">
            <p className="text-xs uppercase tracking-wider text-primary">{[project.industry, project.clientLocation].filter(Boolean).join(" · ")}</p>
            <h3 className="mt-2 font-display text-xl font-bold text-white">{project.title}</h3>
            {project.summary && <p className="mt-2 line-clamp-3 text-muted-foreground">{project.summary}</p>}
            {project.results?.[0] && <p className="mt-4 text-sm"><strong className="text-white">{project.results[0].value}</strong> <span className="text-muted-foreground">{project.results[0].label}</span></p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function PostCards({ list }: { list: any[] }) {
  return (
    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
      {list.map((post) => (
        <article key={post._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] transition hover:border-primary/40">
          <Link href={pathForDoc({ _type: "post", slug: post.slug })} className="block h-full">
            {post.coverImage ? <CmsImage image={post.coverImage} width={800} height={500} className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-gradient-to-br from-primary/40 to-cyan-400/10" />}
            <div className="p-6">
              <div className="mb-3 flex flex-wrap gap-2">{(post.categories ?? []).slice(0, 2).map((category: any) => <span key={category.slug} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{category.title}</span>)}</div>
              <h3 className="font-display text-xl font-semibold leading-snug text-white">{post.title}</h3>
              {post.excerpt && <p className="mt-3 line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt}</p>}
              <p className="mt-5 text-sm text-muted-foreground"><time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}</time> · {readingMinutes(post.readingChars)} min read{post.author?.name ? ` · ${post.author.name}` : ""}</p>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

function Testimonials({ section }: { section: Section }) {
  const list: any[] = section.testimonialList ?? [];
  if (!list.length) return null;
  return (
    <SectionShell settings={section.settings}>
      <SectionIntro section={section} center />
      <div className={cn("grid gap-6", section.layout === "single" ? "mx-auto max-w-3xl" : "md:grid-cols-2 lg:grid-cols-3")}>
        {(section.layout === "single" ? list.slice(0, 1) : list).map((item) => (
          <figure key={item._id} className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[.035] p-7">
            {item.rating && <div className="mb-4 flex gap-0.5" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: item.rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />)}</div>}
            <blockquote className="flex-1 text-lg leading-relaxed text-white/90">“{item.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {item.image && <CmsImage image={item.image} width={96} height={96} className="h-12 w-12 rounded-full object-cover" />}
              <div><p className="font-semibold text-white">{item.name}</p><p className="text-sm text-muted-foreground">{[item.role, item.company].filter(Boolean).join(", ")}</p></div>
            </figcaption>
          </figure>
        ))}
      </div>
      {section.reviewLink && <div className="mt-10 text-center"><CmsLink link={{ ...section.reviewLink, style: section.reviewLink.style || "secondary" }} /></div>}
    </SectionShell>
  );
}

function Faq({ section }: { section: Section }) {
  const items = [...(section.items ?? []), ...(section.faqList ?? [])];
  if (!items.length) return null;
  return (
    <SectionShell settings={{ width: "narrow", ...section.settings }}>
      <SectionIntro section={{ ...section, heading: section.heading || "Frequently asked questions" }} />
      <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {items.map((qa: any, index: number) => (
          <details key={qa._key ?? qa.question} className="group p-6" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-white">{qa.question}<span className="text-primary transition group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{qa.answer}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

function ContactDetails({ compact = false }: { compact?: boolean }) {
  const settings = useSiteSettings();
  const email = settings?.email || "info@drivwon.com";
  const items = [
    settings?.phone && { icon: Phone, title: "Call us", value: settings.phone, href: `tel:${String(settings.phoneE164 || settings.phone).replace(/[^\d+]/g, "")}` },
    { icon: Mail, title: "Email us", value: email, href: `mailto:${email}` },
    { icon: MapPin, title: settings?.showAddress ? "Visit us" : "Based in", value: [settings?.showAddress ? settings?.streetAddress : null, `${settings?.addressLocality || "Geelong"} ${settings?.addressRegion || "VIC"}${settings?.showAddress && settings?.postalCode ? ` ${settings.postalCode}` : ""}`].filter(Boolean).join(", "), href: settings?.googleBusinessProfileUrl },
  ].filter(Boolean) as Array<{ icon: any; title: string; value: string; href?: string }>;
  return (
    <address className={cn("not-italic", compact ? "space-y-4" : "space-y-7")}>
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-4">
          <div className="rounded-full bg-white/5 p-3 text-primary"><item.icon className="h-5 w-5" aria-hidden /></div>
          <div><p className="font-semibold text-white">{item.title}</p>{item.href ? <a href={item.href} className="text-muted-foreground hover:text-primary" target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}>{item.value}</a> : <p className="text-muted-foreground">{item.value}</p>}</div>
        </div>
      ))}
      {(settings?.openingHours ?? []).length > 0 && (
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-white/5 p-3 text-primary"><Clock className="h-5 w-5" aria-hidden /></div>
          <div><p className="font-semibold text-white">Hours</p>{settings.openingHours.map((hours: any) => <p key={hours._key} className="text-muted-foreground">{(hours.days ?? []).map((day: string) => day.slice(0, 3)).join(", ")}: {hours.opens}–{hours.closes}{hours.byAppointment ? " (by appointment)" : ""}</p>)}</div>
        </div>
      )}
    </address>
  );
}

function FormBlock({ section, campaign }: { section: Section; campaign?: string }) {
  const split = section.layout !== "single";
  return (
    <SectionShell settings={section.settings} className="scroll-mt-24">
      <div className={cn("grid gap-12", split && "lg:grid-cols-[1fr_1.2fr]")}>
        {split ? (
          <div>
            <SectionIntro section={section} />
            <RichText value={section.sideText} />
            {section.showContactDetails !== false && <div className="mt-8"><ContactDetails /></div>}
          </div>
        ) : <SectionIntro section={section} center />}
        <div className={cn(!split && "mx-auto w-full max-w-2xl")}><LeadForm form={section.formDoc} campaign={campaign} /></div>
      </div>
    </SectionShell>
  );
}

function renderSection(section: Section, index: number, context: { firstHeroKey?: string; campaign?: string }): React.ReactNode {
  const animate = section.settings?.animate !== false;
  switch (section._type) {
    case "reusableSectionRef":
      return (section.resolved ?? []).map((child: Section, childIndex: number) => <div key={child._key ?? childIndex}>{renderSection(child, index + childIndex, context)}</div>);
    case "heroSection":
      return <Hero section={section} isFirst={section._key === context.firstHeroKey} />;
    case "quickAnswerSection":
      return <QuickAnswer section={section} />;
    case "richTextSection":
      return <SectionShell settings={{ width: "narrow", ...section.settings }}><SectionIntro section={section} /><RichText value={section.body} /></SectionShell>;
    case "splitSection": {
      const imageLeft = section.imagePosition === "left";
      return (
        <SectionShell settings={section.settings}>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal enabled={animate} className={cn(imageLeft && "lg:order-2")}>
              {section.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-primary">{section.eyebrow}</p>}
              {section.heading && <Heading level={section.headingLevel}>{section.heading}</Heading>}
              <RichText value={section.body} />
              {section.bullets?.length > 0 && <ul className="mt-6 space-y-3">{section.bullets.map((bullet: string) => <li key={bullet} className="flex gap-3 text-white/85"><Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />{bullet}</li>)}</ul>}
              <Buttons buttons={section.buttons} className="mt-8" />
            </Reveal>
            <Reveal enabled={animate} delay={0.1} className={cn(imageLeft && "lg:order-1")}>
              {section.video ? <CmsVideo video={section.video} /> : <CmsImage image={section.image} width={1100} className="w-full rounded-3xl border border-white/10 object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />}
            </Reveal>
          </div>
        </SectionShell>
      );
    }
    case "mediaSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} />
          {section.mediaType === "video" ? <CmsVideo video={section.video} /> : section.mediaType === "gallery" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(section.gallery ?? []).map((image: any) => <figure key={image._key}><CmsImage image={image} width={800} className="aspect-[4/3] w-full rounded-2xl object-cover" sizes="(min-width: 1024px) 33vw, 50vw" />{image.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{image.caption}</figcaption>}</figure>)}</div>
          ) : <figure><CmsImage image={section.image} width={1800} className="max-h-[75vh] w-full rounded-3xl object-cover" /></figure>}
          {section.caption && <p className="mt-3 text-center text-sm text-muted-foreground">{section.caption}</p>}
        </SectionShell>
      );
    case "featureGridSection":
      return <FeatureGrid section={section} />;
    case "statsSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} center />
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(section.items ?? []).map((stat: any) => <div key={stat._key} className="rounded-2xl border border-white/10 bg-white/[.03] p-7 text-center"><dd className="font-display text-4xl font-bold text-white md:text-5xl">{stat.value}</dd><dt className="mt-2 font-semibold text-primary">{stat.label}</dt>{stat.detail && <p className="mt-2 text-sm text-muted-foreground">{stat.detail}</p>}</div>)}
          </dl>
        </SectionShell>
      );
    case "processSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} />
          <ol className="grid gap-6 md:grid-cols-2">
            {(section.steps ?? []).map((step: any, stepIndex: number) => (
              <Reveal key={step._key} enabled={animate} delay={stepIndex * 0.05}>
                <li className="h-full list-none rounded-2xl border border-white/10 bg-white/[.03] p-7">
                  <p className="font-display text-sm font-bold text-primary">{String(stepIndex + 1).padStart(2, "0")}{step.duration ? ` · ${step.duration}` : ""}</p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-white">{step.title}</h3>
                  {step.body && <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>}
                  {step.bullets?.length > 0 && <ul className="mt-4 space-y-1.5 text-sm text-white/80">{step.bullets.map((bullet: string) => <li key={bullet} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{bullet}</li>)}</ul>}
                </li>
              </Reveal>
            ))}
          </ol>
        </SectionShell>
      );
    case "servicesSection":
      return <SectionShell settings={section.settings}><SectionIntro section={section} /><ServiceCards list={section.serviceList ?? []} columns={section.columns} />{section.link && <div className="mt-10"><CmsLink link={section.link} /></div>}</SectionShell>;
    case "projectsSection":
      return <SectionShell settings={section.settings}><SectionIntro section={section} /><ProjectCards list={(section.projectList ?? []).slice(0, section.limit ?? 6)} />{section.link && <div className="mt-10"><CmsLink link={section.link} /></div>}</SectionShell>;
    case "caseHighlightSection": {
      const doc = section.caseDoc;
      if (!doc) return null;
      return (
        <SectionShell settings={section.settings}>
          <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-white/[.03] p-8 lg:grid-cols-2 md:p-12">
            <div>
              {section.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-primary">{section.eyebrow}</p>}
              <Heading>{section.heading || doc.title}</Heading>
              <p className="mt-4 text-muted-foreground">{doc.summary}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4">{(doc.results ?? []).slice(0, 4).map((result: any) => <div key={result._key}><dd className="font-display text-3xl font-bold text-white">{result.value}</dd><dt className="text-sm text-muted-foreground">{result.label}</dt></div>)}</dl>
              <Link href={pathForDoc(doc)} className="mt-8 inline-flex items-center gap-2 font-semibold text-primary">Read the case study <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <CmsImage image={doc.mainImage} width={1000} className="w-full rounded-2xl object-cover" />
          </div>
        </SectionShell>
      );
    }
    case "testimonialsSection":
      return <Testimonials section={section} />;
    case "logoCloudSection":
      return (
        <SectionShell settings={{ spacing: "small", ...section.settings }}>
          {section.heading && <p className="mb-8 text-center text-sm uppercase tracking-[.2em] text-muted-foreground">{section.heading}</p>}
          <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">{(section.logos ?? []).map((logo: any) => <li key={logo._key}>{logo.url ? <a href={logo.url} target="_blank" rel="noopener noreferrer"><CmsImage image={logo} width={240} className={cn("h-10 w-auto object-contain opacity-70 transition hover:opacity-100", section.grayscale !== false && "grayscale hover:grayscale-0")} /></a> : <CmsImage image={logo} width={240} className={cn("h-10 w-auto object-contain opacity-70", section.grayscale !== false && "grayscale")} />}</li>)}</ul>
        </SectionShell>
      );
    case "pricingSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} center />
          <div className={cn("grid gap-6", (section.plans ?? []).length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
            {(section.plans ?? []).map((plan: any) => (
              <article key={plan._key} className={cn("relative flex flex-col rounded-3xl border p-8", plan.highlighted ? "border-primary bg-primary/10 shadow-xl shadow-primary/10" : "border-white/10 bg-white/[.03]")}>
                {plan.highlighted && <p className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Most popular</p>}
                <h3 className="font-display text-2xl font-bold text-white">{plan.name}</h3>
                <p className="mt-4"><span className="font-display text-4xl font-bold text-white">{plan.price}</span>{plan.period && <span className="text-muted-foreground"> {plan.period}</span>}</p>
                {plan.description && <p className="mt-3 text-muted-foreground">{plan.description}</p>}
                <ul className="mt-6 flex-1 space-y-2.5">{(plan.features ?? []).map((feature: string) => <li key={feature} className="flex gap-2 text-white/85"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />{feature}</li>)}</ul>
                {plan.link && <div className="mt-8"><CmsLink link={{ ...plan.link, style: plan.link.style || (plan.highlighted ? "primary" : "secondary") }} className="w-full justify-center" /></div>}
              </article>
            ))}
          </div>
          {section.note && <p className="mt-6 text-center text-sm text-muted-foreground">{section.note}</p>}
        </SectionShell>
      );
    case "faqSection":
      return <Faq section={section} />;
    case "comparisonSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} />
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left">
              <thead><tr>{(section.columns ?? []).map((column: string, columnIndex: number) => <th key={column} scope="col" className={cn("bg-white/5 p-4 font-semibold text-white", columnIndex === 1 && "text-primary")}>{column}</th>)}</tr></thead>
              <tbody>{(section.rows ?? []).map((row: any) => <tr key={row._key} className="border-t border-white/10">{(row.cells ?? []).map((cell: string, cellIndex: number) => cellIndex === 0 ? <th key={cellIndex} scope="row" className="p-4 font-medium text-white">{cell}</th> : <td key={cellIndex} className={cn("p-4", cell === "✓" ? "text-primary" : cell === "✗" ? "text-white/30" : "text-white/80")}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {section.note && <p className="mt-3 text-sm text-muted-foreground">{section.note}</p>}
        </SectionShell>
      );
    case "ctaSection":
      return (
        <SectionShell settings={section.settings}>
          <div className={cn("relative overflow-hidden text-center", section.style === "minimal" ? "" : "rounded-3xl px-7 py-16 md:px-16", section.style === "card" ? "border border-white/10 bg-white/[.04]" : section.style !== "minimal" && "bg-gradient-to-br from-primary/30 via-primary/10 to-transparent")}>
            {section.image && <CmsImage image={section.image} width={1600} className="absolute inset-0 h-full w-full object-cover opacity-20" />}
            <div className="relative">
              {section.eyebrow && <p className="mb-3 text-sm uppercase tracking-widest text-primary">{section.eyebrow}</p>}
              <h2 className="font-display text-4xl font-bold text-white md:text-6xl">{section.heading}</h2>
              {section.body && <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75">{section.body}</p>}
              <Buttons buttons={section.buttons} className="mt-9 justify-center" />
            </div>
          </div>
        </SectionShell>
      );
    case "formSection":
      return <FormBlock section={section} campaign={context.campaign} />;
    case "contactSection":
      return <ContactBlock section={section} />;
    case "locationsSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} />
          <ul className="flex flex-wrap gap-3">
            {(section.locationList ?? []).map((location: any) => <li key={location._id}><Link href={pathForDoc(location)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-5 py-2.5 text-white transition hover:border-primary hover:text-primary"><MapPin className="h-4 w-4" aria-hidden />{location.name || location.title}</Link></li>)}
            {(section.extraAreas ?? []).map((area: string) => <li key={area} className="inline-flex items-center gap-2 rounded-full border border-white/5 px-5 py-2.5 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden />{area}</li>)}
          </ul>
        </SectionShell>
      );
    case "teamSection":
      return (
        <SectionShell settings={section.settings}>
          <SectionIntro section={section} />
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {(section.peopleList ?? []).map((person: any) => (
              <article key={person._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
                {person.image && <CmsImage image={person.image} width={700} height={700} className="aspect-square w-full object-cover" />}
                <div className="p-6"><h3 className="font-display text-xl font-bold text-white">{person.slug ? <Link href={`/authors/${person.slug}`} className="hover:text-primary">{person.name}</Link> : person.name}</h3><p className="text-primary">{person.role}</p>{person.shortBio && <p className="mt-3 text-muted-foreground">{person.shortBio}</p>}{person.credentials?.length > 0 && <ul className="mt-3 space-y-1 text-sm text-white/70">{person.credentials.map((credential: string) => <li key={credential}>• {credential}</li>)}</ul>}</div>
              </article>
            ))}
          </div>
        </SectionShell>
      );
    case "postsSection":
      return <SectionShell settings={section.settings}><SectionIntro section={section} /><PostCards list={(section.postList ?? []).slice(0, section.limit ?? 3)} /></SectionShell>;
    case "quoteSection":
      return (
        <SectionShell settings={{ width: "narrow", align: "center", ...section.settings }}>
          <Quote className="mx-auto mb-6 h-10 w-10 text-primary" aria-hidden />
          <blockquote className="font-display text-2xl leading-relaxed text-white md:text-4xl">“{section.quote}”</blockquote>
          <p className="mt-6 font-semibold text-white">{section.name}</p>{section.role && <p className="text-sm text-muted-foreground">{section.role}</p>}
        </SectionShell>
      );
    case "embedSection":
      return <SectionShell settings={section.settings}><SectionIntro section={section} />{section.url && <iframe src={section.url} title={section.title} loading="lazy" className="w-full rounded-2xl border-0 bg-white" style={{ height: section.height || 600 }} />}</SectionShell>;
    default:
      return null;
  }
}

function ContactBlock({ section }: { section: Section }) {
  const settings = useSiteSettings();
  const map = section.mapEmbedUrl || settings?.mapEmbedUrl;
  return (
    <SectionShell settings={section.settings}>
      <SectionIntro section={section} />
      <div className={cn("grid gap-10", section.showMap !== false && map && "lg:grid-cols-2")}>
        <ContactDetails />
        {section.showMap !== false && map && <iframe src={map} title={`Map of ${settings?.siteName || "Drivwon"} in ${settings?.addressLocality || "Geelong"}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[380px] w-full rounded-2xl border-0 grayscale" />}
      </div>
    </SectionShell>
  );
}

export default function Sections({ sections, campaign }: { sections?: Section[]; campaign?: string }) {
  const visible = (sections ?? []).filter((section) => section && !section.settings?.hidden);
  const firstHeroKey = visible.find((section) => section._type === "heroSection")?._key;
  return <>{visible.map((section, index) => <div key={section._key ?? index} data-section={section._type}>{renderSection(section, index, { firstHeroKey, campaign })}</div>)}</>;
}

export { ContactDetails };
