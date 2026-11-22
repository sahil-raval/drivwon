/**
 * Seeds the Drivwon Sanity dataset with a full, SEO-ready starting site.
 *
 *   SANITY_WRITE_TOKEN=xxx npx tsx script/seed-sanity.ts            → creates DRAFTS only (safe; nothing goes live)
 *   SANITY_WRITE_TOKEN=xxx npx tsx script/seed-sanity.ts --publish  → creates published documents
 *   npx tsx script/seed-sanity.ts --dry-run                        → writes dist/seed.ndjson, no network
 *   add --force to overwrite documents that already exist (default: never overwrite your edits)
 *
 * Everything marked [CHECK] in Studio must be confirmed by a human before publishing.
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const publish = args.has("--publish");
const force = args.has("--force");
const token = process.env.SANITY_WRITE_TOKEN;
if (!dryRun && !token) throw new Error("Set SANITY_WRITE_TOKEN (Editor token) or use --dry-run.");

const client = createClient({ projectId: process.env.SANITY_PROJECT_ID || "v6luawxh", dataset: process.env.SANITY_DATASET || "production", apiVersion: "2026-10-12", token, useCdn: false });

// ── helpers ─────────────────────────────────────────────────────────
let keyCounter = 0;
const k = () => `k${(++keyCounter).toString(36)}`;
type Doc = Record<string, any> & { _id: string; _type: string };
// Drafts may point at other drafts, so references are weak until you publish from the Studio.
const weak = publish ? {} : { _weak: true };
const ref = (id: string) => ({ _type: "reference", _ref: id, _key: k(), ...weak });
const refOne = (id: string) => ({ _type: "reference", _ref: id, ...weak });
const slug = (current: string) => ({ _type: "slug", current });
const block = (text: string, style = "normal", listItem?: "bullet" | "number") => ({ _key: k(), _type: "block", style, markDefs: [], ...(listItem ? { listItem, level: 1 } : {}), children: [{ _key: k(), _type: "span", marks: [], text }] });
/** Tiny markdown-ish helper: "## " = h2, "### " = h3, "- " = bullet, "1. " = numbered, "> " = quote. */
const pt = (text: string) => text.trim().split(/\n{2,}|\n(?=[-#>]|\d+\. )/).map((raw) => {
  const line = raw.trim();
  if (line.startsWith("### ")) return block(line.slice(4), "h3");
  if (line.startsWith("## ")) return block(line.slice(3), "h2");
  if (line.startsWith("> ")) return block(line.slice(2), "blockquote");
  if (line.startsWith("- ")) return block(line.slice(2), "normal", "bullet");
  if (/^\d+\. /.test(line)) return block(line.replace(/^\d+\. /, ""), "normal", "number");
  return block(line.replace(/\n/g, " "));
});
const L = {
  to: (id: string, label: string, style = "primary", trackingEvent?: string) => ({ _key: k(), _type: "link", label, linkType: "internal", internal: refOne(id), style, trackingEvent }),
  path: (pathValue: string, label: string, style = "primary", trackingEvent?: string) => ({ _key: k(), _type: "link", label, linkType: "path", path: pathValue, style, trackingEvent }),
  phone: (label: string, style = "secondary") => ({ _key: k(), _type: "link", label, linkType: "phone", phone: PHONE, style, trackingEvent: "phone_click" }),
};
const qa = (question: string, answer: string) => ({ _key: k(), _type: "qa", question, answer });
const seo = (fields: Record<string, any>) => ({ _type: "seo", includeInLlms: true, speakable: true, maxSnippet: -1, maxImagePreview: "large", ...fields });
const entity = (name: string, type: string, sameAs: string[] = []) => ({ _key: k(), _type: "entity", name, type, sameAs });
const sec = (type: string, fields: Record<string, any>, settings: Record<string, any> = {}) => ({ _key: k(), _type: type, ...fields, settings: { _type: "sectionSettings", animate: true, ...settings } });
const feature = (icon: string, title: string, body: string, extra: Record<string, any> = {}) => ({ _key: k(), _type: "featureItem", icon, title, body, ...extra });
const step = (title: string, body: string, bullets: string[] = [], duration?: string) => ({ _key: k(), _type: "step", title, body, bullets, duration });

const PHONE = "0474 817 548"; // Confirmed by owner. Use this exact number on Google Business Profile and every directory.
const PHONE_E164 = "+61474817548";
const now = new Date().toISOString();

const GEELONG = entity("Geelong", "City", ["https://en.wikipedia.org/wiki/Geelong", "https://www.wikidata.org/wiki/Q191269"]);
const SEO_ENTITY = entity("Search engine optimization", "Thing", ["https://en.wikipedia.org/wiki/Search_engine_optimization"]);
const WEBDEV_ENTITY = entity("Web development", "Thing", ["https://en.wikipedia.org/wiki/Web_development"]);
const GEO_ENTITY = entity("Generative engine optimization", "Thing", ["https://en.wikipedia.org/wiki/Generative_engine_optimization"]);

// ── images ──────────────────────────────────────────────────────────
const imageFiles = {
  logo: "client/src/assets/logo.png",
  sahil: "client/src/assets/team/sahil.jpeg",
  daytoday: "client/src/assets/projects/Daytoday.webp",
  varni: "client/src/assets/projects/Varni.webp",
  scrub: "client/src/assets/projects/Scrub.webp",
  msm: "client/src/assets/projects/msm.webp",
};
type Img = { _type: "image"; asset: { _type: "reference"; _ref: string }; alt: string };
async function uploadImages(): Promise<Record<keyof typeof imageFiles, string>> {
  const out: Record<string, string> = {};
  for (const [name, file] of Object.entries(imageFiles)) {
    if (dryRun) { out[name] = `image-dry${name}000000000000000000000000-1200x800-png`; continue; }
    const asset = await client.assets.upload("image", createReadStream(path.join(process.cwd(), file)), { filename: path.basename(file) });
    out[name] = asset._id;
  }
  return out as any;
}
const img = (assetId: string, alt: string): Img => ({ _type: "image", asset: { _type: "reference", _ref: assetId }, alt });

// ── build documents ─────────────────────────────────────────────────
function buildDocs(images: Record<keyof typeof imageFiles, string>): Doc[] {
  const docs: Doc[] = [];
  const add = <T extends Doc>(doc: T) => (docs.push(doc), doc);

  // Authors
  add({
    _id: "author-sahil-raval", _type: "author", name: "Sahil Raval", slug: slug("sahil-raval"), role: "Founder, AI Engineer & Full-Stack Developer",
    image: img(images.sahil, "Sahil Raval, founder of Drivwon"),
    shortBio: "Sahil founded Drivwon in Geelong. He builds websites, SEO systems and AI automation for local and Australian businesses.",
    bio: pt(`Sahil Raval is the founder of Drivwon. He is a full-stack developer and AI engineer who builds websites, apps, SEO systems and AI tools for businesses in Geelong and across Australia.\n\nHe holds a Master of Applied Artificial Intelligence (Professional) from Deakin University, completed with High Distinction, and is an AWS Certified Solutions Architect – Associate.\n\nHis client work covers real estate, B2B trade, solar and energy, and precision engineering.`),
    credentials: ["Master of Applied Artificial Intelligence (Professional), Deakin University — High Distinction", "AWS Certified Solutions Architect – Associate", "Bachelor of Computer Science Engineering, Chandigarh University"],
    alumniOf: ["Deakin University", "Chandigarh University"],
    knowsAbout: ["Search engine optimisation", "Web development", "React", "Next.js", "Sanity CMS", "AWS", "Artificial intelligence", "AI automation", "Generative engine optimisation"],
    sameAs: [], // [CHECK] add LinkedIn + GitHub URLs
    showOnTeamPage: true,
  });

  // Categories
  const categories = [
    ["cat-seo", "SEO", "seo", "Guides on ranking higher on Google in Geelong and across Australia — local SEO, technical SEO and content that brings in leads."],
    ["cat-ai-search", "AI Search (GEO & AEO)", "ai-search", "How to get your business found and recommended in ChatGPT, Google AI Overviews, Perplexity and Claude."],
    ["cat-web-design", "Web Design", "web-design", "Website costs, planning, speed and design tips for small businesses."],
    ["cat-automation", "AI & Automation", "ai-automation", "Practical ways to use AI agents and automation to save time in your business."],
  ];
  for (const [id, title, value, description] of categories) add({ _id: id, _type: "category", title, slug: slug(value), description, seo: seo({ metaTitle: `${title} Articles | Drivwon Blog`, metaDescription: description }) });

  // Lead forms
  add({ _id: "form-contact", _type: "leadForm", title: "Contact form", leadType: "enquiry", submitLabel: "Send message", successTitle: "Thanks — we got your message", successMessage: "We reply within one business day. If it is urgent, give us a call.", privacyNote: "We only use your details to reply to you. No spam.", estimatedValue: 500, redirectTo: refOne("page-thank-you"),
    fields: [
      { _key: k(), _type: "formField", name: "name", label: "Name", type: "text", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "email", label: "Email", type: "email", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "phone", label: "Phone", type: "tel", width: "half" },
      { _key: k(), _type: "formField", name: "service", label: "What do you need?", type: "select", width: "half", options: ["SEO", "New website", "Website + SEO", "AI search (GEO)", "E-commerce", "App or software", "AI automation", "Not sure yet"] },
      { _key: k(), _type: "formField", name: "message", label: "Tell us about your business and goals", type: "textarea", required: true },
    ] });
  add({ _id: "form-quote", _type: "leadForm", title: "Quote request", leadType: "quote", submitLabel: "Get my quote", successTitle: "Quote request received", successMessage: "We will review your needs and send a clear, fixed quote within two business days.", privacyNote: "No obligation. No lock-in contracts.", estimatedValue: 1500, redirectTo: refOne("page-thank-you"),
    fields: [
      { _key: k(), _type: "formField", name: "name", label: "Full name", type: "text", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "company", label: "Business name", type: "text", width: "half" },
      { _key: k(), _type: "formField", name: "email", label: "Email", type: "email", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "phone", label: "Phone", type: "tel", width: "half" },
      { _key: k(), _type: "formField", name: "website", label: "Current website (if any)", type: "url", width: "half" },
      { _key: k(), _type: "formField", name: "service", label: "Service", type: "select", required: true, width: "half", options: ["SEO (monthly)", "New website", "Website + SEO", "AI search optimisation", "E-commerce store", "Mobile app", "Custom software", "AI automation", "Branding"] },
      { _key: k(), _type: "formField", name: "budget", label: "Budget", type: "select", required: true, options: ["Under $2,000", "$2,000 – $5,000", "$5,000 – $10,000", "$10,000+", "Monthly: $650 – $1,300", "Not sure"] },
      { _key: k(), _type: "formField", name: "message", label: "Project details", type: "textarea", required: true, placeholder: "What do you want to achieve? Any deadlines?" },
    ] });
  add({ _id: "form-audit", _type: "leadForm", title: "Free SEO audit", leadType: "audit", submitLabel: "Send me my free audit", successTitle: "Your audit is on the way", successMessage: "We will check your site and Google Business Profile and email you a short video audit within two business days.", privacyNote: "Free. No obligation. We will not spam you.", estimatedValue: 800, redirectTo: refOne("page-thank-you"),
    fields: [
      { _key: k(), _type: "formField", name: "name", label: "Name", type: "text", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "email", label: "Email", type: "email", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "website", label: "Your website", type: "url", required: true, width: "half" },
      { _key: k(), _type: "formField", name: "phone", label: "Phone", type: "tel", width: "half" },
      { _key: k(), _type: "formField", name: "message", label: "What do you want more of?", type: "radio", options: ["Calls", "Form enquiries", "Online sales", "Bookings"] },
    ] });

  // Reusable CTA
  add({ _id: "reusable-main-cta", _type: "reusableSection", title: "Main call to action", sections: [
    sec("ctaSection", { eyebrow: "Based in Geelong", heading: "Ready to get more leads from Google?", body: "Tell us what you need. We reply within one business day with honest advice and a clear price — no lock-in contracts.", buttons: [L.path("/quotation", "Get a free quote", "primary", "cta_quote"), L.phone(`Call ${PHONE}`)], style: "banner" }),
  ] });

  // Services
  type ServiceSpec = { id: string; title: string; short: string; slugValue: string; icon: string; summary: string; h1: string; highlight?: string; sub: string; focus: string; secondary: string[]; metaTitle: string; metaDescription: string; quickQ: string; quick: string; facts: string[]; features: Array<[string, string, string]>; deliverables: string[]; faqs: Array<[string, string]>; priceFrom?: number; priceTo?: number; priceUnit?: string; serviceType: string; turnaround?: string; order: number; about: any[]; extra?: any[] };
  const services: ServiceSpec[] = [
    {
      id: "service-seo-geelong", title: "SEO Geelong", short: "SEO", slugValue: "seo-geelong", icon: "Search", order: 1, serviceType: "Search engine optimization",
      summary: "Monthly SEO for Geelong businesses. Local SEO, Google Business Profile, technical fixes and content that brings in calls and enquiries.",
      h1: "SEO in Geelong that brings in real leads", highlight: "real leads", sub: "We help Geelong businesses show up on Google, Google Maps and AI search — then turn that traffic into calls and enquiries. Clear monthly reports. No lock-in contracts.",
      focus: "seo geelong", secondary: ["seo agency geelong", "seo company geelong", "seo services geelong", "local seo geelong", "geelong seo"],
      metaTitle: "SEO Geelong | Local SEO Agency | Drivwon", metaDescription: "SEO services for Geelong businesses from $650/month. Local SEO, Google Business Profile, technical fixes and content. No lock-in contracts. Free audit.",
      quickQ: "How much does SEO cost in Geelong?", quick: "Drivwon’s SEO plans for Geelong businesses cost $650 to $1,299 per month (AUD). Price depends on how competitive your industry is and how many locations or services you target. Most businesses see early movement in 3 to 6 months, and plans have no lock-in contracts.",
      facts: ["SEO plans from $650 to $1,299 per month (AUD)", "No lock-in contracts", "Based in Geelong, Victoria", "Covers Google Search, Google Maps and AI search engines"],
      features: [["MapPin", "Local SEO & Google Business Profile", "We set up and grow your Google Business Profile so you show in the Map Pack for searches near you."], ["Gauge", "Technical SEO", "Speed, mobile, indexing, schema markup and site structure fixed properly — we are developers, so fixes get done, not just reported."], ["PenTool", "Content that ranks", "Service pages, location pages and blog posts written for real customer questions in plain English."], ["Bot", "AI search (GEO)", "We structure your content so ChatGPT, Google AI Overviews and Perplexity can understand and recommend your business."], ["LineChart", "Tracking & reports", "GA4, Search Console and call tracking set up so you can see leads, not just rankings."], ["Award", "Reviews & reputation", "A simple system to get more genuine Google reviews from happy customers."]],
      deliverables: ["SEO audit and keyword plan for Geelong", "Google Business Profile optimisation", "On-page SEO for key service pages", "Technical SEO fixes", "Schema markup (LocalBusiness, Service, FAQ)", "Monthly content", "Local citations and listings clean-up", "Monthly report with leads and rankings"],
      faqs: [["How long does SEO take to work?", "Most Geelong businesses see early movement in 3 to 6 months. Competitive industries can take 6 to 12 months. We show progress in a monthly report from month one."], ["Do you lock me into a contract?", "No. Our SEO plans are month to month. We keep clients by getting results, not by contracts."], ["Can you guarantee first place on Google?", "No honest SEO company can guarantee rankings. Google decides. We can guarantee the work we do each month and show it clearly in reports."], ["Do I need a new website for SEO?", "Not always. If your site is slow, hard to edit or built badly, a rebuild can be the fastest path. We will tell you honestly after the audit."], ["Do you only work with Geelong businesses?", "We are based in Geelong and focus on Geelong, the Surf Coast and the Bellarine, but we also work with businesses across Australia."]],
      priceFrom: 650, priceTo: 1299, priceUnit: "per month", turnaround: "Ongoing, monthly", about: [SEO_ENTITY, GEELONG],
    },
    {
      id: "service-web-design-geelong", title: "Web Design Geelong", short: "Web design", slugValue: "web-design-geelong", icon: "Globe", order: 2, serviceType: "Web design",
      summary: "Fast, custom websites for Geelong businesses, built in-house with SEO and lead tracking from day one. Easy for you to edit.",
      h1: "Web design in Geelong, built to win customers", highlight: "win customers", sub: "Custom websites that load fast, rank on Google and turn visitors into enquiries. Designed and built in-house by our Geelong team — and easy for you to update.",
      focus: "web design geelong", secondary: ["website design geelong", "web designer geelong", "web development geelong", "website developer geelong", "geelong web design"],
      metaTitle: "Web Design Geelong | Custom Websites | Drivwon", metaDescription: "Custom website design in Geelong from $1,800. Fast, mobile-first, SEO-ready and easy to edit. Built in-house by a local team. Get a fixed quote.",
      quickQ: "How much does a website cost in Geelong?", quick: "A small business website from Drivwon in Geelong usually costs $1,800 to $2,350 (AUD) as a one-off price. Bigger sites, online stores and custom features cost more. Every site includes mobile design, basic SEO, analytics and a CMS so you can edit it yourself.",
      facts: ["Small business websites from $1,800 to $2,350 (AUD)", "Built in-house in Geelong", "Includes SEO setup, analytics and an easy CMS", "Typical timeframe 3 to 6 weeks"],
      features: [["Gauge", "Fast by default", "Modern code, optimised images and good hosting, so pages load fast on mobile — a Google ranking factor."], ["Search", "SEO built in", "Clean structure, schema markup, meta tags, sitemaps and redirects handled before launch."], ["PenTool", "Easy to edit", "Change text, images and pages yourself with a simple CMS. No developer needed for small changes."], ["Target", "Made to convert", "Clear calls to action, quick forms, click-to-call and trust signals in the right places."], ["ShieldCheck", "Secure & reliable", "HTTPS, backups and updates handled. No plugin mess."], ["LineChart", "Lead tracking", "Every form and call tracked in GA4 so you know which pages bring in work."]],
      deliverables: ["Discovery call and site plan", "Custom design (mobile and desktop)", "Up to 8 pages (more on request)", "Easy-to-use CMS", "On-page SEO and schema markup", "GA4 and Search Console setup", "Contact and quote forms with lead tracking", "Launch, redirects and training"],
      faqs: [["How long does a website take?", "Most small business websites take 3 to 6 weeks from the first call to launch. It depends on how fast content and feedback come in."], ["Can I edit the website myself?", "Yes. We build on a CMS so you can change text, images, blog posts and pages without code."], ["Do you use WordPress?", "We pick the right tool for the job — WordPress, Shopify, or a custom React/Next.js site with Sanity CMS for speed and flexibility. We explain the trade-offs in plain English."], ["Is SEO included?", "Every site includes technical and on-page SEO setup. Ongoing SEO to grow rankings is a separate monthly plan."], ["Do you do hosting?", "Yes, we can host and look after your site, or set it up on hosting you own."]],
      priceFrom: 1800, priceTo: 2350, priceUnit: "one-off", turnaround: "3–6 weeks", about: [WEBDEV_ENTITY, GEELONG],
    },
    {
      id: "service-ai-search-optimisation", title: "AI Search Optimisation (GEO & AEO)", short: "AI search (GEO)", slugValue: "ai-search-optimisation", icon: "Sparkles", order: 3, serviceType: "Generative engine optimization",
      summary: "Get your business understood, cited and recommended by ChatGPT, Google AI Overviews, Perplexity and Claude.",
      h1: "Get recommended by ChatGPT and Google AI", highlight: "ChatGPT and Google AI", sub: "More people now ask AI assistants for recommendations. We make sure AI engines can find, trust and quote your business — using the same structured approach we use for Google.",
      focus: "ai search optimisation", secondary: ["generative engine optimisation", "geo agency australia", "answer engine optimisation", "chatgpt seo", "ai seo geelong"],
      metaTitle: "AI Search Optimisation (GEO) | Get Found in ChatGPT | Drivwon", metaDescription: "Generative engine optimisation (GEO) and AEO for Australian businesses. Get cited by ChatGPT, Google AI Overviews and Perplexity. Built by AI engineers in Geelong.",
      quickQ: "What is generative engine optimisation (GEO)?", quick: "Generative engine optimisation (GEO) is the work of making your business easy for AI assistants like ChatGPT, Google AI Overviews, Perplexity and Claude to find, understand and recommend. It combines clear, factual content, structured data, consistent business details across the web and pages that AI crawlers can read.",
      facts: ["Covers ChatGPT, Google AI Overviews, Perplexity, Claude and Copilot", "Built by AI engineers, not just marketers", "Includes llms.txt, structured data and entity consistency", "Works together with normal SEO"],
      features: [["Bot", "AI visibility check", "We ask AI assistants the questions your customers ask and record if and how they mention you and your competitors."], ["Network", "Entity consistency", "Your name, address, phone, services and profiles made consistent everywhere AI engines look."], ["Database", "Structured data", "Detailed schema markup so machines understand exactly who you are, what you do and where."], ["MessageSquare", "Answer-first content", "Clear, quotable answers and facts on your pages — the format AI engines like to cite."], ["Cpu", "AI-crawler access", "We make sure GPTBot, ClaudeBot and PerplexityBot can read your content, and add an llms.txt guide."], ["LineChart", "Track AI referrals", "See visits and leads that come from ChatGPT, Perplexity and other AI tools in GA4."]],
      deliverables: ["AI visibility baseline report", "Entity and NAP consistency fixes", "Advanced schema markup", "Answer-first rewrites of key pages", "llms.txt and AI crawler setup", "AI referral tracking in GA4", "Quarterly AI visibility re-check"],
      faqs: [["Is GEO different from SEO?", "Yes and no. GEO builds on good SEO — AI engines still rely on search indexes and trusted pages. GEO adds a focus on clear facts, structured data and being mentioned on sources that AI engines read."], ["Can you guarantee ChatGPT will recommend me?", "No. Nobody controls AI answers. We improve the signals AI engines use and measure changes over time."], ["How do you measure AI visibility?", "We run a fixed set of real customer questions through AI assistants on a schedule and track mentions, citations and accuracy. We also track AI referral traffic in GA4."]],
      priceFrom: 650, priceUnit: "per month", about: [GEO_ENTITY, SEO_ENTITY],
    },
    {
      id: "service-ecommerce", title: "E-commerce Website Development", short: "E-commerce", slugValue: "ecommerce-development", icon: "ShoppingCart", order: 4, serviceType: "E-commerce development",
      summary: "Online stores on Shopify, WooCommerce or fully custom — built to rank, load fast and sell.",
      h1: "E-commerce websites that sell", sub: "Shopify, WooCommerce or custom stores for Australian businesses. Fast product pages, clean checkout, product schema and Google Shopping feeds.",
      focus: "ecommerce website development geelong", secondary: ["shopify developer geelong", "woocommerce developer geelong", "online store geelong"],
      metaTitle: "E-commerce Website Development Geelong | Drivwon", metaDescription: "Shopify, WooCommerce and custom online stores for Geelong and Australian businesses. Fast, SEO-ready, with product schema and Google Shopping feeds.",
      quickQ: "Shopify or WooCommerce — which is better for a small business?", quick: "Shopify is usually better if you want low maintenance and fast setup. WooCommerce suits businesses that already use WordPress and want more control. A custom store makes sense for complex products or pricing. We help you choose based on your products, budget and how you sell.",
      facts: ["Shopify, WooCommerce and custom builds", "Product schema and Google Merchant Center feeds", "Payments, shipping and GST set up"],
      features: [["ShoppingCart", "Store setup", "Products, collections, payments, shipping zones and GST set up properly."], ["Search", "Product SEO", "Product and category pages structured to rank, with Product schema."], ["Gauge", "Fast checkout", "Fewer steps and faster pages mean fewer abandoned carts."], ["Workflow", "Integrations", "Xero, inventory, email marketing and shipping apps connected."]],
      deliverables: ["Store design and build", "Product import", "Payment and shipping setup", "Product schema and feeds", "GA4 e-commerce tracking", "Training"],
      faqs: [["How much does an online store cost?", "Most small online stores start from around $3,000 depending on the platform, number of products and integrations. We give a fixed quote after a short call."], ["Can you move my existing store?", "Yes. We migrate products, customers and orders and set up redirects so you keep your Google rankings."]],
      priceFrom: 3000, priceUnit: "one-off", about: [entity("E-commerce", "Thing", ["https://en.wikipedia.org/wiki/E-commerce"])],
    },
    {
      id: "service-ai-automation", title: "AI Agents & Business Automation", short: "AI automation", slugValue: "ai-automation", icon: "Workflow", order: 5, serviceType: "Business process automation",
      summary: "Custom AI agents and automations that take repetitive admin off your plate — quotes, emails, data entry and reporting.",
      h1: "AI automation for small businesses", sub: "We build AI agents and automations that answer enquiries, write quotes, move data between apps and create reports — so your team spends time on real work.",
      focus: "ai automation geelong", secondary: ["ai agency geelong", "business automation geelong", "ai agents for small business"],
      metaTitle: "AI Automation & AI Agents Geelong | Drivwon", metaDescription: "Custom AI agents and business automation for Geelong and Australian businesses. Save hours on quotes, emails, data entry and reporting. Built by AI engineers.",
      quickQ: "What can AI automation do for a small business?", quick: "AI automation can answer common customer questions, sort and reply to emails, create quotes, enter data into your CRM or accounting system and build reports — automatically. A good first project usually saves several hours a week and pays for itself within a few months.",
      facts: ["Built by an AI engineer with a Master of Applied AI (Deakin)", "Connects tools like Gmail, Xero, HubSpot and Google Sheets", "Starts with one small, measurable process"],
      features: [["Bot", "AI agents", "Assistants that answer enquiries, qualify leads and book calls — trained on your own information."], ["Workflow", "Workflow automation", "Connect your apps so data moves by itself. No more copy and paste."], ["BarChart3", "Dashboards", "Live reports pulled from your systems, so you can see what is happening."], ["Lock", "Safe by design", "Human review where it matters, clear limits and your data kept private."]],
      deliverables: ["Process review", "Automation plan with time-saving estimate", "Build and testing", "Training and handover", "Monitoring"],
      faqs: [["Is AI automation safe for customer data?", "Yes, when built carefully. We keep a human in the loop for important actions, limit what the AI can access and use providers with strong privacy terms."], ["Do I need technical staff?", "No. We build, test and hand over simple controls your team can use."]],
      about: [entity("Business process automation", "Thing", ["https://en.wikipedia.org/wiki/Business_process_automation"])],
    },
    {
      id: "service-custom-software", title: "Custom Software & SaaS Development", short: "Custom software", slugValue: "custom-software-development", icon: "Code2", order: 6, serviceType: "Software development",
      summary: "Web apps, portals, dashboards and SaaS products built around how your business really works.",
      h1: "Custom software built around your business", sub: "From internal tools and client portals to full SaaS products — designed, built and supported in-house.",
      focus: "custom software development geelong", secondary: ["software developer geelong", "web app development geelong", "saas development australia"],
      metaTitle: "Custom Software & Web App Development Geelong | Drivwon", metaDescription: "Custom web apps, portals, dashboards and SaaS products for Australian businesses. Designed and built in-house in Geelong with React, Node.js and AWS.",
      quickQ: "When should a business build custom software?", quick: "Build custom software when off-the-shelf tools force you into slow workarounds, you pay for many tools that do not talk to each other, or the software itself is your product. Start small with one core workflow, then grow it.",
      facts: ["React, Next.js, Node.js, Python and AWS", "AWS Certified Solutions Architect on the team", "Milestone-based delivery"],
      features: [["Code2", "Web apps & portals", "Booking systems, client portals, quoting tools and internal dashboards."], ["Cloud", "Cloud architecture", "Secure, scalable setups on AWS designed by a certified solutions architect."], ["Layers", "SaaS products", "MVPs to full products with accounts, billing and admin panels."]],
      deliverables: ["Discovery and scope", "UX design", "Build in milestones", "Testing", "Deployment and support"],
      faqs: [["How much does custom software cost?", "Small internal tools can start from a few thousand dollars. Larger products are scoped and priced in milestones so you only commit to one stage at a time."]],
      about: [entity("Software development", "Thing", ["https://en.wikipedia.org/wiki/Software_development"])],
    },
    {
      id: "service-app-development", title: "Mobile App Development", short: "Mobile apps", slugValue: "app-development", icon: "Smartphone", order: 7, serviceType: "Mobile app development",
      summary: "iOS and Android apps built with the same care as our websites — from idea to App Store.",
      h1: "Mobile app development for iOS and Android", sub: "Cross-platform apps for Australian businesses and community groups — planned, designed, built and published by one team.",
      focus: "app development geelong", secondary: ["app developer geelong", "mobile app developer geelong", "ios android app development australia"],
      metaTitle: "App Development Geelong | iOS & Android Apps | Drivwon", metaDescription: "Mobile app development in Geelong for iOS and Android. Cross-platform apps planned, designed, built and published by one in-house team.",
      quickQ: "How long does it take to build an app?", quick: "A simple app with a few core screens usually takes 8 to 12 weeks to design, build and publish. Apps with accounts, payments or complex data take longer. We start with the smallest version that is useful, then add features.",
      facts: ["iOS and Android from one codebase", "Design, build and App Store publishing", "Backend and admin panels included"],
      features: [["Smartphone", "Cross-platform apps", "One codebase for iPhone and Android saves time and money."], ["Database", "Backend & admin", "Secure APIs, databases and an admin panel to manage content."], ["Rocket", "Publishing", "We handle App Store and Google Play submission."]],
      deliverables: ["App plan and wireframes", "UI design", "App build", "Backend and admin", "Store publishing"],
      faqs: [["Do I need an app or a website?", "Most small businesses need a great mobile website first. An app makes sense when people use it often, need offline access or need phone features like notifications."]],
      about: [entity("Mobile app development", "Thing", ["https://en.wikipedia.org/wiki/Mobile_app_development"])],
    },
    {
      id: "service-branding", title: "Branding & UI/UX Design", short: "Branding & UX", slugValue: "branding-ui-ux-design", icon: "Palette", order: 8, serviceType: "Brand design",
      summary: "Logos, brand identity and interface design that make your business look as good as it is.",
      h1: "Branding and UI/UX design", sub: "Brand identity, logos and interface design that give your business a clear, consistent look across your website, socials and print.",
      focus: "branding agency geelong", secondary: ["logo design geelong", "graphic design geelong", "ui ux design geelong"],
      metaTitle: "Branding & Logo Design Geelong | UI/UX | Drivwon", metaDescription: "Brand identity, logo design and UI/UX design for Geelong businesses. A clear, consistent look across your website, socials and print.",
      quickQ: "What is included in a brand identity?", quick: "A brand identity usually includes a logo, colour palette, fonts, simple brand guidelines and templates for socials or documents. It keeps your business looking consistent everywhere, which builds trust.",
      facts: ["Logo, colours, fonts and guidelines", "Designed in Figma", "Ready for web, social and print"],
      features: [["Palette", "Brand identity", "Logo, colours and fonts that fit who you are."], ["PenTool", "UI/UX design", "Wireframes and prototypes tested before building."], ["Layers", "Brand kit", "Templates for social posts, documents and presentations."]],
      deliverables: ["Brand workshop", "Logo concepts", "Colour and type system", "Brand guidelines", "Templates"],
      faqs: [["Can you redesign my existing logo?", "Yes. Often a refresh keeps what people recognise and fixes what does not work."]],
      about: [entity("Brand", "Thing", ["https://en.wikipedia.org/wiki/Brand"])],
    },
  ];

  for (const spec of services) {
    const sections: any[] = [
      sec("heroSection", { layout: "centered", eyebrow: spec.title.includes("Geelong") ? "Geelong, VIC" : "Drivwon", heading: spec.h1, highlight: spec.highlight, subheading: spec.sub, buttons: [L.path("/quotation", "Get a free quote", "primary", "cta_hero_quote"), L.phone(`Call ${PHONE}`)], trustItems: ["Local Geelong team", "No lock-in contracts", "Reply within 1 business day"] }),
      sec("quickAnswerSection", { label: "Quick answer", question: spec.quickQ, answer: spec.quick, points: spec.facts }),
      sec("featureGridSection", { eyebrow: "What we do", heading: `${spec.short === "SEO" ? "Our SEO services" : `What is included in ${spec.short.toLowerCase()}`}`, headingLevel: "h2", columns: 3, style: "card", items: spec.features.map(([icon, title, body]) => feature(icon, title, body)) }),
      sec("processSection", { eyebrow: "How it works", heading: "A simple, clear process", headingLevel: "h2", steps: [step("Free call & audit", "We learn about your business and goals and check where you stand today.", [], "Week 1"), step("Clear plan & fixed price", "You get a written plan, timeline and price. No surprises.", [], "Week 1"), step("We do the work", "Our in-house team builds and optimises, with regular updates.", []), step("Measure & improve", "We track leads and results and keep improving.", [])] }),
      ...(spec.extra ?? []),
      sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
    ];
    if (spec.id === "service-seo-geelong") {
      sections.splice(4, 0, sec("pricingSection", { eyebrow: "Pricing", heading: "SEO plans for Geelong businesses", headingLevel: "h2", intro: "Month to month. Cancel any time.", outputOffers: true, note: "Prices in AUD. [CHECK] confirm whether prices include GST.", plans: [
        { _key: k(), _type: "plan", name: "Local", price: "$650", priceNumber: 650, period: "/month", description: "For one location and a few core services.", features: ["Google Business Profile management", "On-page SEO for 5 pages", "Technical fixes", "Monthly report"], link: L.path("/quotation", "Start with Local", "secondary") },
        { _key: k(), _type: "plan", name: "Growth", price: "$950", priceNumber: 950, period: "/month", description: "For businesses ready to grow leads fast.", highlighted: true, features: ["Everything in Local", "2 new pages or articles a month", "Citations and reviews system", "AI search (GEO) basics"], link: L.path("/quotation", "Choose Growth") },
        { _key: k(), _type: "plan", name: "Dominate", price: "$1,299", priceNumber: 1299, period: "/month", description: "For competitive industries or several suburbs.", features: ["Everything in Growth", "4 pieces of content a month", "Location pages strategy", "Digital PR and links", "Quarterly strategy session"], link: L.path("/quotation", "Choose Dominate", "secondary") },
      ] }));
      sections.splice(5, 0, sec("comparisonSection", { heading: "Why Geelong businesses choose Drivwon", headingLevel: "h2", columns: ["", "Drivwon", "Typical SEO agency"], rows: [
        { _key: k(), _type: "comparisonRow", cells: ["Developers do the technical fixes", "✓", "Often outsourced"] },
        { _key: k(), _type: "comparisonRow", cells: ["AI search (GEO) included", "✓", "Rare"] },
        { _key: k(), _type: "comparisonRow", cells: ["Lock-in contract", "✗", "Often 6–12 months"] },
        { _key: k(), _type: "comparisonRow", cells: ["Lead tracking, not just rankings", "✓", "Sometimes"] },
        { _key: k(), _type: "comparisonRow", cells: ["Local Geelong team", "✓", "Varies"] },
      ], note: "Comparison is general and based on common agency practices, not a specific competitor." }));
    }
    if (spec.id === "service-web-design-geelong") {
      sections.splice(4, 0, sec("projectsSection", { eyebrow: "Our work", heading: "Recent websites", headingLevel: "h2", mode: "latest", limit: 3, link: L.path("/projects", "See all projects", "secondary") }));
    }
    add({
      _id: spec.id, _type: "service", title: spec.title, shortTitle: spec.short, slug: slug(spec.slugValue), icon: spec.icon, summary: spec.summary, order: spec.order, serviceType: spec.serviceType,
      priceFrom: spec.priceFrom, priceTo: spec.priceTo, priceUnit: spec.priceUnit, turnaround: spec.turnaround, deliverables: spec.deliverables,
      areaServed: ["Geelong", "Surf Coast", "Bellarine Peninsula", "Armstrong Creek", "Torquay", "Ocean Grove", "Lara", "Ballarat", "Melbourne"],
      faqs: spec.faqs.map(([q, a]) => qa(q, a)),
      relatedServices: services.filter((other) => other.id !== spec.id).slice(0, 3).map((other) => ref(other.id)),
      sections,
      seo: seo({ focusKeyword: spec.focus, secondaryKeywords: spec.secondary, searchIntent: spec.title.includes("Geelong") ? "local" : "commercial", metaTitle: spec.metaTitle, metaDescription: spec.metaDescription, keyFacts: spec.facts, about: spec.about, audience: "Small and medium businesses in Geelong and across Australia" }),
      publishedAt: now, updatedAt: now,
    });
  }

  // Case studies — real client sites. [CHECK] add real results and get permission before publishing.
  const cases = [
    ["case-day-to-day-deals", "Day To Day Deals website", "day-to-day-deals", "Day To Day Deals", "Retail", "https://daytodaydeals.com.au", images.daytoday, ["React", "Tailwind CSS"]],
    ["case-varni-diamonds", "Varni Diamonds e-commerce website", "varni-diamonds", "Varni Diamonds", "Jewellery / e-commerce", "https://www.varnidiamonds.com.au", images.varni, ["Next.js", "Node.js", "Stripe"]],
    ["case-scrub-n-clean", "Scrub N Clean website", "scrub-n-clean", "Scrub N Clean", "Cleaning services", "https://www.scrubnclean.com.au", images.scrub, ["React", "SEO"]],
    ["case-msm-logistics", "MSM Logistics website", "msm-logistics", "MSM Logistics", "Logistics & transport", "https://www.msmtranslink.com", images.msm, ["React"]],
  ] as const;
  cases.forEach(([id, title, slugValue, client, industry, url, image, tech], index) => add({
    _id: id, _type: "caseStudy", title, slug: slug(slugValue), client, industry, clientLocation: "Australia", websiteUrl: url, year: 2026, order: index, featured: index < 3, tech: [...tech],
    services: [ref("service-web-design-geelong")],
    mainImage: img(image, `${client} website homepage designed by Drivwon`),
    summary: `A fast, mobile-friendly website for ${client}, built in-house by Drivwon. [CHECK] Replace with one sentence on the goal and the result.`,
    challenge: pt(`[CHECK] Describe what ${client} needed and what was not working before. Keep it short and factual.`),
    solution: pt(`[CHECK] Describe what Drivwon designed and built, and why. Mention speed, SEO setup and lead tracking if true.`),
    results: [], // [CHECK] add real, measured numbers only (e.g. "+40% enquiries in 3 months")
    seo: seo({ metaTitle: `${client} | Web Design Case Study | Drivwon`, metaDescription: `How Drivwon designed and built the ${client} website — fast, mobile-friendly and SEO-ready.` }),
    publishedAt: now,
  }));

  // Locations (unique content needed per area — see README). [CHECK] add real local clients/proof.
  const locations = [
    { id: "location-surf-coast", name: "Torquay & the Surf Coast", short: "Surf Coast", slugValue: "web-design-seo-torquay-surf-coast", region: "Surf Coast Shire, VIC", postcode: "3228", wiki: "https://en.wikipedia.org/wiki/Torquay,_Victoria",
      intro: "Surf Coast businesses live and die by the summer season and tourist searches. We help Torquay, Jan Juc, Anglesea and Lorne businesses get found by locals and visitors — on Google, Maps and AI search.",
      points: ["Seasonal SEO plans for tourism and hospitality", "Google Business Profile for visitor searches like “cafe near me”", "Fast mobile sites for people on the go", "Booking and enquiry tracking"] },
    { id: "location-bellarine", name: "the Bellarine Peninsula", short: "Bellarine", slugValue: "web-design-seo-bellarine-peninsula", region: "City of Greater Geelong, VIC", postcode: "3222", wiki: "https://en.wikipedia.org/wiki/Bellarine_Peninsula",
      intro: "From Drysdale and Ocean Grove to Portarlington and Queenscliff, Bellarine businesses compete for both local and Melbourne day-trip customers. We build websites and local SEO that win both.",
      points: ["Local SEO for each Bellarine town you serve", "Websites for wineries, trades and coastal tourism", "Google reviews system", "Clear tracking of calls and bookings"] },
    { id: "location-armstrong-creek", name: "Armstrong Creek & Geelong South", short: "Armstrong Creek", slugValue: "web-design-seo-armstrong-creek", region: "City of Greater Geelong, VIC", postcode: "3217", wiki: "https://en.wikipedia.org/wiki/Armstrong_Creek,_Victoria",
      intro: "Armstrong Creek, Charlemont, Mount Duneed and Waurn Ponds are some of the fastest-growing areas around Geelong. New residents search online for everything — we help local businesses be the first result they find.",
      points: ["Launch-ready websites for new local businesses", "Google Business Profile setup and verification help", "Local SEO for growing suburbs", "Lead tracking from day one"] },
  ];
  for (const place of locations) add({
    _id: place.id, _type: "location", title: `Web Design & SEO in ${place.name.replace(/^the /, "the ")}`, name: place.short, slug: slug(place.slugValue), region: place.region, postcode: place.postcode, wikipediaUrl: place.wiki,
    summary: place.intro,
    services: [ref("service-seo-geelong"), ref("service-web-design-geelong"), ref("service-ai-search-optimisation")],
    nearby: locations.filter((other) => other.id !== place.id).map((other) => ref(other.id)),
    faqs: [qa(`Do you meet clients in ${place.short}?`, `Yes. We are based in Geelong and can meet in ${place.short} or by video call — whatever suits you.`), qa(`Do you only work with ${place.short} businesses?`, "No. We work across Geelong, the Surf Coast, the Bellarine and Australia-wide.")],
    sections: [
      sec("heroSection", { layout: "centered", eyebrow: place.region, heading: `Web design & SEO for ${place.name}`, subheading: place.intro, buttons: [L.path("/quotation", "Get a free quote", "primary", "cta_location_quote"), L.phone(`Call ${PHONE}`)], trustItems: ["Geelong-based team", "No lock-in contracts"] }),
      sec("splitSection", { heading: `How we help ${place.short} businesses`, headingLevel: "h2", body: pt(`[CHECK] Write 2–3 short paragraphs that are only true for ${place.short}: the kinds of businesses there, what customers search for, and any local projects you have done. Unique local detail is what makes this page useful — and keeps it from being a thin “doorway page”.`), bullets: place.points }),
      sec("servicesSection", { heading: "Services", headingLevel: "h2", mode: "manual", services: [ref("service-seo-geelong"), ref("service-web-design-geelong"), ref("service-ai-search-optimisation")] }),
      sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
    ],
    seo: seo({ focusKeyword: `web design ${place.short.toLowerCase()}`, secondaryKeywords: [`seo ${place.short.toLowerCase()}`], searchIntent: "local", metaTitle: `Web Design & SEO ${place.short} | Drivwon`, metaDescription: `Websites, local SEO and AI search for ${place.name} businesses. Geelong-based team, clear prices, no lock-in contracts.`, about: [entity(place.short, "Place", [place.wiki])] }),
    publishedAt: now,
  });

  // FAQs (chatbot + reusable)
  const faqs: Array<[string, string, string, string[]]> = [
    ["How much does a website cost?", "Our small business websites usually cost $1,800 to $2,350 (AUD). Online stores and custom features cost more. We give a fixed quote after a short call.", "Pricing", ["price", "cost", "website", "quote"]],
    ["How much does SEO cost?", "Our SEO plans cost $650 to $1,299 per month (AUD), month to month with no lock-in contract.", "Pricing", ["seo", "price", "cost", "monthly"]],
    ["Where are you based?", "We are based in Geelong, Victoria, and work with businesses across Geelong, the Surf Coast, the Bellarine and Australia.", "General", ["location", "where", "geelong", "address"]],
    ["How long does a website take?", "Most small business websites take 3 to 6 weeks from the first call to launch.", "Web development", ["time", "long", "weeks", "launch"]],
    ["Do you have lock-in contracts?", "No. Our monthly plans are month to month.", "Pricing", ["contract", "lock", "cancel"]],
    ["Can I edit my website myself?", "Yes. We build on a CMS so you can update text, images, blog posts and pages without code.", "Web development", ["edit", "update", "cms", "change"]],
    ["Do you help with Google Business Profile?", "Yes. Setting up and growing your Google Business Profile is part of our local SEO plans.", "SEO", ["google business", "maps", "gmb", "gbp", "reviews"]],
    ["Can you get my business into ChatGPT answers?", "We cannot control AI answers, but our AI search optimisation (GEO) improves the signals ChatGPT, Google AI Overviews and Perplexity use to find and recommend businesses.", "AI & automation", ["chatgpt", "ai", "geo", "perplexity"]],
    ["How do I get a quote?", "Use the quote form on our website, email info@drivwon.com or call us. We reply within one business day.", "General", ["quote", "contact", "start", "price"]],
  ];
  faqs.forEach(([question, answer, topic, keywords], index) => add({ _id: `faq-${index + 1}`, _type: "faq", question, answer, topic, keywords, order: index, active: true }));

  // Pages
  const page = (id: string, title: string, slugValue: string, sections: any[], seoFields: Record<string, any>, extra: Record<string, any> = {}) => add({ _id: id, _type: "page", title, slug: slug(slugValue), sections, seo: seo(seoFields), showBreadcrumbs: true, publishedAt: now, updatedAt: now, ...extra });

  page("page-home", "Home", "home", [
    sec("heroSection", { layout: "fullscreen", eyebrow: "Geelong, Victoria", heading: "Web design, SEO & AI automation in Geelong", highlight: "SEO & AI automation", subheading: "We build fast websites, get you found on Google and AI search, and automate the busywork — all in-house, by a local Geelong team.", buttons: [L.path("/quotation", "Start a project", "primary", "cta_hero_quote"), L.to("service-seo-geelong", "Explore SEO", "secondary")], trustItems: ["Local Geelong team", "100% in-house builds", "No lock-in contracts"] }),
    sec("quickAnswerSection", { label: "About Drivwon", question: "Who is Drivwon?", answer: "Drivwon is a digital studio in Geelong, Victoria. We design and build websites, run SEO and AI search optimisation, and create apps and AI automation for small and medium businesses. Websites start from $1,800 and SEO plans from $650 a month, with no lock-in contracts.", points: ["Websites from $1,800 (AUD)", "SEO from $650/month (AUD)", "Founded in Geelong in 2026"] }),
    sec("servicesSection", { eyebrow: "What we do", heading: "Services for growing businesses", headingLevel: "h2", intro: "Everything you need to get found, win customers and save time — under one roof.", mode: "all", columns: 3, link: L.path("/services", "View all services", "secondary") }),
    sec("featureGridSection", { eyebrow: "Why Drivwon", heading: "Not just another SEO company", headingLevel: "h2", intro: "We are developers and AI engineers first. That means we fix things properly and build systems that keep working.", columns: 3, style: "card", items: [feature("Code2", "Built in-house", "Design, code, SEO and automation done by our own team. Nothing hidden, nothing outsourced."), feature("Sparkles", "Ready for AI search", "Your site is built so ChatGPT, Google AI Overviews and Perplexity can understand and recommend you."), feature("LineChart", "Leads you can see", "Every call and form is tracked, so you know exactly which work brings in customers."), feature("Gauge", "Fast websites", "Modern code that loads quickly on mobile — better for customers and for Google."), feature("ShieldCheck", "Honest advice", "Clear prices, no lock-in contracts and no promises we cannot keep."), feature("MapPin", "Local to Geelong", "We know the Geelong, Surf Coast and Bellarine market — and you can meet us in person.")] }),
    sec("projectsSection", { eyebrow: "Our work", heading: "Recent projects", headingLevel: "h2", mode: "featured", limit: 3, link: L.path("/projects", "See all projects", "secondary") }),
    sec("processSection", { eyebrow: "How we work", heading: "From first call to more customers", headingLevel: "h2", steps: [step("Discovery", "A free call to understand your business, goals and budget."), step("Plan & price", "A clear written plan with a fixed price and timeline."), step("Build & optimise", "We design, build and optimise — with updates along the way."), step("Launch & grow", "We launch, track results and keep improving.")] }),
    sec("locationsSection", { eyebrow: "Areas we serve", heading: "Proudly local to Geelong", intro: "We work with businesses across the Geelong region and Australia-wide.", extraAreas: ["Geelong CBD", "Geelong West", "Belmont", "Highton", "Waurn Ponds", "Lara", "Ocean Grove", "Ballarat", "Melbourne"] }),
    sec("faqSection", { heading: "Frequently asked questions", headingLevel: "h2", schema: true, faqs: [ref("faq-1"), ref("faq-2"), ref("faq-3"), ref("faq-5"), ref("faq-8")] }),
    sec("postsSection", { eyebrow: "Blog", heading: "Guides for Geelong businesses", mode: "latest", limit: 3 }),
    sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
  ], { focusKeyword: "web design geelong", secondaryKeywords: ["seo geelong", "digital agency geelong", "ai automation geelong"], searchIntent: "local", metaTitle: "Drivwon | Web Design, SEO & AI Automation in Geelong", metaDescription: "Geelong web design, SEO and AI automation studio. Fast websites from $1,800, SEO from $650/month, built in-house. No lock-in contracts. Get a free quote.", quickAnswer: "Drivwon is a Geelong, Victoria digital studio that builds websites, runs SEO and AI search optimisation, and creates apps and AI automation for small and medium businesses.", keyFacts: ["Based in Geelong, VIC", "Websites from $1,800 (AUD)", "SEO from $650/month (AUD)", "No lock-in contracts"], about: [GEELONG, SEO_ENTITY, WEBDEV_ENTITY], audience: "Small and medium businesses in Geelong and Australia", schemaType: "WebPage" });

  page("page-about", "About Drivwon", "about", [
    sec("heroSection", { layout: "minimal", eyebrow: "About us", heading: "A Geelong studio built by engineers", subheading: "Drivwon started in Geelong in August 2026 with one goal: give local businesses the kind of websites, SEO and AI tools that big companies have — at a fair price, with honest advice." }),
    sec("splitSection", { heading: "Our story", headingLevel: "h2", body: pt(`Drivwon was founded by Sahil Raval, a full-stack developer and AI engineer with a Master of Applied Artificial Intelligence from Deakin University.\n\nAfter years building websites and software for businesses in real estate, trade, energy and engineering, he saw the same problem again and again: small businesses were paying for websites that were slow, hard to edit and invisible on Google.\n\nDrivwon fixes that. We build everything in-house, explain things in plain English and track results you can see.`), image: img(images.sahil, "Sahil Raval, founder of Drivwon, in Geelong"), imagePosition: "right" }),
    sec("featureGridSection", { eyebrow: "What we believe", heading: "How we work", headingLevel: "h2", columns: 2, style: "plain", items: [feature("Lightbulb", "Practical AI", "We use AI where it saves real time or wins real customers — not as a buzzword."), feature("Users", "Partners, not vendors", "We stay with you after launch and care about your results."), feature("ShieldCheck", "Honest and clear", "Fixed quotes, no lock-ins and no promises we cannot keep."), feature("Code2", "Quality code", "Fast, secure, well-built systems that keep working.")] }),
    sec("teamSection", { eyebrow: "Team", heading: "The people behind Drivwon", people: [ref("author-sahil-raval")] }),
    sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
  ], { focusKeyword: "drivwon", searchIntent: "navigational", metaTitle: "About Drivwon | Geelong Web Design, SEO & AI Studio", metaDescription: "Meet Drivwon, a Geelong studio founded in 2026 by AI engineer Sahil Raval. Websites, SEO and AI automation built in-house with honest advice.", schemaType: "AboutPage", about: [GEELONG] });

  page("page-services", "Services", "services", [
    sec("heroSection", { layout: "minimal", eyebrow: "Services", heading: "Web design, SEO, apps and AI — under one roof", subheading: "Pick one service or combine them. Everything is planned, built and supported by our in-house team in Geelong." }),
    sec("servicesSection", { heading: "All services", headingLevel: "h2", mode: "all", columns: 3 }),
    sec("processSection", { eyebrow: "Process", heading: "How every project runs", headingLevel: "h2", steps: [step("Discovery & strategy", "We learn your business, users and goals.", ["Free first call", "Audit of what you have now", "Clear scope and goals"]), step("Design & plan", "Design and technical plan before any build work.", ["Wireframes and design", "Fixed price and timeline"]), step("Build & integrate", "We build in-house and connect your tools.", ["Regular updates", "Testing"]), step("Launch & grow", "We launch and keep improving.", ["Tracking set up", "SEO and support"])] }),
    sec("faqSection", { heading: "Questions about our services", headingLevel: "h2", faqs: [ref("faq-1"), ref("faq-2"), ref("faq-4"), ref("faq-6")] }),
    sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
  ], { focusKeyword: "digital agency geelong", secondaryKeywords: ["web design and seo geelong"], searchIntent: "commercial", metaTitle: "Services | Web Design, SEO, Apps & AI | Drivwon Geelong", metaDescription: "Web design, SEO, AI search optimisation, e-commerce, apps, custom software and AI automation for Geelong and Australian businesses.", schemaType: "CollectionPage" });

  page("page-projects", "Projects", "projects", [
    sec("heroSection", { layout: "minimal", eyebrow: "Our work", heading: "Projects & case studies", subheading: "Websites and digital products we have designed and built for Australian businesses." }),
    sec("projectsSection", { heading: "Selected work", headingLevel: "h2", mode: "latest", limit: 12 }),
    sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
  ], { metaTitle: "Projects & Case Studies | Drivwon Geelong", metaDescription: "See websites and digital products designed and built by Drivwon for Australian businesses in retail, e-commerce, cleaning and logistics.", schemaType: "CollectionPage" });

  page("page-contact", "Contact", "contact", [
    sec("heroSection", { layout: "minimal", eyebrow: "Contact", heading: "Talk to the Drivwon team", subheading: "Have a project in mind? Send us a message or call. We reply within one business day." }),
    sec("formSection", { heading: "Send us a message", headingLevel: "h2", form: refOne("form-contact"), layout: "split", showContactDetails: true, sideText: pt("Prefer to talk? Call us or email info@drivwon.com. We are based in Geelong and happy to meet in person.") }, { anchorId: "form" }),
    sec("faqSection", { heading: "Before you get in touch", headingLevel: "h2", faqs: [ref("faq-3"), ref("faq-9"), ref("faq-5")] }),
  ], { focusKeyword: "contact drivwon", searchIntent: "navigational", metaTitle: "Contact Drivwon | Web Design & SEO in Geelong", metaDescription: `Contact Drivwon in Geelong about your website, SEO or AI project. Call ${PHONE} or email info@drivwon.com. We reply within one business day.`, schemaType: "ContactPage" });

  page("page-quotation", "Request a quote", "quotation", [
    sec("heroSection", { layout: "minimal", eyebrow: "Free quote", heading: "Get a clear, fixed quote", subheading: "Tell us about your project and budget. We will send honest advice and a fixed price — usually within two business days." }),
    sec("formSection", { heading: "Your project", headingLevel: "h2", form: refOne("form-quote"), layout: "single" }, { anchorId: "form" }),
  ], { focusKeyword: "website quote geelong", searchIntent: "transactional", metaTitle: "Get a Quote | Websites & SEO | Drivwon Geelong", metaDescription: "Request a free, fixed quote for a website, SEO plan, app or AI automation from Drivwon in Geelong. No obligation, no lock-in contracts.", schemaType: "ContactPage" });

  page("page-blog", "Blog", "blog", [
    sec("heroSection", { layout: "minimal", eyebrow: "Drivwon blog", heading: "SEO, web design and AI guides for Geelong businesses", subheading: "Plain-English advice on getting found on Google and AI search, building websites that convert and saving time with automation." }),
  ], { metaTitle: "Blog | SEO, Web Design & AI Guides | Drivwon", metaDescription: "Practical guides on SEO, web design, AI search and automation for small businesses — written by the Drivwon team in Geelong.", schemaType: "CollectionPage" });

  page("page-locations", "Areas we serve", "locations", [
    sec("heroSection", { layout: "minimal", eyebrow: "Areas we serve", heading: "Web design & SEO across the Geelong region", subheading: "We are based in Geelong and work with businesses across the Surf Coast, the Bellarine and Australia." }),
    sec("locationsSection", { heading: "Local areas", extraAreas: ["Geelong", "Geelong West", "Belmont", "Highton", "Lara", "Ballarat", "Melbourne"] }),
    sec("reusableSectionRef", { section: refOne("reusable-main-cta") }),
  ], { metaTitle: "Areas We Serve | Geelong, Surf Coast & Bellarine | Drivwon", metaDescription: "Drivwon provides web design, SEO and AI search optimisation across Geelong, Torquay, the Surf Coast, the Bellarine Peninsula and Armstrong Creek.", schemaType: "CollectionPage" });

  const privacy = `Last updated: ${now.slice(0, 10)}\n\nAt Drivwon, we respect your privacy. This policy explains what information we collect, how we use it and your choices. It follows the Australian Privacy Principles in the Privacy Act 1988 (Cth).\n\n## Information we collect\n\n### Information you give us\n\nWhen you contact us, ask for a quote or use our services, we collect the details you send — such as your name, email, phone number, business name, website and project details.\n\n### Technical and marketing information\n\nWhen you visit our website we collect information such as your browser, device, pages visited and how you found us (for example a Google search, an ad or a link). We store the first and last campaign that brought you to our site with any enquiry you send, so we know which marketing works.\n\n### Cookies and analytics\n\nWe use cookies and similar tools, such as Google Analytics, to understand how people use our website and to measure our advertising. You can block cookies in your browser settings.\n\n## How we use your information\n\n- To reply to your enquiry and provide our services\n- To send quotes, invoices and project updates\n- To improve our website and marketing\n- To send occasional marketing emails, only if you agree (you can unsubscribe any time)\n- To meet our legal obligations\n\n## Who we share it with\n\nWe do not sell your information. We use trusted service providers to run our business, such as website hosting, our content and lead management system (Sanity), email and analytics providers (Google). Some of these providers store data outside Australia, including in the United States. We only use providers that protect personal information.\n\n## Keeping your information safe\n\nWe take reasonable steps to protect your information, including secure connections (HTTPS) and limited access. No system is 100% secure, so we cannot guarantee absolute security.\n\n## Your rights\n\nYou can ask to see, correct or delete the personal information we hold about you. Email info@drivwon.com and we will respond within 30 days.\n\n## Complaints\n\nIf you have a privacy concern, email us first. If you are not happy with our response, you can contact the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.\n\n## Contact\n\nDrivwon, Geelong, Victoria, Australia. Email: info@drivwon.com.\n\n## Changes to this policy\n\nWe may update this policy from time to time. The latest version is always on this page.`;
  page("page-privacy-policy", "Privacy Policy", "privacy-policy", [
    sec("heroSection", { layout: "minimal", eyebrow: "Legal", heading: "Privacy Policy" }),
    sec("richTextSection", { body: pt(privacy) }, { width: "narrow" }),
  ], { metaTitle: "Privacy Policy | Drivwon", metaDescription: "How Drivwon collects, uses and protects your personal information under the Australian Privacy Principles.", includeInLlms: false, sitemapPriority: 0.3 });

  page("page-thank-you", "Thank you", "thank-you", [
    sec("heroSection", { layout: "minimal", eyebrow: "Message received", heading: "Thanks — we will be in touch soon", subheading: "We reply within one business day. While you wait, have a look at our latest guides.", buttons: [L.path("/blog", "Read the blog", "secondary"), L.path("/", "Back to home", "secondary")] }),
    sec("postsSection", { heading: "Latest guides", mode: "latest", limit: 3 }),
  ], { metaTitle: "Thank you | Drivwon", metaDescription: "Thanks for contacting Drivwon.", noIndex: true, excludeFromSitemap: true, includeInLlms: false });

  // Landing page for ads
  add({
    _id: "lp-free-seo-audit", _type: "landingPage", title: "Free SEO audit — Geelong (Google Ads)", slug: slug("free-seo-audit-geelong"), campaign: "google-ads-free-seo-audit-geelong", channel: "Google Ads", conversionGoal: "Lead form", variant: "A", hideNavigation: true, hideFooter: true,
    stickyCta: L.path("#form", "Get my free audit"),
    sections: [
      sec("heroSection", { layout: "split", eyebrow: "Free for Geelong businesses", heading: "Get a free SEO audit of your website", highlight: "free SEO audit", subheading: "We will check your website, Google Business Profile and AI search visibility, then send you a short video with the 5 biggest fixes. Free, no obligation.", buttons: [L.path("#form", "Get my free audit", "primary", "lp_hero_cta"), L.phone(`Call ${PHONE}`)], trustItems: ["Video audit in 2 business days", "Done by a Geelong team", "No sales pressure"], image: img(images.sahil, "Sahil from Drivwon recording an SEO audit") }),
      sec("featureGridSection", { heading: "What we check", headingLevel: "h2", columns: 3, items: [feature("Gauge", "Speed & mobile", "How fast your site loads on a phone and what slows it down."), feature("MapPin", "Google Maps", "Your Google Business Profile, reviews and Map Pack visibility."), feature("Search", "Rankings", "Which searches you show up for — and which you are missing."), feature("Bot", "AI search", "Whether ChatGPT and Google AI can find and describe your business."), feature("Target", "Leads", "Whether your site makes it easy to call or enquire."), feature("ShieldCheck", "Technical health", "Indexing, broken links, schema and security issues.")] }),
      sec("formSection", { heading: "Get your free audit", headingLevel: "h2", form: refOne("form-audit"), layout: "split", showContactDetails: false, sideText: pt("Takes 30 seconds. We send your video audit within two business days.\n\n- No obligation\n- No lock-in contracts if you work with us\n- Honest advice, even if it is “you are doing fine”") }, { anchorId: "form" }),
      sec("faqSection", { heading: "Questions", headingLevel: "h2", items: [qa("Is it really free?", "Yes. It is how we meet new clients. There is no obligation."), qa("What do I need to send?", "Just your website and email. We do the rest."), qa("How long does it take?", "You will get your video audit within two business days.")] }),
    ],
    seo: seo({ noIndex: true, excludeFromSitemap: true, includeInLlms: false, metaTitle: "Free SEO Audit for Geelong Businesses | Drivwon", metaDescription: "Get a free video SEO audit of your website, Google Business Profile and AI search visibility from Drivwon in Geelong." }),
    publishedAt: now,
  });

  // Blog posts (drafts to review)
  const post = (id: string, title: string, slugValue: string, excerpt: string, body: string, fields: Record<string, any>) => add({ _id: id, _type: "post", title, slug: slug(slugValue), excerpt, body: pt(body), author: refOne("author-sahil-raval"), publishedAt: now, updatedAt: now, showToc: true, articleType: "BlogPosting", coverImage: img(images.logo, title), ...fields }); // [CHECK] replace the logo with a real 1200×630 cover image
  post("post-website-cost-geelong", "How Much Does a Website Cost in Geelong? (2026 Guide)", "website-cost-geelong", "A plain-English guide to website prices in Geelong in 2026 — what you get at each price, what drives the cost and how to avoid paying twice.",
    `If you run a business in Geelong, one of the first questions you will ask is: how much should a website cost? The honest answer is that it depends on what the website needs to do. This guide explains the price ranges, what you get and the hidden costs to watch for.\n\n## Quick answer\n\nMost small business websites in Geelong cost between $1,500 and $5,000. At Drivwon, a small business website usually costs $1,800 to $2,350 (AUD). Online stores and custom features cost more.\n\n## What affects the price\n\n- Number of pages and how much content needs writing\n- Custom design or a template\n- Features like booking, online payments or member logins\n- SEO setup, analytics and lead tracking\n- Who writes the copy and supplies the photos\n\n## What you should get for your money\n\nEvery business website should be fast on mobile, easy for you to edit, set up for Google (titles, descriptions, schema markup, sitemap) and connected to analytics so you can see enquiries. If a quote does not include these, ask why.\n\n## Hidden costs to watch for\n\n- Hosting and domain renewals\n- Paid plugins or themes that need yearly licences\n- Charges for small text changes\n- Moving to a new developer later because you do not own the site\n\n## Cheap websites can cost more\n\nA very cheap website is often slow, hard to rank and impossible to edit. Many businesses end up paying twice: once for the cheap site, then again for a proper one. Spending a little more on a solid base usually saves money.\n\n## How to get an accurate quote\n\nWrite down what you want the website to do (get calls, take bookings, sell products), list the pages you need and share any websites you like. A good developer will give you a fixed price and a clear list of what is included.`,
    { categories: [ref("cat-web-design")], relatedServices: [ref("service-web-design-geelong")], faqs: [qa("Is $2,000 enough for a business website?", "For a small business with a few service pages, yes — if it includes mobile design, SEO setup and an easy CMS. Stores and custom features need more."), qa("Do I need to pay monthly for a website?", "You will pay for hosting and a domain each year. Ongoing care plans and SEO are optional extras.")],
      seo: seo({ focusKeyword: "website cost geelong", secondaryKeywords: ["how much does a website cost australia", "web design prices geelong"], searchIntent: "informational", metaTitle: "How Much Does a Website Cost in Geelong? (2026)", metaDescription: "Website prices in Geelong for 2026 explained simply: what you get at each price, what drives the cost and the hidden fees to avoid. From a local developer.", quickAnswer: "Most small business websites in Geelong cost $1,500 to $5,000. Drivwon’s small business websites cost $1,800 to $2,350 (AUD) and include mobile design, SEO setup, analytics and an easy CMS. Online stores and custom features cost more.", keyFacts: ["Typical small business website: $1,500–$5,000", "Drivwon websites: $1,800–$2,350 (AUD)", "Expect 3–6 weeks to launch"], about: [WEBDEV_ENTITY, GEELONG] }) });
  post("post-what-is-geo", "What Is GEO? How to Get Your Business Mentioned by ChatGPT and Google AI", "what-is-generative-engine-optimisation", "Generative engine optimisation (GEO) explained in plain English, with simple steps any small business can take to show up in AI answers.",
    `More customers now ask ChatGPT, Google AI Overviews or Perplexity for recommendations instead of scrolling through search results. Generative engine optimisation (GEO) is how you make sure your business is part of those answers.\n\n## What GEO means\n\nGEO is the work of making your business easy for AI assistants to find, understand, trust and recommend. It builds on SEO, because AI tools still read search indexes and trusted websites. But it puts extra focus on clear facts, structured data and consistent information.\n\n## How AI assistants choose businesses\n\nAI assistants pull information from web pages, business listings, reviews and trusted sites. They prefer sources that state clear facts, answer questions directly and agree with each other.\n\n## Simple GEO steps for small businesses\n\n1. Make your name, address and phone the same everywhere online.\n2. Put a short, factual description of your business at the top of key pages.\n3. Answer real customer questions directly, in the first sentence.\n4. State facts AI can quote: prices from, areas served, timeframes.\n5. Add schema markup so machines understand your business.\n6. Let AI crawlers read your site — do not block GPTBot, ClaudeBot or PerplexityBot by accident.\n7. Get mentioned on trusted local sites, directories and news.\n\n## How to measure it\n\nAsk AI assistants the same set of customer questions every month and record if you are mentioned. In Google Analytics 4, track visits that come from chatgpt.com, perplexity.ai and other AI tools.\n\n## The honest truth\n\nNobody can guarantee an AI will recommend you. But businesses with clear, consistent, well-structured information are much easier for AI to trust — and that same work helps your normal Google rankings too.`,
    { categories: [ref("cat-ai-search")], relatedServices: [ref("service-ai-search-optimisation"), ref("service-seo-geelong")], faqs: [qa("Is GEO replacing SEO?", "No. GEO builds on SEO. Good SEO is still the base that AI engines rely on."), qa("How long does GEO take?", "Fixing facts and structure can help within weeks as AI tools re-read your site. Building mentions on other sites takes months.")],
      seo: seo({ focusKeyword: "what is geo", secondaryKeywords: ["generative engine optimisation", "how to rank in chatgpt", "ai search optimisation"], searchIntent: "informational", metaTitle: "What Is GEO? Get Mentioned by ChatGPT & Google AI", metaDescription: "Generative engine optimisation (GEO) explained simply, with 7 practical steps to help your business show up in ChatGPT, Google AI Overviews and Perplexity.", quickAnswer: "GEO (generative engine optimisation) is the work of making your business easy for AI assistants like ChatGPT, Google AI Overviews and Perplexity to find, understand and recommend. It builds on SEO with clear facts, direct answers, structured data and consistent business details.", keyFacts: ["GEO builds on SEO, it does not replace it", "AI engines prefer clear, consistent, quotable facts", "AI referrals can be tracked in GA4"], about: [GEO_ENTITY], sources: [{ _key: k(), _type: "citation", title: "Google Search Central — AI features and your website", url: "https://developers.google.com/search/docs/appearance/ai-features" }, { _key: k(), _type: "citation", title: "OpenAI — Overview of OpenAI crawlers", url: "https://platform.openai.com/docs/bots" }] }) });
  post("post-local-seo-checklist", "Local SEO Checklist for Geelong Businesses", "local-seo-checklist-geelong", "A simple checklist to help Geelong businesses show up in Google Maps and local search results — most items you can do yourself this week.",
    `Local SEO is how you show up when people nearby search for what you sell — like “electrician Geelong” or “cafe near me”. Here is a simple checklist you can work through.\n\n## Google Business Profile\n\n- Claim and verify your profile\n- Pick the most accurate main category\n- Add your services, hours, photos and a clear description\n- Post an update at least once a month\n- Reply to every review\n\n## Your website\n\n- Put your business name, suburb and phone number on every page (usually the footer)\n- Create one page for each main service\n- Mention the areas you serve naturally on your pages\n- Make your site fast on mobile\n- Add LocalBusiness schema markup\n\n## Reviews\n\nAsk happy customers for a Google review straight after the job, using a short link. More recent, genuine reviews help both rankings and trust.\n\n## Listings\n\nMake sure your name, address and phone match exactly on directories like Yellow Pages, True Local and Apple Maps. Differences confuse Google and AI assistants.\n\n## Track results\n\nWatch calls, direction requests and website clicks in your Google Business Profile, and enquiries in Google Analytics 4.`,
    { categories: [ref("cat-seo")], relatedServices: [ref("service-seo-geelong")], faqs: [qa("How long does local SEO take?", "Google Business Profile changes can help within weeks. Ranking higher in competitive searches usually takes 3 to 6 months.")],
      seo: seo({ focusKeyword: "local seo checklist", secondaryKeywords: ["local seo geelong", "google business profile tips"], searchIntent: "informational", metaTitle: "Local SEO Checklist for Geelong Businesses (2026)", metaDescription: "A simple local SEO checklist for Geelong businesses: Google Business Profile, reviews, listings and website fixes you can do this week.", quickAnswer: "To rank in local search in Geelong: verify and fill out your Google Business Profile, get regular genuine reviews, keep your name, address and phone the same everywhere, create a page for each service and make your site fast on mobile.", keyFacts: ["Google Business Profile is the biggest local factor", "Name, address and phone must match everywhere", "Reply to every review"], about: [SEO_ENTITY, GEELONG] }) });

  // Site settings
  add({
    _id: "siteSettings", _type: "siteSettings", siteName: "Drivwon", tagline: "Web design, SEO & AI automation in Geelong", siteUrl: "https://drivwon.com",
    logo: { ...img(images.logo, "Drivwon logo") }, logoSquare: img(images.logo, "Drivwon"),
    description: "Drivwon is a digital studio in Geelong, Victoria that builds websites, runs SEO and AI search optimisation, and creates apps and AI automation for small and medium businesses.",
    longDescription: "Drivwon is a Geelong, Victoria (Australia) digital studio founded in August 2026 by AI engineer and full-stack developer Sahil Raval. Services: web design and development (from $1,800 AUD), SEO (from $650 AUD per month), generative engine optimisation for AI search, e-commerce, mobile apps, custom software and AI automation. All work is done in-house. Clients are mainly small and medium businesses in Geelong, the Surf Coast, the Bellarine Peninsula and across Australia.",
    legalName: "Drivwon Pty Ltd", // [CHECK] exact registered company name
    businessType: "ProfessionalService", acn: "701 664 360", foundingDate: "2026-08-01", founders: [ref("author-sahil-raval")],
    email: "info@drivwon.com", phone: PHONE, phoneE164: PHONE_E164, showAddress: false,
    addressLocality: "Geelong", addressRegion: "VIC", postalCode: "3220", addressCountry: "AU",
    areaServed: ["Geelong", "Surf Coast", "Torquay", "Bellarine Peninsula", "Ocean Grove", "Armstrong Creek", "Lara", "Ballarat", "Melbourne", "Australia"],
    knowsAbout: ["Search engine optimisation", "Local SEO", "Generative engine optimisation", "Web design", "Web development", "E-commerce", "Mobile app development", "Artificial intelligence", "Business automation", "Sanity CMS", "React", "Next.js", "AWS"],
    priceRange: "$650–$2,350", currencies: "AUD", paymentAccepted: "Bank transfer, Credit card",
    navigation: [
      { _key: k(), _type: "navItem", link: L.path("/services", "Services"), children: [
        { _key: k(), _type: "navChild", link: L.to("service-seo-geelong", "SEO Geelong"), description: "Rank higher on Google & Maps" },
        { _key: k(), _type: "navChild", link: L.to("service-web-design-geelong", "Web Design Geelong"), description: "Fast websites that convert" },
        { _key: k(), _type: "navChild", link: L.to("service-ai-search-optimisation", "AI Search (GEO)"), description: "Get found in ChatGPT & Google AI" },
        { _key: k(), _type: "navChild", link: L.to("service-ecommerce", "E-commerce"), description: "Shopify, WooCommerce & custom" },
        { _key: k(), _type: "navChild", link: L.to("service-ai-automation", "AI Automation"), description: "Save hours every week" },
        { _key: k(), _type: "navChild", link: L.path("/services", "All services") },
      ] },
      { _key: k(), _type: "navItem", link: L.path("/projects", "Projects") },
      { _key: k(), _type: "navItem", link: L.path("/about", "About") },
      { _key: k(), _type: "navItem", link: L.path("/blog", "Blog") },
      { _key: k(), _type: "navItem", link: L.path("/contact", "Contact") },
    ],
    headerCta: L.path("/quotation", "Get a quote", "primary", "header_quote"),
    footerText: "Web design, SEO and AI automation built in-house in Geelong, Victoria.",
    footerColumns: [
      { _key: k(), _type: "footerColumn", title: "Services", links: [L.to("service-seo-geelong", "SEO Geelong"), L.to("service-web-design-geelong", "Web Design Geelong"), L.to("service-ai-search-optimisation", "AI Search Optimisation"), L.to("service-ecommerce", "E-commerce"), L.to("service-ai-automation", "AI Automation"), L.to("service-app-development", "App Development")] },
      { _key: k(), _type: "footerColumn", title: "Company", links: [L.path("/about", "About"), L.path("/projects", "Projects"), L.path("/blog", "Blog"), L.path("/locations", "Areas we serve"), L.path("/quotation", "Get a quote"), L.path("/contact", "Contact")] },
    ],
    footerCta: { heading: "Let’s grow your business", text: "Free first call. Honest advice. Clear prices.", link: L.path("/quotation", "Get a free quote") },
    legalLinks: [L.path("/privacy-policy", "Privacy Policy")],
    copyright: "© {year} Drivwon. All rights reserved.",
    titleTemplate: "%s | Drivwon", locale: "en_AU",
    defaultSeo: seo({ metaTitle: "Drivwon | Web Design, SEO & AI Automation in Geelong", metaDescription: "Geelong web design, SEO and AI automation studio. Fast websites from $1,800, SEO from $650/month, built in-house. No lock-in contracts." }),
    consentMode: "none", trackScrollDepth: true, trackOutbound: true,
    blockedAiBots: [],
    llmsIntro: "Drivwon is a web design, SEO, AI search (GEO) and AI automation studio based in Geelong, Victoria, Australia. It works with small and medium businesses in Geelong, the Surf Coast, the Bellarine Peninsula and Australia-wide. Use the links below for accurate service, pricing and contact details.",
    defaultLeadForm: refOne("form-contact"), thankYouPage: refOne("page-thank-you"),
    stickyCta: { enabled: true, callLabel: "Call", quoteLink: L.path("/quotation", "Get a quote", "primary", "sticky_quote") },
  });

  return docs;
}

// ── run ─────────────────────────────────────────────────────────────
async function main() {
  const images = await uploadImages();
  const docs = buildDocs(images);
  if (dryRun) {
    mkdirSync("dist", { recursive: true });
    writeFileSync("dist/seed.ndjson", docs.map((doc) => JSON.stringify(doc)).join("\n"));
    console.log(`Dry run: wrote ${docs.length} documents to dist/seed.ndjson`);
    return;
  }
  const tx = client.transaction();
  for (const doc of docs) {
    const target = publish ? doc : { ...doc, _id: `drafts.${doc._id}` };
    if (force) tx.createOrReplace(target);
    else tx.createIfNotExists(target);
  }
  await tx.commit({ visibility: "async" });
  console.log(`${publish ? "Published" : "Created drafts for"} ${docs.length} documents${force ? " (overwrote existing)" : " (existing documents were left unchanged)"}.`);
  console.log("Next: open the Studio, search for [CHECK] and fix those items before publishing.");
}

main().catch((error) => { console.error(error); process.exit(1); });
