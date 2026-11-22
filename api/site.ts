/**
 * Vercel function: renders every HTML route with server-side SEO tags + crawler-visible content,
 * and serves sitemap.xml, robots.txt, llms.txt, rss.xml and CMS redirects.
 * Static files in dist/public are served first by Vercel (see vercel.json).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleSeoRoute } from "../server/seo/handler.js";

let template: string | null = null;
async function getTemplate() {
  if (template) return template;
  for (const candidate of [path.join(process.cwd(), "dist", "template.html"), path.join(process.cwd(), "..", "dist", "template.html")]) {
    try { template = await fs.readFile(candidate, "utf8"); return template; } catch { /* try next */ }
  }
  throw new Error("dist/template.html is missing — check vercel.json includeFiles.");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url ?? "/", "https://www.drivwon.com");
    // vercel.json rewrites "/(.*)" to "/api/site?__path=/$1"; rebuild the original path + query.
    const original = url.searchParams.get("__path") ?? url.pathname;
    url.searchParams.delete("__path");
    const query = url.searchParams.toString();
    const result = await handleSeoRoute(`${original}${query ? `?${query}` : ""}`, getTemplate);
    res.statusCode = result.status;
    for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
    res.end(result.body);
  } catch (error) {
    console.error("[site] render failed", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Something went wrong.");
  }
}
