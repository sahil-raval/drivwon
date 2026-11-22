/**
 * Plain semantic HTML of the CMS content, placed inside #root before React loads.
 * Google, Bing and AI crawlers (GPTBot, ClaudeBot, PerplexityBot — most do NOT run JavaScript)
 * read this. React replaces it on load. It is the same content users see, so it is not cloaking.
 */
import { hrefForLink, pathForDoc } from "../../shared/cms/routes.js";
import { hasImage, imageDimensions, imageUrl } from "../../shared/cms/image.js";

export function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function img(source: any, width = 1200) {
  if (!hasImage(source)) return "";
  const size = imageDimensions(source);
  const height = size ? Math.round((size.height / size.width) * width) : undefined;
  return `<img src="${esc(imageUrl(source, width))}" alt="${esc(source.decorative ? "" : source.alt ?? "")}" width="${width}"${height ? ` height="${height}"` : ""} loading="lazy" />`;
}

function a(link: any) {
  const href = hrefForLink(link);
  return href && link?.label ? `<a href="${esc(href)}">${esc(link.label)}</a>` : "";
}

function spans(block: any) {
  const defs = new Map((block.markDefs ?? []).map((def: any) => [def._key, def]));
  return (block.children ?? []).map((child: any) => {
    let text = esc(child.text ?? "");
    for (const mark of child.marks ?? []) {
      const def: any = defs.get(mark);
      if (def?._type === "link" && def.href) text = `<a href="${esc(def.href)}"${def.rel ? ` rel="${esc(def.rel)}"` : ""}>${text}</a>`;
      else if (def?._type === "internalLink" && def.ref) text = `<a href="${esc(pathForDoc(def.ref))}${def.anchor ? `#${esc(def.anchor)}` : ""}">${text}</a>`;
      else if (mark === "strong") text = `<strong>${text}</strong>`;
      else if (mark === "em") text = `<em>${text}</em>`;
    }
    return text;
  }).join("");
}

export function ptHtml(blocks: any): string {
  if (!Array.isArray(blocks)) return "";
  let html = "";
  let list: string | null = null;
  for (const block of blocks) {
    if (block?._type === "block" && block.listItem) {
      const tag = block.listItem === "number" ? "ol" : "ul";
      if (list !== tag) { if (list) html += `</${list}>`; html += `<${tag}>`; list = tag; }
      html += `<li>${spans(block)}</li>`;
      continue;
    }
    if (list) { html += `</${list}>`; list = null; }
    if (block?._type === "block") {
      const style = block.style ?? "normal";
      const tag = ["h2", "h3", "h4", "blockquote"].includes(style) ? style : "p";
      html += `<${tag}>${spans(block)}</${tag}>`;
    } else if (block?._type === "inlineImage") html += `<figure>${img(block)}${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    else if (block?._type === "callout") html += `<aside><strong>${esc(block.title)}</strong> ${esc(block.text)}</aside>`;
    else if (block?._type === "keyTakeaways") html += `<section><h3>${esc(block.title || "Key takeaways")}</h3><ul>${(block.items ?? []).map((item: string) => `<li>${esc(item)}</li>`).join("")}</ul></section>`;
    else if (block?._type === "inlineFaq") html += (block.items ?? []).map((qa: any) => `<h3>${esc(qa.question)}</h3><p>${esc(qa.answer)}</p>`).join("");
    else if (block?._type === "table") html += `<table>${block.caption ? `<caption>${esc(block.caption)}</caption>` : ""}${(block.rows ?? []).map((row: any, index: number) => `<tr>${(row.cells ?? []).map((cell: string) => index === 0 ? `<th>${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</table>`;
    else if (block?._type === "ctaBlock") html += `<p><strong>${esc(block.heading)}</strong> ${esc(block.text)} ${a(block.link)}</p>`;
    else if (block?._type === "video" && block.transcript) html += `<details><summary>Video transcript: ${esc(block.title)}</summary><p>${esc(block.transcript)}</p></details>`;
  }
  if (list) html += `</${list}>`;
  return html;
}

function heading(section: any, fallback = "h2") {
  const tag = section.headingLevel || fallback;
  return section.heading ? `<${tag}>${esc(section.heading)}</${tag}>` : "";
}

function card(title?: string, body?: string, href?: string) {
  const name = href ? `<a href="${esc(href)}">${esc(title)}</a>` : esc(title);
  return `<li><h3>${name}</h3>${body ? `<p>${esc(body)}</p>` : ""}</li>`;
}

function sectionHtml(section: any): string {
  if (!section || section.settings?.hidden) return "";
  const intro = section.intro ? `<p>${esc(section.intro)}</p>` : "";
  const eyebrow = section.eyebrow ? `<p>${esc(section.eyebrow)}</p>` : "";
  const id = section.settings?.anchorId ? ` id="${esc(section.settings.anchorId)}"` : "";
  let inner = "";
  switch (section._type) {
    case "reusableSectionRef": return (section.resolved ?? []).map(sectionHtml).join("");
    case "heroSection":
      inner = `${eyebrow}<h1>${esc(section.heading)}</h1>${section.subheading ? `<p>${esc(section.subheading)}</p>` : ""}${(section.buttons ?? []).map(a).join(" ")}${section.trustItems?.length ? `<ul>${section.trustItems.map((item: string) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}${img(section.image)}`;
      break;
    case "quickAnswerSection":
      inner = `<h2>${esc(section.question)}</h2><p class="quick-answer">${esc(section.answer)}</p>${section.points?.length ? `<ul>${section.points.map((point: string) => `<li>${esc(point)}</li>`).join("")}</ul>` : ""}`;
      break;
    case "richTextSection":
    case "splitSection":
      inner = `${eyebrow}${heading(section)}${ptHtml(section.body)}${section.bullets?.length ? `<ul>${section.bullets.map((item: string) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}${(section.buttons ?? []).map(a).join(" ")}${img(section.image)}`;
      break;
    case "mediaSection":
      inner = `${heading(section)}${intro}${img(section.image)}${(section.gallery ?? []).map((image: any) => img(image, 800)).join("")}${section.video?.transcript ? `<p>${esc(section.video.transcript)}</p>` : ""}${section.caption ? `<p>${esc(section.caption)}</p>` : ""}`;
      break;
    case "featureGridSection":
      inner = `${eyebrow}${heading(section)}${intro}<ul>${(section.items ?? []).map((item: any) => card(item.title, [item.body, ...(item.bullets ?? [])].filter(Boolean).join(" · "), hrefForLink(item.link))).join("")}</ul>${a(section.link)}`;
      break;
    case "statsSection":
      inner = `${heading(section)}${intro}<ul>${(section.items ?? []).map((item: any) => `<li><strong>${esc(item.value)}</strong> ${esc(item.label)} ${esc(item.detail)}</li>`).join("")}</ul>`;
      break;
    case "processSection":
      inner = `${eyebrow}${heading(section)}${intro}<ol>${(section.steps ?? []).map((step: any) => `<li><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p>${step.bullets?.length ? `<ul>${step.bullets.map((bullet: string) => `<li>${esc(bullet)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ol>`;
      break;
    case "servicesSection":
      inner = `${eyebrow}${heading(section)}${intro}<ul>${(section.serviceList ?? []).map((service: any) => card(service.title, service.summary, pathForDoc(service))).join("")}</ul>`;
      break;
    case "projectsSection":
      inner = `${eyebrow}${heading(section)}${intro}<ul>${(section.projectList ?? []).map((project: any) => card(project.title, project.summary, pathForDoc(project))).join("")}</ul>`;
      break;
    case "caseHighlightSection":
      inner = section.caseDoc ? `${heading(section)}<p><a href="${esc(pathForDoc(section.caseDoc))}">${esc(section.caseDoc.title)}</a> — ${esc(section.caseDoc.summary)}</p>` : "";
      break;
    case "testimonialsSection":
      inner = `${heading(section)}${(section.testimonialList ?? []).map((item: any) => `<blockquote><p>${esc(item.quote)}</p><footer>${esc(item.name)}${item.company ? `, ${esc(item.company)}` : ""}</footer></blockquote>`).join("")}`;
      break;
    case "pricingSection":
      inner = `${heading(section)}${intro}<ul>${(section.plans ?? []).map((plan: any) => `<li><h3>${esc(plan.name)} — ${esc(plan.price)} ${esc(plan.period)}</h3><p>${esc(plan.description)}</p><ul>${(plan.features ?? []).map((feature: string) => `<li>${esc(feature)}</li>`).join("")}</ul></li>`).join("")}</ul>${section.note ? `<p>${esc(section.note)}</p>` : ""}`;
      break;
    case "faqSection":
      inner = `${heading(section)}${intro}${[...(section.items ?? []), ...(section.faqList ?? [])].map((qa: any) => `<h3>${esc(qa.question)}</h3><p>${esc(qa.answer)}</p>`).join("")}`;
      break;
    case "comparisonSection":
      inner = `${heading(section)}${intro}<table><tr>${(section.columns ?? []).map((column: string) => `<th>${esc(column)}</th>`).join("")}</tr>${(section.rows ?? []).map((row: any) => `<tr>${(row.cells ?? []).map((cell: string) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</table>`;
      break;
    case "ctaSection":
      inner = `${eyebrow}<h2>${esc(section.heading)}</h2>${section.body ? `<p>${esc(section.body)}</p>` : ""}${(section.buttons ?? []).map(a).join(" ")}`;
      break;
    case "formSection":
      inner = `${heading(section)}${intro}${ptHtml(section.sideText)}<p>Use the form on this page, email or call us.</p>`;
      break;
    case "locationsSection":
      inner = `${heading(section)}${intro}<ul>${(section.locationList ?? []).map((location: any) => card(location.name || location.title, location.summary, pathForDoc(location))).join("")}${(section.extraAreas ?? []).map((area: string) => `<li>${esc(area)}</li>`).join("")}</ul>`;
      break;
    case "teamSection":
      inner = `${heading(section)}<ul>${(section.peopleList ?? []).map((person: any) => card(`${person.name}${person.role ? ` — ${person.role}` : ""}`, person.shortBio, person.slug ? `/authors/${person.slug}` : undefined)).join("")}</ul>`;
      break;
    case "postsSection":
      inner = `${heading(section)}<ul>${(section.postList ?? []).slice(0, section.limit ?? 3).map((post: any) => card(post.title, post.excerpt, pathForDoc(post))).join("")}</ul>`;
      break;
    case "quoteSection":
      inner = `<blockquote><p>${esc(section.quote)}</p><footer>${esc(section.name)} ${esc(section.role)}</footer></blockquote>`;
      break;
    default:
      inner = `${heading(section)}${intro}`;
  }
  return inner ? `<section${id}>${inner}</section>` : "";
}

function list(items: any[] | undefined) {
  return `<ul>${(items ?? []).map((item) => card(item.title, item.excerpt || item.summary, pathForDoc(item))).join("")}</ul>`;
}

export function renderCrawlerHtml(doc: any, settings: any, extra: { posts?: any[]; categories?: any[]; breadcrumbs?: Array<{ name: string; url: string }> } = {}) {
  const nav = (settings?.navigation ?? []).map((item: any) => a(item.link)).filter(Boolean).join(" · ");
  let main = "";
  if (!doc) {
    main = extra.posts ? `<h1>Blog</h1>${list(extra.posts)}` : "";
  } else if (doc._type === "post") {
    main = `<article><h1>${esc(doc.title)}</h1><p>${esc(doc.excerpt)}</p><p>${doc.author?.name ? `By <a href="/authors/${esc(doc.author.slug)}">${esc(doc.author.name)}</a>` : ""}${doc.publishedAt ? ` · <time datetime="${esc(doc.publishedAt)}">${esc(new Date(doc.publishedAt).toLocaleDateString("en-AU", { dateStyle: "long" }))}</time>` : ""}${doc.updatedAt ? ` · Updated <time datetime="${esc(doc.updatedAt)}">${esc(new Date(doc.updatedAt).toLocaleDateString("en-AU", { dateStyle: "long" }))}</time>` : ""}</p>${doc.seo?.quickAnswer ? `<p class="quick-answer">${esc(doc.seo.quickAnswer)}</p>` : ""}${img(doc.coverImage, 1200)}${ptHtml(doc.body)}${(doc.faqs ?? []).length ? `<h2>Frequently asked questions</h2>${doc.faqs.map((qa: any) => `<h3>${esc(qa.question)}</h3><p>${esc(qa.answer)}</p>`).join("")}` : ""}${(doc.seo?.sources ?? []).length ? `<h2>Sources</h2><ul>${doc.seo.sources.map((source: any) => `<li><a href="${esc(source.url)}">${esc(source.title || source.url)}</a></li>`).join("")}</ul>` : ""}${doc.relatedServices?.length ? `<h2>Related services</h2>${list(doc.relatedServices)}` : ""}${doc.relatedPosts?.length ? `<h2>Related articles</h2>${list(doc.relatedPosts)}` : ""}</article>`;
  } else if (doc._type === "category") {
    main = `<h1>${esc(doc.title)}</h1><p>${esc(doc.description)}</p>${list(doc.posts)}`;
  } else if (doc._type === "author") {
    main = `<h1>${esc(doc.name)}</h1><p>${esc(doc.role)}</p><p>${esc(doc.shortBio)}</p>${ptHtml(doc.bio)}${doc.credentials?.length ? `<h2>Qualifications</h2><ul>${doc.credentials.map((item: string) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}<h2>Articles by ${esc(doc.name)}</h2>${list(doc.posts)}`;
  } else {
    const sections = (doc.sections ?? []).map(sectionHtml).join("");
    const hasH1 = /<h1[\s>]/.test(sections);
    main = `${hasH1 ? "" : `<h1>${esc(doc.title)}</h1>`}${doc.seo?.quickAnswer && !sections.includes("quick-answer") ? `<p class="quick-answer">${esc(doc.seo.quickAnswer)}</p>` : ""}${doc.summary ? `<p>${esc(doc.summary)}</p>` : ""}${sections}`;
    if (doc._type === "caseStudy") main += `${ptHtml(doc.challenge)}${ptHtml(doc.solution)}${(doc.results ?? []).length ? `<h2>Results</h2><ul>${doc.results.map((result: any) => `<li><strong>${esc(result.value)}</strong> ${esc(result.label)}</li>`).join("")}</ul>` : ""}`;
    if (doc._type === "service" && doc.deliverables?.length) main += `<h2>What is included</h2><ul>${doc.deliverables.map((item: string) => `<li>${esc(item)}</li>`).join("")}</ul>`;
    const faqs = doc._type === "service" || doc._type === "location" ? doc.faqs ?? [] : [];
    if (faqs.length) main += `<h2>Frequently asked questions</h2>${faqs.map((qa: any) => `<h3>${esc(qa.question)}</h3><p>${esc(qa.answer)}</p>`).join("")}`;
    if (doc.relatedServices?.length) main += `<h2>Related services</h2>${list(doc.relatedServices)}`;
    if (doc.nearby?.length) main += `<h2>Nearby areas</h2>${list(doc.nearby)}`;
  }
  const crumbs = extra.breadcrumbs?.length ? `<nav aria-label="Breadcrumb"><ol>${extra.breadcrumbs.map((crumb) => `<li><a href="${esc(crumb.url)}">${esc(crumb.name)}</a></li>`).join("")}</ol></nav>` : "";
  const contact = [settings?.siteName && esc(settings.siteName), settings?.addressLocality && esc(`${settings.addressLocality} ${settings?.addressRegion ?? ""}`), settings?.phone && `<a href="tel:${esc(String(settings.phoneE164 || settings.phone).replace(/[^\d+]/g, ""))}">${esc(settings.phone)}</a>`, settings?.email && `<a href="mailto:${esc(settings.email)}">${esc(settings.email)}</a>`].filter(Boolean).join(" · ");
  return `<div class="ssr-shell"><header><a href="/">${esc(settings?.siteName || "Drivwon")}</a>${nav ? `<nav>${nav}</nav>` : ""}</header>${crumbs}<main>${main}</main><footer><p>${contact}</p></footer></div>`;
}
