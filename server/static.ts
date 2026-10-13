import express, { type Express } from "express";
import fs from "fs";
import path from "path";

type PageMetadata = {
  title?: string;
  excerpt?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: { asset?: { _ref?: string } };
    structuredData?: string;
  };
  publishedAt?: string;
  noIndex?: boolean;
};

type SiteMetadata = {
  siteName?: string;
  email?: string;
  phone?: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  socialLinks?: Array<{ url: string }>;
  googleSiteVerification?: string;
  defaultSeo?: PageMetadata["seo"];
};

type FetchedMetadata = { page: PageMetadata | null; settings: SiteMetadata | null };

const metadataCache = new Map<string, { expires: number; value: FetchedMetadata | null }>();
const cacheTtlMs = 60_000;
const routeSlugs: Record<string, string> = {
  "/": "home",
  "/about": "about",
  "/services": "services",
  "/projects": "projects",
  "/contact": "contact",
  "/quotation": "quotation",
  "/privacy-policy": "privacy-policy",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function sanityImageUrl(ref?: string) {
  if (!ref) return undefined;
  const [, id, dimensions, format] = ref.split("-");
  return id && dimensions && format ? `https://cdn.sanity.io/images/v6luawxh/production/${id}-${dimensions}.${format}?w=1200&auto=format` : undefined;
}

async function fetchMetadata(requestPath: string): Promise<FetchedMetadata | null> {
  const cached = metadataCache.get(requestPath);
  if (cached && cached.expires > Date.now()) return cached.value;

  let pageQuery: string;
  let params: Record<string, string> = {};
  if (requestPath.startsWith("/blog/")) {
    pageQuery = `*[_type == "post" && slug.current == $slug && defined(publishedAt) && publishedAt <= now() && !(_id in path("drafts.**"))][0]{title,excerpt,publishedAt,noIndex,seo}`;
    params.slug = requestPath.slice("/blog/".length);
  } else if (requestPath === "/blog") {
    pageQuery = `*[_type == "page" && slug.current == "blog" && !(_id in path("drafts.**"))][0]{title,seo}`;
  } else {
    const slug = routeSlugs[requestPath] ?? (requestPath.startsWith("/") && requestPath.split("/").length === 2 ? requestPath.slice(1) : "");
    if (!slug) return null;
    pageQuery = `*[_type == "page" && slug.current == $slug && !(_id in path("drafts.**"))][0]{title,seo}`;
    params.slug = slug;
  }

  try {
    const url = new URL(`https://v6luawxh.api.sanity.io/v2026-10-12/data/query/production`);
    const query = `{"page": ${pageQuery}, "settings": *[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{siteName,email,phone,addressLocality,addressRegion,addressCountry,socialLinks,googleSiteVerification,defaultSeo}}`;
    url.searchParams.set("query", query);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value));
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const body = await response.json() as { result?: FetchedMetadata | null };
    const value = body.result ?? null;
    metadataCache.set(requestPath, { value, expires: Date.now() + cacheTtlMs });
    return value;
  } catch {
    return null;
  }
}

function applyMetadata(html: string, requestPath: string, result: FetchedMetadata | null) {
  const baseUrl = (process.env.APP_URL || "https://drivwon.com").replace(/\/$/, "");
  const metadata = result?.page;
  const site = result?.settings;
  const seo = { ...site?.defaultSeo, ...metadata?.seo };
  const siteName = site?.siteName || "Drivwon";
  const title = seo.metaTitle || metadata?.title || (requestPath === "/" ? "Drivwon | Digital studio in Geelong, Australia" : "Drivwon | Digital studio");
  const description = seo.metaDescription || metadata?.excerpt || "Drivwon is a Geelong-based digital studio building websites, software, brands and growth systems for ambitious businesses.";
  const canonical = seo.canonicalUrl || `${baseUrl}${requestPath}`;
  const noIndex = Boolean(metadata?.noIndex || seo.noIndex || requestPath === "/dashboard" || requestPath === "/drivwon/der" || requestPath === "/studio");
  const shareTitle = seo.ogTitle || title;
  const shareDescription = seo.ogDescription || description;
  const image = sanityImageUrl(seo.ogImage?.asset?._ref) || `${baseUrl}/logo.png`;
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  const values: Array<[string, string, string]> = [
    ["name", "description", description],
    ["name", "robots", noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large"],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", shareTitle],
    ["name", "twitter:description", shareDescription],
    ["name", "twitter:image", image],
    ["property", "og:title", shareTitle],
    ["property", "og:description", shareDescription],
    ["property", "og:type", requestPath.startsWith("/blog/") ? "article" : "website"],
    ["property", "og:url", canonical],
    ["property", "og:image", image],
    ["property", "og:locale", "en_AU"],
  ];
  for (const [attribute, key, content] of values) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<meta\\s+${attribute}="${escapedKey}"\\s+content="[^"]*"\\s*\\/?>`, "i");
    const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
    if (pattern.test(output)) output = output.replace(pattern, tag);
    else output = output.replace("</head>", `    ${tag}\n  </head>`);
  }
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  if (/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i.test(output)) output = output.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonicalTag);
  else output = output.replace("</head>", `    ${canonicalTag}\n  </head>`);

  if (site?.googleSiteVerification) {
    const tag = `<meta name="google-site-verification" content="${escapeHtml(site.googleSiteVerification)}" />`;
    if (/<meta\s+name="google-site-verification"\s+content="[^"]*"\s*\/?>/i.test(output)) output = output.replace(/<meta\s+name="google-site-verification"\s+content="[^"]*"\s*\/?>/i, tag);
    else output = output.replace("</head>", `    ${tag}\n  </head>`);
  }
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: baseUrl,
    email: site?.email,
    telephone: site?.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: site?.addressLocality || "Geelong",
      addressRegion: site?.addressRegion || "Victoria",
      addressCountry: site?.addressCountry || "AU",
    },
    sameAs: site?.socialLinks?.map((link) => link.url),
  };
  const organizationJson = JSON.stringify(organization).replace(/</g, "\\u003c");
  output = output.replace("</head>", `    <script type="application/ld+json">${organizationJson}</script>\n  </head>`);

  if (seo.structuredData) {
    try {
      const parsed = JSON.parse(seo.structuredData);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const safeJson = JSON.stringify(parsed).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
        output = output.replace("</head>", `    <script type="application/ld+json">${safeJson}</script>\n  </head>`);
      }
    } catch {
      // Ignore invalid CMS JSON-LD so a content typo cannot break the website.
    }
  }
  if (requestPath.startsWith("/blog/") && metadata?.publishedAt) {
    const structured = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      datePublished: metadata.publishedAt,
      mainEntityOfPage: canonical,
      publisher: { "@type": "Organization", name: "Drivwon", url: baseUrl },
    }).replace(/</g, "\\u003c");
    output = output.replace("</head>", `    <script type="application/ld+json">${structured}</script>\n  </head>`);
  }
  return output;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  app.get("*", async (req, res, next) => {
    try {
      const metadata = await fetchMetadata(req.path);
      const html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf8");
      res.type("html").send(applyMetadata(html, req.path, metadata));
    } catch (error) {
      next(error);
    }
  });
}
