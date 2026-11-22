import { Badge, Box, Card, Flex, Stack, Text } from "@sanity/ui";
import { type ObjectInputProps, useFormValue } from "sanity";

type Doc = Record<string, any> | undefined;
type Seo = Record<string, any> | undefined;

const SITE = "www.drivwon.com";

function plainText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plainText).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record._type === "span") return String(record.text ?? "");
    return Object.entries(record)
      .filter(([key]) => !key.startsWith("_") && !["settings", "asset", "image", "link", "internal"].includes(key))
      .map(([, child]) => plainText(child))
      .join(" ");
  }
  return "";
}

function pathFor(doc: Doc) {
  const slug = doc?.slug?.current ?? "";
  switch (doc?._type) {
    case "post": return `/blog/${slug}`;
    case "service": return `/services/${slug}`;
    case "location": return `/locations/${slug}`;
    case "caseStudy": return `/projects/${slug}`;
    case "category": return `/blog/category/${slug}`;
    case "author": return `/authors/${slug}`;
    case "page": return slug === "home" ? "/" : `/${slug}`;
    case "landingPage": return `/${slug}`;
    default: return slug ? `/${slug}` : "/";
  }
}

type Check = { ok: boolean | "warn"; label: string };

function runChecks(doc: Doc, seo: Seo): Check[] {
  const keyword = String(seo?.focusKeyword ?? "").trim().toLowerCase();
  const title = String(seo?.metaTitle || doc?.title || "");
  const description = String(seo?.metaDescription || doc?.excerpt || doc?.summary || "");
  const slug = String(doc?.slug?.current ?? "");
  const sections = doc?.sections ?? [];
  const hero = sections.find((section: any) => section?._type === "heroSection");
  const h1 = String(hero?.heading ?? doc?.heroHeading ?? doc?.title ?? "");
  const body = plainText(doc?.body ?? sections).toLowerCase();
  const words = body.split(/\s+/).filter(Boolean).length;
  const quick = String(seo?.quickAnswer ?? "").split(/\s+/).filter(Boolean).length;
  const slugKeyword = keyword.replace(/\s+/g, "-");
  const checks: Check[] = [
    { ok: Boolean(keyword), label: keyword ? `Focus keyword set: “${keyword}”` : "Add a focus keyword" },
    { ok: title.length >= 30 && title.length <= 60 ? true : title.length ? "warn" : false, label: `SEO title length ${title.length}/60` },
    { ok: description.length >= 120 && description.length <= 160 ? true : description.length ? "warn" : false, label: `Meta description length ${description.length}/160` },
  ];
  if (keyword) {
    checks.push(
      { ok: title.toLowerCase().includes(keyword), label: "Keyword in SEO title" },
      { ok: title.toLowerCase().indexOf(keyword) > -1 && title.toLowerCase().indexOf(keyword) < 30 ? true : "warn", label: "Keyword near the start of the title" },
      { ok: description.toLowerCase().includes(keyword), label: "Keyword in meta description" },
      { ok: h1.toLowerCase().includes(keyword) ? true : "warn", label: "Keyword (or close variant) in main H1 heading" },
      { ok: slug.includes(slugKeyword) ? true : "warn", label: "Keyword in URL slug" },
      { ok: body.includes(keyword) ? true : "warn", label: "Keyword used in the page copy" },
    );
  }
  checks.push(
    { ok: words >= 600 ? true : words >= 300 ? "warn" : false, label: `About ${words} words of copy (aim for 600+ on service pages, 1,200+ on guides)` },
    { ok: quick >= 25 && quick <= 70 ? true : quick ? "warn" : false, label: quick ? `Quick answer: ${quick} words (aim 40–60)` : "Add a quick answer for AI search (AEO)" },
    { ok: Boolean(seo?.ogImage?.asset || hero?.image?.asset || doc?.coverImage?.asset || doc?.mainImage?.asset) ? true : "warn", label: "Share image (or hero / cover image) set" },
    { ok: (seo?.keyFacts?.length ?? 0) >= 2 ? true : "warn", label: "At least 2 key facts for AI engines (GEO)" },
    { ok: !seo?.noIndex ? true : "warn", label: seo?.noIndex ? "Page is set to noindex — it will NOT appear in Google" : "Page can be indexed" },
  );
  const faqCount = sections.filter((section: any) => section?._type === "faqSection").length + (doc?.faqs?.length ? 1 : 0);
  checks.push({ ok: faqCount > 0 ? true : "warn", label: "Has an FAQ block (helps People Also Ask + AI answers)" });
  return checks;
}

function tone(ok: Check["ok"]) {
  return ok === true ? "positive" : ok === "warn" ? "caution" : "critical";
}

export function SeoInput(props: ObjectInputProps) {
  const doc = useFormValue([]) as Doc;
  const seo = props.value as Seo;
  const isSettings = doc?._type === "siteSettings";
  const title = String(seo?.metaTitle || doc?.title || "Page title");
  const description = String(seo?.metaDescription || doc?.excerpt || doc?.summary || "Add a meta description to control the text Google shows.");
  const path = pathFor(doc);
  const checks = isSettings ? [] : runChecks(doc, seo);
  const passed = checks.filter((check) => check.ok === true).length;
  return (
    <Stack space={4}>
      {!isSettings && (
        <Card padding={4} radius={3} shadow={1} tone="default">
          <Stack space={3}>
            <Text size={1} weight="semibold" muted>Google preview</Text>
            <Text size={1} muted>{SITE}{path === "/" ? "" : ` › ${path.split("/").filter(Boolean).join(" › ")}`}</Text>
            <Text size={3} style={{ color: "#1a0dab" }}>{title.length > 60 ? `${title.slice(0, 60)}…` : title}</Text>
            <Text size={1} muted>{description.length > 160 ? `${description.slice(0, 158)}…` : description}</Text>
          </Stack>
        </Card>
      )}
      {!isSettings && (
        <Card padding={4} radius={3} border>
          <Stack space={3}>
            <Flex align="center" justify="space-between">
              <Text size={1} weight="semibold">SEO checklist</Text>
              <Badge tone={passed / Math.max(checks.length, 1) > 0.8 ? "positive" : "caution"}>{passed}/{checks.length} done</Badge>
            </Flex>
            {checks.map((check) => (
              <Flex key={check.label} gap={2} align="center">
                <Badge tone={tone(check.ok)} fontSize={0}>{check.ok === true ? "✓" : check.ok === "warn" ? "!" : "✗"}</Badge>
                <Text size={1}>{check.label}</Text>
              </Flex>
            ))}
            <Box><Text size={0} muted>The checklist is a guide, not a score Google uses. Write for people first.</Text></Box>
          </Stack>
        </Card>
      )}
      {props.renderDefault(props)}
    </Stack>
  );
}
