import { DEFAULT_SITE_URL } from "../cms/config";
import { hasImage, imageDimensions, imageUrl, fileUrl } from "../cms/image";
import { pathForDoc } from "../cms/routes";
import { collectFaqs, firstHero, ptToText, sectionsText, truncate, wordCount } from "./text";

export type HeadTag = { tag: "meta"; attrs: Record<string, string> } | { tag: "link"; attrs: Record<string, string> };
export type HeadData = { title: string; description: string; canonical: string; robots: string; tags: HeadTag[]; jsonLd: Record<string, unknown>[]; noIndex: boolean };

export type HeadInput = {
  /** The CMS document, or null for a built-in page with no CMS document. */
  doc: any | null;
  settings: any | null;
  path: string;
  /** Overrides for built-in routes (blog index, 404 etc.). */
  fallback?: { title?: string; description?: string; noIndex?: boolean; type?: string };
  /** Posts listed on collection pages (blog, category, author). */
  list?: any[];
};

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))) as T;

export function siteUrlOf(settings: any) {
  return String(settings?.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function docImage(doc: any, settings: any) {
  const seo = doc?.seo ?? {};
  const hero = firstHero(doc);
  return [seo.ogImage, doc?.coverImage, doc?.mainImage, hero?.image, doc?.image, settings?.defaultOgImage, settings?.defaultSeo?.ogImage].find(hasImage);
}

function robotsFor(seo: any, noIndex: boolean) {
  const directives: string[] = [noIndex ? "noindex" : "index", seo?.noFollow ? "nofollow" : "follow"];
  if (seo?.noArchive) directives.push("noarchive");
  if (seo?.noSnippet) directives.push("nosnippet");
  if (seo?.noImageIndex) directives.push("noimageindex");
  if (!noIndex && !seo?.noSnippet) {
    directives.push(`max-snippet:${typeof seo?.maxSnippet === "number" ? seo.maxSnippet : -1}`);
    directives.push(`max-image-preview:${seo?.maxImagePreview || "large"}`);
    directives.push("max-video-preview:-1");
  }
  if (seo?.unavailableAfter) directives.push(`unavailable_after:${new Date(seo.unavailableAfter).toISOString()}`);
  return directives.join(", ");
}

function pageSchemaType(doc: any, path: string) {
  if (doc?.seo?.schemaType) return doc.seo.schemaType;
  switch (doc?._type) {
    case "author": return "ProfilePage";
    case "category": return "CollectionPage";
    case "post": return "WebPage";
    default:
      if (path === "/about") return "AboutPage";
      if (path === "/contact" || path === "/quotation") return "ContactPage";
      if (path === "/blog" || path === "/services" || path === "/projects") return "CollectionPage";
      return "WebPage";
  }
}

function breadcrumbs(doc: any, path: string, title: string, base: string) {
  if (path === "/") return [];
  const crumbs: Array<{ name: string; url: string }> = [{ name: "Home", url: `${base}/` }];
  const section: Record<string, [string, string]> = { post: ["Blog", "/blog"], category: ["Blog", "/blog"], service: ["Services", "/services"], location: ["Areas we serve", "/locations"], caseStudy: ["Projects", "/projects"], author: ["Blog", "/blog"] };
  const parent = section[doc?._type];
  if (parent) crumbs.push({ name: parent[0], url: `${base}${parent[1]}` });
  if (doc?.parent?.slug) crumbs.push({ name: doc.parent.title, url: `${base}${pathForDoc(doc.parent)}` });
  crumbs.push({ name: doc?.seo?.breadcrumbTitle || title, url: `${base}${path}` });
  return crumbs;
}

function entityNodes(entities?: any[]) {
  return (entities ?? []).filter((entity) => entity?.name).map((entity) => clean({ "@type": entity.type || "Thing", name: entity.name, sameAs: entity.sameAs }));
}

function personNode(person: any, base: string) {
  if (!person?.name) return undefined;
  return clean({
    "@type": "Person",
    "@id": person.slug ? `${base}/authors/${person.slug}#person` : undefined,
    name: person.name,
    jobTitle: person.role,
    description: person.shortBio,
    image: hasImage(person.image) ? imageUrl(person.image, 600) : undefined,
    url: person.slug ? `${base}/authors/${person.slug}` : undefined,
    sameAs: person.sameAs,
    knowsAbout: person.knowsAbout,
    alumniOf: (person.alumniOf ?? []).map((name: string) => ({ "@type": "EducationalOrganization", name })),
    hasCredential: (person.credentials ?? []).map((name: string) => ({ "@type": "EducationalOccupationalCredential", name })),
    worksFor: { "@id": `${base}/#organization` },
  });
}

function areaNodes(areas?: string[]) {
  return (areas ?? []).filter(Boolean).map((name) => ({ "@type": "Place", name }));
}

function videoNodes(sections: any[] | undefined, base: string, path: string) {
  const nodes: Record<string, unknown>[] = [];
  const walk = (list?: any[]) => {
    for (const section of list ?? []) {
      if (!section || section.settings?.hidden) continue;
      if (section._type === "reusableSectionRef") walk(section.resolved);
      const video = section.video;
      if (video?.title && hasImage(video.poster) && video.uploadDate) {
        nodes.push(clean({
          "@type": "VideoObject",
          name: video.title,
          description: video.description || video.title,
          thumbnailUrl: imageUrl(video.poster, 1280),
          uploadDate: video.uploadDate,
          duration: video.duration,
          contentUrl: video.source === "upload" ? fileUrl(video.file) : video.source === "url" ? video.url : undefined,
          embedUrl: ["youtube", "vimeo"].includes(video.source) ? video.url : undefined,
          transcript: video.transcript,
          url: `${base}${path}`,
        }));
      }
    }
  };
  walk(sections);
  return nodes;
}

function howToNodes(sections: any[] | undefined) {
  return (sections ?? [])
    .filter((section) => section?._type === "processSection" && section.asHowTo && !section.settings?.hidden && section.steps?.length)
    .map((section) => ({
      "@type": "HowTo",
      name: section.heading,
      description: section.intro,
      step: section.steps.map((step: any, index: number) => clean({ "@type": "HowToStep", position: index + 1, name: step.title, text: [step.body, ...(step.bullets ?? [])].filter(Boolean).join(" ") })),
    }));
}

function offerNodes(sections: any[] | undefined, base: string) {
  const offers: Record<string, unknown>[] = [];
  for (const section of sections ?? []) {
    if (section?._type !== "pricingSection" || section.outputOffers === false || section.settings?.hidden) continue;
    for (const plan of section.plans ?? []) {
      if (!plan?.name) continue;
      offers.push(clean({ "@type": "Offer", name: plan.name, description: plan.description, price: plan.priceNumber, priceCurrency: plan.priceNumber ? "AUD" : undefined, seller: { "@id": `${base}/#organization` } }));
    }
  }
  return offers;
}

/** Organization / LocalBusiness node — the core entity for local SEO and GEO. */
export function organizationNode(settings: any) {
  const base = siteUrlOf(settings);
  const logo = settings?.logoSquare && hasImage(settings.logoSquare) ? settings.logoSquare : settings?.logo;
  const sameAs = [
    ...(settings?.socialLinks ?? []).map((link: any) => link?.url),
    settings?.googleBusinessProfileUrl,
  ].filter(Boolean);
  const type = settings?.businessType || "ProfessionalService";
  const isLocal = type !== "Organization" && type !== "OnlineBusiness";
  const identifiers = [
    settings?.acn ? { "@type": "PropertyValue", propertyID: "ACN", value: settings.acn } : undefined,
    settings?.abn ? { "@type": "PropertyValue", propertyID: "ABN", value: settings.abn } : undefined,
  ].filter(Boolean);
  return clean({
    "@type": isLocal ? [type, "Organization"].filter((value, index, all) => all.indexOf(value) === index) : type,
    "@id": `${base}/#organization`,
    name: settings?.siteName || "Drivwon",
    legalName: settings?.legalName,
    url: `${base}/`,
    description: settings?.description,
    slogan: settings?.tagline,
    email: settings?.email,
    telephone: settings?.phoneE164 || settings?.phone,
    logo: hasImage(logo) ? clean({ "@type": "ImageObject", "@id": `${base}/#logo`, url: imageUrl(logo, 512), width: 512, height: (() => { const size = imageDimensions(logo); return size ? Math.round((size.height / size.width) * 512) : undefined; })() }) : `${base}/logo.png`,
    image: hasImage(settings?.defaultOgImage) ? imageUrl(settings.defaultOgImage, 1200) : undefined,
    address: clean({
      "@type": "PostalAddress",
      streetAddress: settings?.showAddress ? settings?.streetAddress : undefined,
      addressLocality: settings?.addressLocality || "Geelong",
      addressRegion: settings?.addressRegion || "VIC",
      postalCode: settings?.postalCode,
      addressCountry: settings?.addressCountry || "AU",
    }),
    geo: isLocal && settings?.geo?.lat ? { "@type": "GeoCoordinates", latitude: settings.geo.lat, longitude: settings.geo.lng } : undefined,
    hasMap: isLocal ? settings?.googleBusinessProfileUrl : undefined,
    areaServed: areaNodes(settings?.areaServed),
    openingHoursSpecification: isLocal ? (settings?.openingHours ?? []).filter((hours: any) => hours?.days?.length && hours.opens && hours.closes).map((hours: any) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: hours.days.map((day: string) => `https://schema.org/${day}`), opens: hours.opens, closes: hours.closes })) : undefined,
    priceRange: isLocal ? settings?.priceRange : undefined,
    currenciesAccepted: isLocal ? settings?.currencies : undefined,
    paymentAccepted: isLocal ? settings?.paymentAccepted : undefined,
    foundingDate: settings?.foundingDate,
    founder: (settings?.founders ?? []).map((person: any) => personNode(person, base)).filter(Boolean),
    knowsAbout: settings?.knowsAbout,
    identifier: identifiers,
    sameAs,
  });
}

export function buildHead({ doc, settings, path, fallback, list }: HeadInput): HeadData {
  const base = siteUrlOf(settings);
  const siteName = settings?.siteName || "Drivwon";
  const defaults = settings?.defaultSeo ?? {};
  const seo = { ...(doc?.seo ?? {}) };
  const isHome = path === "/";
  const hero = firstHero(doc);
  const rawTitle = doc?.title || doc?.name || fallback?.title || siteName;
  const template = settings?.titleTemplate || "%s | Drivwon";
  const title = seo.metaTitle || (isHome ? defaults.metaTitle : undefined) || (fallback?.title && !doc ? fallback.title : template.replace("%s", rawTitle));
  const description = truncate(String(
    seo.metaDescription || doc?.excerpt || doc?.summary || doc?.description || doc?.shortBio || hero?.subheading || fallback?.description || defaults.metaDescription || settings?.description ||
    "Drivwon is a Geelong web design, SEO and AI automation studio.",
  ).replace(/\s+/g, " ").trim(), 170);
  const canonical = seo.canonicalUrl || `${base}${path === "/" ? "/" : path}`;
  const expired = doc?.expiresAt && new Date(doc.expiresAt) < new Date();
  const noIndex = Boolean(seo.noIndex || fallback?.noIndex || expired);
  const robots = robotsFor(seo, noIndex);
  const image = docImage(doc, settings);
  const imageSrc = image ? imageUrl(image, 1200, 630) : `${base}/logo.png`;
  const imageAlt = (image as any)?.alt || title;
  const isArticle = doc?._type === "post";
  const ogType = isArticle ? "article" : doc?._type === "author" ? "profile" : "website";
  const published = doc?.publishedAt;
  const modified = doc?.updatedAt || doc?._updatedAt;
  const tags: HeadTag[] = [];
  const meta = (key: "name" | "property", name: string, content?: unknown) => {
    if (content !== undefined && content !== null && content !== "") tags.push({ tag: "meta", attrs: { [key]: name, content: String(content) } });
  };
  meta("name", "description", description);
  meta("name", "robots", robots);
  meta("name", "googlebot", robots);
  meta("name", "bingbot", robots);
  meta("property", "og:site_name", siteName);
  meta("property", "og:locale", settings?.locale || "en_AU");
  meta("property", "og:type", ogType);
  meta("property", "og:title", seo.ogTitle || title);
  meta("property", "og:description", seo.ogDescription || description);
  meta("property", "og:url", canonical);
  meta("property", "og:image", imageSrc);
  meta("property", "og:image:secure_url", imageSrc);
  meta("property", "og:image:width", image ? 1200 : undefined);
  meta("property", "og:image:height", image ? 630 : undefined);
  meta("property", "og:image:alt", imageAlt);
  meta("name", "twitter:card", seo.twitterCard || "summary_large_image");
  meta("name", "twitter:title", seo.ogTitle || title);
  meta("name", "twitter:description", seo.ogDescription || description);
  meta("name", "twitter:image", imageSrc);
  meta("name", "twitter:image:alt", imageAlt);
  if (settings?.twitterHandle) { meta("name", "twitter:site", settings.twitterHandle); meta("name", "twitter:creator", settings.twitterHandle); }
  if (isArticle) {
    meta("property", "article:published_time", published);
    meta("property", "article:modified_time", modified);
    meta("property", "article:author", doc?.author?.name);
    meta("property", "article:section", doc?.categories?.[0]?.title);
    for (const tag of doc?.tags ?? []) meta("property", "article:tag", tag);
    meta("name", "author", doc?.author?.name);
  }
  if (modified) meta("property", "og:updated_time", modified);
  if (seo.focusKeyword || seo.secondaryKeywords?.length) meta("name", "keywords", [seo.focusKeyword, ...(seo.secondaryKeywords ?? [])].filter(Boolean).join(", "));
  // Local signals
  meta("name", "geo.region", `${settings?.addressCountry || "AU"}-${settings?.addressRegion || "VIC"}`);
  meta("name", "geo.placename", doc?._type === "location" ? doc.name : settings?.addressLocality || "Geelong");
  if (settings?.geo?.lat) { meta("name", "geo.position", `${settings.geo.lat};${settings.geo.lng}`); meta("name", "ICBM", `${settings.geo.lat}, ${settings.geo.lng}`); }
  // Verification
  meta("name", "google-site-verification", settings?.googleSiteVerification);
  meta("name", "msvalidate.01", settings?.bingSiteVerification);
  meta("name", "yandex-verification", settings?.yandexVerification);
  meta("name", "p:domain_verify", settings?.pinterestVerification);
  meta("name", "facebook-domain-verification", settings?.facebookDomainVerification);
  meta("name", "theme-color", settings?.themeColor || "#09090b");
  tags.push({ tag: "link", attrs: { rel: "canonical", href: canonical } });
  if (!noIndex) {
    tags.push({ tag: "link", attrs: { rel: "alternate", hreflang: "en-AU", href: canonical } });
    tags.push({ tag: "link", attrs: { rel: "alternate", hreflang: "x-default", href: canonical } });
    for (const alternate of seo.alternates ?? []) if (alternate?.hreflang && alternate?.url) tags.push({ tag: "link", attrs: { rel: "alternate", hreflang: alternate.hreflang, href: alternate.url } });
  }
  tags.push({ tag: "link", attrs: { rel: "alternate", type: "application/rss+xml", title: `${siteName} blog`, href: `${base}/rss.xml` } });
  if (hasImage(settings?.favicon)) tags.push({ tag: "link", attrs: { rel: "icon", type: "image/png", href: imageUrl(settings.favicon, 512)! } });

  // ── JSON-LD graph ─────────────────────────────────────────────
  const url = canonical;
  const graph: Record<string, unknown>[] = [];
  const org = organizationNode(settings);
  graph.push(org);
  graph.push(clean({ "@type": "WebSite", "@id": `${base}/#website`, url: `${base}/`, name: siteName, description: settings?.description, publisher: { "@id": `${base}/#organization` }, inLanguage: "en-AU" }));
  const crumbs = breadcrumbs(doc, path, rawTitle, base);
  if (crumbs.length) graph.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.url })) });
  const bodyText = isArticle ? ptToText(doc?.body) : sectionsText(doc?.sections);
  const primaryImage = image ? clean({ "@type": "ImageObject", "@id": `${url}#primaryimage`, url: imageUrl(image, 1600), ...imageDimensions(image), caption: (image as any).alt }) : undefined;
  if (primaryImage) graph.push(primaryImage);
  const faqs = collectFaqs(doc);
  const webPageType = pageSchemaType(doc, path);
  const webPage = clean({
    "@type": faqs.length && webPageType === "FAQPage" ? "FAQPage" : webPageType,
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${base}/#website` },
    about: isHome ? { "@id": `${base}/#organization` } : entityNodes(seo.about),
    mentions: entityNodes(seo.mentions),
    primaryImageOfPage: primaryImage ? { "@id": `${url}#primaryimage` } : undefined,
    datePublished: published,
    dateModified: modified,
    breadcrumb: crumbs.length ? { "@id": `${url}#breadcrumb` } : undefined,
    inLanguage: "en-AU",
    audience: seo.audience ? { "@type": "Audience", audienceType: seo.audience } : undefined,
    speakable: seo.quickAnswer && seo.speakable !== false ? { "@type": "SpeakableSpecification", cssSelector: [".quick-answer", "h1"] } : undefined,
    reviewedBy: doc?.reviewedBy ? personNode(doc.reviewedBy, base) : undefined,
    lastReviewed: doc?.updatedAt,
    keywords: [seo.focusKeyword, ...(seo.secondaryKeywords ?? [])].filter(Boolean).join(", ") || undefined,
    mainEntity: webPageType === "FAQPage" && faqs.length ? faqs.map((qa) => ({ "@type": "Question", name: qa.question, acceptedAnswer: { "@type": "Answer", text: qa.answer } })) : doc?._type === "author" ? { "@id": `${base}/authors/${doc.slug}#person` } : undefined,
    potentialAction: { "@type": "ReadAction", target: [url] },
  });
  graph.push(webPage);

  if (isArticle) {
    const author = personNode(doc.author, base);
    if (author) graph.push(author);
    graph.push(clean({
      "@type": doc.articleType === "HowTo" ? "Article" : doc.articleType || "BlogPosting",
      "@id": `${url}#article`,
      headline: truncate(doc.title, 110),
      description,
      image: primaryImage ? { "@id": `${url}#primaryimage` } : undefined,
      datePublished: published,
      dateModified: modified || published,
      author: author ? { "@id": author["@id"] ?? undefined, name: doc.author.name } : { "@id": `${base}/#organization` },
      publisher: { "@id": `${base}/#organization` },
      mainEntityOfPage: { "@id": `${url}#webpage` },
      isPartOf: { "@id": `${url}#webpage` },
      articleSection: doc.categories?.map((category: any) => category.title),
      keywords: doc.tags,
      wordCount: wordCount(bodyText),
      inLanguage: "en-AU",
      about: entityNodes(seo.about),
      citation: (seo.sources ?? []).filter((source: any) => source?.url).map((source: any) => ({ "@type": "CreativeWork", name: source.title, url: source.url })),
      abstract: seo.quickAnswer,
    }));
  }

  if (doc?._type === "service" || doc?._type === "location") {
    const areas = doc._type === "location"
      ? [clean({ "@type": "City", name: doc.name, sameAs: doc.wikipediaUrl, containedInPlace: doc.region ? { "@type": "AdministrativeArea", name: doc.region } : undefined })]
      : areaNodes(seo.areaServed?.length ? seo.areaServed : doc.areaServed?.length ? doc.areaServed : settings?.areaServed);
    const services = doc._type === "location" ? (doc.services ?? []) : [doc];
    for (const service of services.length ? services : [doc]) {
      const servicePath = service._type === "service" ? `/services/${service.slug}` : path;
      graph.push(clean({
        "@type": "Service",
        "@id": `${url}#service${service === doc ? "" : `-${service.slug}`}`,
        name: doc._type === "location" ? `${service.shortTitle || service.title} in ${doc.name}` : service.title,
        serviceType: service.serviceType || service.shortTitle || service.title,
        description: service.summary || description,
        url: `${base}${servicePath}`,
        provider: { "@id": `${base}/#organization` },
        areaServed: areas,
        offers: service.priceFrom ? clean({ "@type": "Offer", priceCurrency: "AUD", priceSpecification: clean({ "@type": "PriceSpecification", priceCurrency: "AUD", minPrice: service.priceFrom, maxPrice: service.priceTo, unitText: service.priceUnit }), availability: "https://schema.org/InStock" }) : undefined,
        hasOfferCatalog: doc.deliverables?.length && service === doc ? { "@type": "OfferCatalog", name: `${doc.title} — what is included`, itemListElement: doc.deliverables.map((name: string) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) } : undefined,
      }));
    }
  }

  if (doc?._type === "caseStudy") {
    graph.push(clean({
      "@type": "CreativeWork",
      "@id": `${url}#casestudy`,
      name: doc.title,
      headline: doc.title,
      description,
      creator: { "@id": `${base}/#organization` },
      about: doc.client ? clean({ "@type": "Organization", name: doc.client, url: doc.websiteUrl, address: doc.clientLocation }) : undefined,
      dateCreated: doc.year ? String(doc.year) : undefined,
      image: primaryImage ? { "@id": `${url}#primaryimage` } : undefined,
      keywords: doc.tech,
    }));
  }

  if (doc?._type === "author") {
    const person = personNode(doc, base);
    if (person) graph.push({ ...person, description: doc.shortBio || ptToText(doc.bio).slice(0, 300) });
  }

  if (list?.length) {
    graph.push({ "@type": "ItemList", "@id": `${url}#itemlist`, itemListElement: list.slice(0, 30).map((item, index) => ({ "@type": "ListItem", position: index + 1, url: `${base}${pathForDoc({ _type: item._type || "post", slug: item.slug })}`, name: item.title })) });
  }

  if (faqs.length && webPage["@type"] !== "FAQPage") {
    graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, isPartOf: { "@id": `${url}#webpage` }, mainEntity: faqs.map((qa) => ({ "@type": "Question", name: qa.question, acceptedAnswer: { "@type": "Answer", text: qa.answer } })) });
  }
  graph.push(...howToNodes(doc?.sections));
  graph.push(...videoNodes(doc?.sections, base, path));
  const offers = offerNodes(doc?.sections, base);
  if (offers.length) graph.push({ "@type": "OfferCatalog", "@id": `${url}#offers`, name: `${rawTitle} pricing`, itemListElement: offers });

  const jsonLd: Record<string, unknown>[] = [{ "@context": "https://schema.org", "@graph": graph }];
  for (const custom of [defaults.structuredData && isHome ? defaults.structuredData : undefined, seo.structuredData]) {
    if (!custom) continue;
    try {
      const parsed = JSON.parse(custom);
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) if (item && typeof item === "object") jsonLd.push(item);
    } catch {
      // Invalid editor JSON is ignored so a typo cannot break the page.
    }
  }
  return { title, description, canonical, robots, tags, jsonLd, noIndex };
}

/** Escapes JSON so it is safe inside a <script> tag. */
export function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
