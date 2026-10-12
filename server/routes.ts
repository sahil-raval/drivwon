import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./features/auth";
import { registerWorkspaceRoutes } from "./features/workspace";

const staticSitemapPaths = [
  "",
  "about",
  "services",
  "projects",
  "contact",
  "quotation",
  "privacy-policy",
  "blog",
];

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerWorkspaceRoutes(app);

  app.use(["/dashboard", "/studio"], (_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });

  app.get("/robots.txt", (_req, res) => {
    const baseUrl = (process.env.APP_URL || "https://drivwon.com").replace(/\/$/, "");
    res.type("text/plain").send([
      "User-agent: *",
      "Allow: /",
      "Disallow: /dashboard",
      "Disallow: /studio",
      "Disallow: /api/",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      "",
    ].join("\n"));
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const baseUrl = (process.env.APP_URL || "https://drivwon.com").replace(/\/$/, "");
    const urls = new Map<string, string>();
    for (const route of staticSitemapPaths) urls.set(`${baseUrl}/${route}`, new Date().toISOString().slice(0, 10));
    try {
      const query = encodeURIComponent(`*[((_type == "page" && defined(slug.current)) || (_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now())) && !(_id in path("drafts.**"))]{_type,"slug":slug.current,updatedAt,"noIndex":coalesce(noIndex,false) || coalesce(seo.noIndex,false)}`);
      const response = await fetch(`https://v6luawxh.api.sanity.io/v2026-10-12/data/query/production?query=${query}`, { headers: { Accept: "application/json" } });
      if (response.ok) {
         const data = await response.json() as { result?: Array<{ _type: string; slug: string; updatedAt?: string; noIndex?: boolean }> };
        for (const doc of data.result ?? []) {
          const path = doc._type === "post" ? `/blog/${doc.slug}` : doc.slug === "home" ? "/" : `/${doc.slug}`;
          if (doc.noIndex) {
            urls.delete(`${baseUrl}${path}`);
            continue;
          }
          urls.set(`${baseUrl}${path}`, doc.updatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10));
        }
      }
    } catch (error) {
      console.warn("[seo] Could not fetch Sanity routes for the sitemap.", error);
    }
    const xml = [...urls.entries()].map(([loc, lastmod]) => `<url><loc>${xmlEscape(loc)}</loc><lastmod>${xmlEscape(lastmod)}</lastmod></url>`).join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xml}</urlset>`);
  });

  return httpServer;
}
