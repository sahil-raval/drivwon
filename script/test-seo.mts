import fs from "node:fs";
import { parse, evaluate } from "groq-js";
const repo = process.cwd();
const docs = fs.readFileSync(`${repo}/dist/seed.ndjson`, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
// add a private lead to prove it never leaks into public queries
docs.push({ _id: "leads.test", _type: "lead", name: "Secret Person", email: "secret@example.com" });
const publicDocs = docs.filter((doc) => !doc._id.includes("."));
const realFetch = globalThis.fetch;
let queries = 0;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = new URL(String(input));
  if (!url.hostname.endsWith("sanity.io")) return realFetch(input, init);
  const query = url.searchParams.get("query")!;
  const params: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => { if (key.startsWith("$")) params[key.slice(1)] = JSON.parse(value); });
  queries++;
  const tree = parse(query, { params });
  const result = await (await evaluate(tree, { dataset: publicDocs, params })).get();
  return new Response(JSON.stringify({ result }), { status: 200, headers: { "Content-Type": "application/json" } });
}) as any;

const { handleSeoRoute } = await import(`${repo}/server/seo/handler.ts`);
const template = fs.readFileSync(`${repo}/dist/template.html`, "utf8");
const routes = ["/", "/about", "/services", "/projects", "/contact", "/quotation", "/privacy-policy", "/blog", "/locations", "/thank-you",
  "/services/seo-geelong", "/services/web-design-geelong", "/services/ai-search-optimisation", "/services/google-ads-geelong", "/services/ai-agents-geelong", "/services/ai-consulting-geelong", "/services/ai-chatbot-geelong", "/services/ai-automation", "/blog/ai-automation-examples-geelong", "/services/website-maintenance-hosting-geelong", "/services/social-media-marketing-geelong", "/locations/web-design-seo-torquay-surf-coast",
  "/projects/varni-diamonds", "/blog/website-cost-geelong", "/blog/what-is-generative-engine-optimisation", "/blog/choose-web-designer-seo-agency-geelong", "/blog/seo-vs-google-ads-geelong", "/blog/category/seo", "/authors/sahil-raval",
  "/free-seo-audit-geelong", "/does-not-exist", "/About", "/about/", "/drivwon/der", "/studio"];
let failures = 0;
const fail = (msg: string) => { failures++; console.log("  ✗", msg); };
for (const route of routes) {
  const res = await handleSeoRoute(route, async () => template);
  const html = res.body;
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let types: string[] = [];
  for (const json of ld) { try { const parsed = JSON.parse(json); types.push(...(parsed["@graph"] ?? [parsed]).map((n: any) => [].concat(n["@type"]).join("+"))); } catch { fail(`${route} invalid JSON-LD`); } }
  const bodyText = (html.match(/<div id="root">([\s\S]*?)<\/div>\s*<\/body>/)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`${res.status} ${route}  title="${title}"  h1=${h1} words=${bodyText.split(" ").filter(Boolean).length} robots="${robots?.split(",").slice(0, 2).join(",")}" canonical=${canonical}${res.headers.Location ? ` → ${res.headers.Location}` : ""}`);
  if (types.length) console.log(`    schema: ${types.join(", ")}`);
  if (res.status === 200 && !["/drivwon/der", "/studio"].includes(route)) {
    if (h1 !== 1) fail(`${route} has ${h1} H1 tags`);
    if (!title) fail(`${route} missing title`);
    if (html.includes("secret@example.com")) fail("lead leaked");
    if (/\[CHECK\]/.test(title ?? "")) fail("CHECK in title");
  }
  if (html.includes("<!--seo:start-->") && (html.match(/<title>/g) ?? []).length !== 1) fail(`${route} duplicate title tags`);
}
for (const feed of ["/sitemap.xml", "/robots.txt", "/llms.txt", "/rss.xml"]) {
  const res = await handleSeoRoute(feed, async () => template);
  console.log(`\n===== ${feed} (${res.status}, ${res.headers["Content-Type"]}) =====\n${res.body.slice(0, feed === "/llms.txt" ? 2600 : 1400)}`);
  if (res.body.includes("secret@example.com")) fail("lead leaked in feed");
}
console.log(`\nqueries=${queries} failures=${failures}`);
