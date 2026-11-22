/**
 * Framework-free SEO responses. Used by Express (server/static.ts, server/vite.ts) and by the Vercel function (api/site.ts).
 */
import { sanityFetch } from "../../shared/cms/config";
import { LLMS_QUERY, REDIRECT_QUERY, RSS_QUERY, SETTINGS_QUERY, SITEMAP_QUERY, routeQuery } from "../../shared/cms/queries";
import { isPrivatePath, matchRoute, pathForDoc } from "../../shared/cms/routes";
import { imageUrl } from "../../shared/cms/image";
import { buildHead, safeJson, siteUrlOf, type HeadData } from "../../shared/seo/head";
import { esc, renderCrawlerHtml } from "./crawlerHtml";
import { builtInPages } from "../../shared/seo/builtins";

export type SeoResponse = { status: number; headers: Record<string, string>; body: string };

const cache = new Map<string, { expires: number; value: unknown }>();
async function cached<T>(key: string, loader: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export async function loadSettings() {
  try {
    return await cached("settings", () => sanityFetch<any>(SETTINGS_QUERY));
  } catch (error) {
    console.warn("[seo] Could not load site settings", error);
    return null;
  }
}

const HTML_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
const FEED_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

function normalisePath(path: string) {
  let clean = (path.split(/[?#]/)[0] || "/").replace(/\/{2,}/g, "/");
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.replace(/\/+$/, "");
  return clean;
}

function redirect(location: string, permanent = true): SeoResponse {
  return { status: permanent ? 301 : 302, headers: { Location: location, "Cache-Control": FEED_CACHE }, body: "" };
}

function attrs(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => `${key}="${esc(value)}"`).join(" ");
}

export function headToHtml(head: HeadData) {
  const lines = [`<title>${esc(head.title)}</title>`];
  for (const tag of head.tags) lines.push(`<${tag.tag} ${attrs(tag.attrs)} />`);
  for (const json of head.jsonLd) lines.push(`<script type="application/ld+json">${safeJson(json)}</script>`);
  return lines.join("\n    ");
}

/** Replaces the default head block and the empty #root in index.html. */
export function injectIntoTemplate(template: string, headHtml: string, bodyHtml: string, settings: any) {
  let html = template;
  if (html.includes("<!--seo:start-->")) html = html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n    ${headHtml}\n    <!--seo:end-->`);
  else html = html.replace("</head>", `    ${headHtml}\n  </head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<script|<\/body>)/, `<div id="root">${bodyHtml}</div>\n    `);
  // Settings are sent with the page so the browser does not need a second request before first paint.
  const boot = `<script>window.__DRIVWON_SETTINGS__=${safeJson(settings ?? null)};</script>`;
  return html.replace("</head>", `    ${boot}\n  </head>`);
}

export async function renderPage(rawPath: string, template: string): Promise<SeoResponse> {
  const path = normalisePath(rawPath);
  if (path !== rawPath.split(/[?#]/)[0] && rawPath !== "/") {
    const query = rawPath.includes("?") ? rawPath.slice(rawPath.indexOf("?")) : "";
    return redirect(`${path}${query}`);
  }
  if (/[A-Z]/.test(path) && !isPrivatePath(path)) return redirect(path.toLowerCase());

  const settings = await loadSettings();

  if (isPrivatePath(path)) {
    const head = buildHead({ doc: null, settings, path, fallback: { title: "Drivwon", noIndex: true } });
    return { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow, noarchive" }, body: injectIntoTemplate(template, headToHtml(head), "", settings) };
  }

  try {
    const hit = await cached(`redirect:${path}`, () => sanityFetch<{ to: string; permanent?: boolean } | null>(REDIRECT_QUERY, { path }));
    if (hit?.to) return redirect(hit.to, hit.permanent !== false);
  } catch {
    // Redirect lookup failures should never take the page down.
  }

  const match = matchRoute(path);
  const spec = routeQuery(match);
  let doc: any = null;
  let list: any[] | undefined;
  let categories: any[] | undefined;
  let cmsDown = false;
  if (spec) {
    try {
      const result = await cached(`route:${path}`, () => sanityFetch<any>(spec.query, spec.params));
      if (match.kind === "blogIndex") { doc = result?.page ?? null; list = result?.posts ?? []; categories = result?.categories; }
      else { doc = result ?? null; if (doc?._type === "category" || doc?._type === "author") list = doc.posts; }
    } catch (error) {
      cmsDown = true;
      console.warn(`[seo] Route query failed for ${path}`, error);
    }
  }

  const builtIn = builtInPages[path];
  if (cmsDown && !builtIn) {
    // Temporary CMS outage: 503 tells Google to come back later instead of dropping the page. Visitors still get the app.
    const head = buildHead({ doc: null, settings, path, fallback: { title: "Drivwon", description: settings?.description } });
    return { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "120", "Cache-Control": "no-store" }, body: injectIntoTemplate(template, headToHtml(head), "", settings) };
  }
  const found = Boolean(doc || builtIn || match.kind === "blogIndex");
  const head = buildHead({
    doc,
    settings,
    path,
    list,
    fallback: found ? builtIn : { title: "Page not found | Drivwon", description: "This page does not exist.", noIndex: true },
  });
  const body = found ? renderCrawlerHtml(doc, settings, { posts: match.kind === "blogIndex" ? list : undefined, categories }) : "";
  return {
    // A real 404 status stops Google indexing empty "soft 404" pages.
    status: found ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": found ? HTML_CACHE : "public, max-age=60", ...(head.noIndex ? { "X-Robots-Tag": "noindex" } : {}), Link: `<${head.canonical}>; rel="canonical"` },
    body: injectIntoTemplate(template, headToHtml(head), body, settings),
  };
}

// ── Feeds ──────────────────────────────────────────────────────────

const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function sitemapXml(): Promise<SeoResponse> {
  const settings = await loadSettings();
  const base = siteUrlOf(settings);
  type Entry = { loc: string; lastmod?: string; priority?: number; changefreq?: string; images: Array<{ loc: string; title?: string }> };
  const entries = new Map<string, Entry>();
  const today = new Date().toISOString().slice(0, 10);
  for (const path of Object.keys(builtInPages)) entries.set(path, { loc: `${base}${path}`, lastmod: today, priority: path === "/" ? 1 : 0.7, images: [] });
  try {
    const docs = await cached("sitemap", () => sanityFetch<any[]>(SITEMAP_QUERY), 300_000);
    for (const doc of docs ?? []) {
      const path = pathForDoc(doc);
      const expired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
      const canonicalElsewhere = doc.canonical && doc.canonical.replace(/\/$/, "") !== `${base}${path}`.replace(/\/$/, "");
      if (doc.noIndex || doc.exclude || expired || canonicalElsewhere) { entries.delete(path); continue; }
      const defaults: Record<string, number> = { page: 0.8, service: 0.9, location: 0.8, post: 0.6, caseStudy: 0.6, landingPage: 0.5, category: 0.4, author: 0.4 };
      entries.set(path, {
        loc: `${base}${path}`,
        lastmod: (doc.updatedAt || doc._updatedAt || doc.publishedAt || today).slice(0, 10),
        priority: doc.priority ?? (path === "/" ? 1 : defaults[doc._type] ?? 0.5),
        changefreq: doc.changefreq,
        images: (doc.images ?? []).filter((image: any) => image?.ref).map((image: any) => ({ loc: imageUrl({ asset: { _ref: image.ref } }, 1600)!, title: image.alt })),
      });
    }
  } catch (error) {
    console.warn("[seo] Sitemap query failed", error);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${[...entries.values()].map((entry) => `  <url><loc>${xml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${xml(entry.lastmod)}</lastmod>` : ""}${entry.changefreq ? `<changefreq>${xml(entry.changefreq)}</changefreq>` : ""}${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ""}${entry.images.map((image) => `<image:image><image:loc>${xml(image.loc)}</image:loc>${image.title ? `<image:title>${xml(image.title)}</image:title>` : ""}</image:image>`).join("")}</url>`).join("\n")}\n</urlset>`;
  return { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": FEED_CACHE }, body };
}

export async function robotsTxt(): Promise<SeoResponse> {
  const settings = await loadSettings();
  const base = siteUrlOf(settings);
  const lines = ["# Drivwon robots.txt — edit in Sanity → Site settings → Robots & AI crawlers", "User-agent: *", "Allow: /", "Disallow: /studio", "Disallow: /api/", "Disallow: /drivwon/", "Disallow: /dashboard", "Disallow: /*?*utm_", "Disallow: /*?*gclid=", "Disallow: /*?*fbclid=", ""];
  for (const bot of settings?.blockedAiBots ?? []) lines.push(`User-agent: ${bot}`, "Disallow: /", "");
  if (settings?.robotsExtra) lines.push(String(settings.robotsExtra), "");
  lines.push(`Sitemap: ${base}/sitemap.xml`, "");
  return { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": FEED_CACHE }, body: lines.join("\n") };
}

/** llms.txt (llmstxt.org): a Markdown map of the site for AI assistants. */
export async function llmsTxt(): Promise<SeoResponse> {
  let data: any = null;
  try { data = await cached("llms", () => sanityFetch<any>(LLMS_QUERY), 300_000); } catch (error) { console.warn("[seo] llms.txt query failed", error); }
  const settings = data?.settings ?? (await loadSettings());
  const base = siteUrlOf(settings);
  const name = settings?.siteName || "Drivwon";
  const out: string[] = [`# ${name}`, "", `> ${(settings?.description || "Drivwon is a Geelong, Victoria (Australia) studio for web design, SEO and AI automation.").replace(/\n/g, " ")}`, ""];
  const intro = settings?.llmsIntro || settings?.longDescription;
  if (intro) out.push(String(intro), "");
  const facts = [
    settings?.addressLocality && `Location: ${settings.addressLocality}${settings.addressRegion ? `, ${settings.addressRegion}` : ""}, Australia`,
    settings?.areaServed?.length && `Areas served: ${settings.areaServed.join(", ")}`,
    settings?.knowsAbout?.length && `Expertise: ${settings.knowsAbout.join(", ")}`,
    settings?.priceRange && `Price range: ${settings.priceRange}`,
    settings?.email && `Email: ${settings.email}`,
    settings?.phone && `Phone: ${settings.phone}`,
    `Website: ${base}`,
  ].filter(Boolean);
  out.push(...facts.map((fact) => `- ${fact}`), "");
  const groups: Array<[string, string]> = [["service", "Services"], ["location", "Areas we serve"], ["caseStudy", "Case studies"], ["page", "Key pages"], ["post", "Guides and articles"]];
  for (const [type, title] of groups) {
    const docs = (data?.docs ?? []).filter((doc: any) => doc._type === type);
    if (!docs.length) continue;
    out.push(`## ${title}`, "");
    for (const doc of docs) {
      const sentence = (text?: string) => (text ? `${text.trim().replace(/[.;:,]$/, "")}.` : "");
      const summary = [sentence(doc.quickAnswer || doc.description || doc.summary || doc.excerpt), doc.priceFrom ? `From $${doc.priceFrom.toLocaleString("en-AU")}${doc.priceTo ? ` to $${doc.priceTo.toLocaleString("en-AU")}` : ""} AUD${doc.priceUnit ? ` ${doc.priceUnit}` : ""}.` : "", doc.facts?.length ? `Facts: ${doc.facts.join("; ")}.` : ""].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      out.push(`- [${doc.title}](${base}${pathForDoc(doc)})${summary ? `: ${summary}` : ""}`);
    }
    out.push("");
  }
  if (data?.faqs?.length) {
    out.push("## Optional", "", "### Frequently asked questions", "");
    for (const qa of data.faqs) out.push(`- **${qa.question}** ${String(qa.answer).replace(/\s+/g, " ")}`);
    out.push("");
  }
  return { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": FEED_CACHE }, body: out.join("\n") };
}

export async function rssXml(): Promise<SeoResponse> {
  let data: any = null;
  try { data = await cached("rss", () => sanityFetch<any>(RSS_QUERY), 300_000); } catch (error) { console.warn("[seo] RSS query failed", error); }
  const base = siteUrlOf(data?.settings);
  const name = data?.settings?.siteName || "Drivwon";
  const items = (data?.posts ?? []).map((post: any) => `    <item><title>${xml(post.title)}</title><link>${xml(`${base}/blog/${post.slug}`)}</link><guid isPermaLink="true">${xml(`${base}/blog/${post.slug}`)}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>${post.author ? `<dc:creator>${xml(post.author)}</dc:creator>` : ""}${(post.categories ?? []).map((category: string) => `<category>${xml(category)}</category>`).join("")}<description>${xml(post.excerpt)}</description></item>`).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n    <title>${xml(name)} blog</title>\n    <link>${xml(`${base}/blog`)}</link>\n    <description>${xml(data?.settings?.description || "Guides on SEO, web design and AI from Drivwon.")}</description>\n    <language>en-au</language>\n    <atom:link href="${xml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>`;
  return { status: 200, headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": FEED_CACHE }, body };
}

/** Serves /<indexNowKey>.txt when a key is set in Site settings. */
export async function indexNowKey(path: string): Promise<SeoResponse | null> {
  const match = path.match(/^\/([a-zA-Z0-9-]{8,128})\.txt$/);
  if (!match) return null;
  const settings = await loadSettings();
  if (!settings?.indexNowKey || settings.indexNowKey !== match[1]) return null;
  return { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: settings.indexNowKey };
}

/** Routes any non-asset GET request. Returns null if the path is not handled here. */
export async function handleSeoRoute(path: string, getTemplate: () => Promise<string>): Promise<SeoResponse> {
  const clean = path.split("?")[0];
  if (clean === "/sitemap.xml") return sitemapXml();
  if (clean === "/robots.txt") return robotsTxt();
  if (clean === "/llms.txt") return llmsTxt();
  if (clean === "/rss.xml" || clean === "/feed.xml") return rssXml();
  const key = await indexNowKey(clean);
  if (key) return key;
  return renderPage(path, await getTemplate());
}
