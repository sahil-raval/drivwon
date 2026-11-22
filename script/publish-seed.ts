/**
 * Publishes the starter content created by `npm run sanity:seed` in ONE transaction,
 * so documents that point at each other can all go live together.
 *
 *   npm run sanity:publish            → shows what will happen (no changes)
 *   npm run sanity:publish -- --yes   → does it
 *
 * What it does:
 *  - Publishes seeded drafts (pages, services, forms, FAQs, saved sections, authors, categories, landing page, settings)
 *  - Turns weak references into normal (strong) ones — fixes "Reference strength mismatch"
 *  - Removes any leftover "[CHECK] …" notes from text that would go live
 *  - Deletes OLD published pages that use the same URL slug as a seeded page (e.g. an empty old "Home"),
 *    after saving a backup to dist/sanity-backup-<time>.json
 *  - Sets Site settings → Website URL to APP_URL (default https://www.drivwon.com.au)
 *
 * Kept as drafts on purpose (they still contain placeholder text you must replace):
 *  - Locations and Case studies. Add --include-locations / --include-case-studies to publish them anyway.
 *  - Blog posts (their cover image is still the logo). Add --include-posts to publish them.
 */
import "../server/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@sanity/client";

const args = new Set(process.argv.slice(2));
const apply = args.has("--yes");
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_LEADS_TOKEN;
if (!token) {
  console.error("\nNo Sanity token found. Add SANITY_WRITE_TOKEN=sk... (Editor) to .env or .env.local in this folder.\n");
  process.exit(1);
}
const siteUrl = (process.env.APP_URL || "https://www.drivwon.com.au").replace(/\/+$/, "");
const client = createClient({ projectId: process.env.SANITY_PROJECT_ID || "v6luawxh", dataset: process.env.SANITY_DATASET || "production", apiVersion: "2026-10-12", token, useCdn: false, perspective: "raw" });

const seedPrefixes = ["page-", "service-", "form-", "faq-", "reusable-", "author-", "cat-", "lp-", "siteSettings"];
if (args.has("--include-locations")) seedPrefixes.push("location-");
if (args.has("--include-case-studies")) seedPrefixes.push("case-");
if (args.has("--include-posts")) seedPrefixes.push("post-");

type Doc = Record<string, any> & { _id: string; _type: string };

/** Removes _weak / _strengthenOnPublish everywhere and strips "[CHECK] ..." notes from strings. */
function clean(value: any, notes: string[], path = ""): any {
  if (Array.isArray(value)) return value.map((item, index) => clean(item, notes, `${path}[${index}]`));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "_weak" || key === "_strengthenOnPublish") continue;
      out[key] = clean(child, notes, path ? `${path}.${key}` : key);
    }
    return out;
  }
  if (typeof value === "string" && value.includes("[CHECK]")) {
    const fixed = value.replace(/\s*\[CHECK\][^.\n]*\.?/g, "").trim();
    notes.push(`${path}: "${value.slice(0, 60)}…" → "${fixed.slice(0, 60)}"`);
    return fixed;
  }
  return value;
}

const isSeedId = (id: string) => seedPrefixes.some((prefix) => (prefix === "siteSettings" ? id === "siteSettings" : id.startsWith(prefix)));

async function main() {
  const all = await client.fetch<Doc[]>(`*[!(_id in path("versions.**")) && _type in ["page","landingPage","service","leadForm","faq","reusableSection","author","category","post","location","caseStudy","siteSettings"]]`);
  const byId = new Map(all.map((doc) => [doc._id, doc]));
  const publishIds = new Set<string>();
  for (const doc of all) {
    const baseId = doc._id.replace(/^drafts\./, "");
    if (isSeedId(baseId)) publishIds.add(baseId);
  }

  const toPublish: Doc[] = [];
  const notes: string[] = [];
  for (const id of [...publishIds].sort()) {
    const source = byId.get(`drafts.${id}`) ?? byId.get(id);
    if (!source) continue;
    const { _rev, _createdAt, _updatedAt, ...rest } = source as any;
    const docNotes: string[] = [];
    const doc = clean({ ...rest, _id: id }, docNotes) as Doc;
    if (doc._type === "siteSettings" && (!doc.siteUrl || /drivwon\.com\/?$/.test(doc.siteUrl))) {
      docNotes.push(`siteUrl: "${doc.siteUrl ?? ""}" → "${siteUrl}"`);
      doc.siteUrl = siteUrl;
    }
    if (docNotes.length) notes.push(...docNotes.map((note) => `${id} · ${note}`));
    toPublish.push(doc);
  }

  // Old published documents that share a URL slug with something we are publishing → they would hide the new page.
  const slugKey = (doc: Doc) => {
    const slug = doc.slug?.current;
    if (!slug) return null;
    const group = doc._type === "page" || doc._type === "landingPage" ? "page" : doc._type;
    return `${group}:${slug}`;
  };
  const publishingKeys = new Map(toPublish.map((doc) => [slugKey(doc), doc._id]).filter(([key]) => key) as Array<[string, string]>);
  const duplicates = all.filter((doc) => {
    const key = slugKey(doc);
    if (!key || !publishingKeys.has(key)) return false;
    const baseId = doc._id.replace(/^drafts\./, "");
    return baseId !== publishingKeys.get(key) && !isSeedId(baseId);
  });

  const draftsToDelete = toPublish.map((doc) => `drafts.${doc._id}`).filter((id) => byId.has(id));

  console.log(`\nWill publish ${toPublish.length} documents:`);
  for (const doc of toPublish) console.log(`  ✓ ${doc._type.padEnd(15)} ${doc._id}${doc.slug?.current ? `  (/${doc.slug.current})` : ""}`);
  if (duplicates.length) {
    console.log(`\nWill DELETE ${duplicates.length} old document(s) that use the same URL (backup saved first):`);
    for (const doc of duplicates) console.log(`  ✗ ${doc._type.padEnd(15)} ${doc._id}  (/${doc.slug?.current}) — ${doc.title ?? ""}`);
  }
  if (notes.length) {
    console.log(`\nText changes:`);
    for (const note of notes) console.log(`  • ${note}`);
  }
  const keptDrafts = all.filter((doc) => doc._id.startsWith("drafts.") && !publishIds.has(doc._id.slice(7)));
  if (keptDrafts.length) console.log(`\nLeft as drafts (${keptDrafts.length}): ${keptDrafts.map((doc) => doc._id.slice(7)).join(", ")}`);

  if (!apply) {
    console.log(`\nNothing changed yet. Run again with --yes to do it:  npm run sanity:publish -- --yes\n`);
    return;
  }

  if (duplicates.length) {
    mkdirSync("dist", { recursive: true });
    const file = `dist/sanity-backup-${Date.now()}.json`;
    writeFileSync(file, JSON.stringify(duplicates, null, 2));
    console.log(`\nBackup of deleted documents: ${file}`);
  }

  const tx = client.transaction();
  for (const doc of toPublish) tx.createOrReplace(doc as any);
  for (const id of draftsToDelete) tx.delete(id);
  for (const doc of duplicates) tx.delete(doc._id);
  await tx.commit({ visibility: "sync" });
  console.log(`\nDone. Published ${toPublish.length}, removed ${draftsToDelete.length} drafts and ${duplicates.length} old duplicate(s).`);
  console.log("The website updates within about 5 minutes (cache). Hard-refresh with Cmd + Shift + R.\n");
}

main().catch((error) => {
  console.error("\nPublish failed:", error?.message ?? error);
  if (String(error?.message ?? "").includes("reference")) console.error("A document points at something that is not published. Run again with the matching --include-… flag, or remove that link in the Studio.");
  process.exit(1);
});
