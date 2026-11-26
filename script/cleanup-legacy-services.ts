/**
 * Removes the old, duplicate service pages left over from the previous site and 301-redirects
 * their URLs to the matching main service page. Duplicate pages split rankings (cannibalisation)
 * and give Google and AI engines mixed signals about what Drivwon offers.
 *
 *   npm run sanity:cleanup-services            → shows what will happen (no changes)
 *   npm run sanity:cleanup-services -- --yes   → does it (backup saved to dist/ first)
 *   add --case-studies to also remove old anonymous case studies (anything not seeded as case-…)
 *   and redirect them to /projects. Only do this if those projects are not real client work.
 *
 * Needs SANITY_WRITE_TOKEN (Editor) in .env or .env.local.
 */
import "../server/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const apply = process.argv.includes("--yes");
const withCases = process.argv.includes("--case-studies");
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_LEADS_TOKEN;
if (!token) {
  console.error("\nNo Sanity token found. Add SANITY_WRITE_TOKEN=sk... (Editor) to .env or .env.local in this folder.\n");
  process.exit(1);
}
const client = createClient({ projectId: process.env.SANITY_PROJECT_ID || "v6luawxh", dataset: process.env.SANITY_DATASET || "production", apiVersion: "2026-10-12", token, useCdn: false, perspective: "raw" });

/** The 11 service pages we keep (seeded IDs). */
const KEEP = new Set(["service-google-ads", "service-website-care", "service-social-media", "service-seo-geelong", "service-web-design-geelong", "service-ai-search-optimisation", "service-ecommerce", "service-ai-automation", "service-custom-software", "service-app-development", "service-branding"]);

/** Old slug → main page it should redirect to. Unknown slugs fall back to /services. */
const TARGET: Record<string, string> = {
  "seo": "/services/seo-geelong",
  "search-engine-optimisation": "/services/seo-geelong",
  "digital-marketing": "/services/social-media-marketing-geelong",
  "web-development": "/services/web-design-geelong",
  "mobile-apps": "/services/app-development",
  "ui-ux-design": "/services/branding-ui-ux-design",
  "system-architecture": "/services/custom-software-development",
  "data-analytics": "/services/custom-software-development",
};

type Doc = Record<string, any> & { _id: string; _type: string };
const baseId = (id: string) => id.replace(/^drafts\./, "");

/** Finds every place a document points at `id`, as Sanity patch paths. */
function refPaths(value: any, id: string, path = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => {
    const segment = item && typeof item === "object" && item._key ? `${path}[_key=="${item._key}"]` : `${path}[${index}]`;
    if (item && typeof item === "object" && item._ref === id) return [segment];
    return refPaths(item, id, segment);
  });
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, child]) => {
    if (key.startsWith("_")) return [];
    const childPath = path ? `${path}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child) && (child as any)._ref === id) return [childPath];
    return refPaths(child, id, childPath);
  });
  return [];
}

async function main() {
  const services = await client.fetch<Doc[]>(`*[_type == "service" && !(_id in path("versions.**"))]`);
  const legacy = services.filter((doc) => !KEEP.has(baseId(doc._id)));
  if (withCases) {
    const cases = await client.fetch<Doc[]>(`*[_type == "caseStudy" && !(_id in path("versions.**"))]`);
    legacy.push(...cases.filter((doc) => !baseId(doc._id).startsWith("case-")));
  }
  if (!legacy.length) { console.log("No legacy documents found. Nothing to do."); return; }

  const ids = [...new Set(legacy.map((doc) => baseId(doc._id)))];
  const referrers = await client.fetch<Doc[]>(`*[references($ids) && !(_id in path("versions.**"))]`, { ids: [...ids, ...ids.map((id) => `drafts.${id}`)] });
  const existingRedirects = await client.fetch<Doc[]>(`*[_type == "redirect"]{_id, from, to}`);

  console.log(`\nLegacy documents to remove (${legacy.length}):`);
  const redirects: Doc[] = [];
  for (const id of ids) {
    const doc = legacy.find((item) => item._id === id) ?? legacy.find((item) => baseId(item._id) === id)!;
    const slugValue = doc.slug?.current as string | undefined;
    const isCase = doc._type === "caseStudy";
    const from = `/${isCase ? "projects" : "services"}/${slugValue ?? "?"}`;
    const to = isCase ? "/projects" : (slugValue && TARGET[slugValue]) || "/services";
    console.log(`  - ${doc.title ?? id}  (${id})  ${from}  →  ${to}`);
    if (slugValue && !existingRedirects.some((item) => item.from === from)) {
      redirects.push({ _id: `redirect-legacy-${isCase ? "project-" : ""}${slugValue}`, _type: "redirect", from, to, permanent: true });
    }
  }

  const patches: Array<{ id: string; paths: string[] }> = [];
  for (const doc of referrers) {
    const paths = ids.flatMap((id) => [...refPaths(doc, id), ...refPaths(doc, `drafts.${id}`)]);
    if (paths.length) patches.push({ id: doc._id, paths });
  }
  if (patches.length) {
    console.log(`\nReferences to remove first (${patches.length} documents):`);
    for (const patch of patches) console.log(`  - ${patch.id}: ${patch.paths.join(", ")}`);
  }
  console.log(`\nRedirects to create (${redirects.length}):`);
  for (const item of redirects) console.log(`  - ${item.from} → ${item.to} (301)`);

  if (!apply) { console.log("\nDry run only. Run again with -- --yes to apply.\n"); return; }

  mkdirSync("dist", { recursive: true });
  const backup = `dist/legacy-services-backup-${Date.now()}.json`;
  writeFileSync(backup, JSON.stringify({ legacy, referrers }, null, 2));
  console.log(`\nBackup saved to ${backup}`);

  // 1) redirects + remove references, 2) delete the documents (Sanity blocks deleting referenced docs).
  const first = client.transaction();
  for (const item of redirects) first.createIfNotExists(item);
  for (const patch of patches) first.patch(patch.id, (p) => p.unset(patch.paths));
  await first.commit();
  const second = client.transaction();
  for (const doc of legacy) second.delete(doc._id);
  await second.commit();
  console.log(`Done: ${redirects.length} redirects created, ${patches.length} documents updated, ${legacy.length} legacy documents deleted.\n`);
}

main().catch((error) => { console.error(error); process.exit(1); });
