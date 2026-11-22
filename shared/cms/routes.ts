export type DocRef = { _type?: string; slug?: string | { current?: string } } | null | undefined;
export type LinkValue = {
  label?: string; linkType?: string; internal?: DocRef; path?: string; url?: string; phone?: string; email?: string;
  style?: string; newTab?: boolean; nofollow?: boolean; trackingEvent?: string;
};

function slugOf(ref: DocRef) {
  if (!ref) return "";
  return typeof ref.slug === "string" ? ref.slug : ref.slug?.current ?? "";
}

/** The public path for any routable document. */
export function pathForDoc(ref: DocRef): string {
  const slug = slugOf(ref);
  switch (ref?._type) {
    case "page": return slug === "home" ? "/" : `/${slug}`;
    case "landingPage": return `/${slug}`;
    case "post": return `/blog/${slug}`;
    case "service": return `/services/${slug}`;
    case "location": return `/locations/${slug}`;
    case "caseStudy": return `/projects/${slug}`;
    case "category": return `/blog/category/${slug}`;
    case "author": return `/authors/${slug}`;
    default: return slug ? `/${slug}` : "/";
  }
}

export function hrefForLink(link?: LinkValue | null): string | undefined {
  if (!link) return undefined;
  switch (link.linkType) {
    case "internal": return link.internal ? pathForDoc(link.internal) : undefined;
    case "path": return link.path;
    case "external": return link.url;
    case "phone": return link.phone ? `tel:${link.phone.replace(/[^\d+]/g, "")}` : undefined;
    case "email": return link.email ? `mailto:${link.email}` : undefined;
    default: return link.path || link.url || (link.internal ? pathForDoc(link.internal) : undefined);
  }
}

export function isExternal(href?: string) {
  return Boolean(href && /^https?:\/\//i.test(href));
}

export type RouteMatch =
  | { kind: "page"; slug: string }
  | { kind: "pageOrLanding"; slug: string }
  | { kind: "post"; slug: string }
  | { kind: "blogIndex" }
  | { kind: "category"; slug: string }
  | { kind: "author"; slug: string }
  | { kind: "service"; slug: string }
  | { kind: "location"; slug: string }
  | { kind: "caseStudy"; slug: string }
  | { kind: "none" };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Maps a URL path to the CMS document that should render it. */
export function matchRoute(rawPath: string): RouteMatch {
  const path = (rawPath.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "page", slug: "home" };
  const parts = path.slice(1).split("/");
  const valid = (value?: string) => Boolean(value && slugPattern.test(value));
  if (parts[0] === "blog") {
    if (parts.length === 1) return { kind: "blogIndex" };
    if (parts[1] === "category" && parts.length === 3 && valid(parts[2])) return { kind: "category", slug: parts[2] };
    if (parts.length === 2 && valid(parts[1])) return { kind: "post", slug: parts[1] };
    return { kind: "none" };
  }
  if (parts.length === 2 && valid(parts[1])) {
    if (parts[0] === "services") return { kind: "service", slug: parts[1] };
    if (parts[0] === "locations") return { kind: "location", slug: parts[1] };
    if (parts[0] === "projects") return { kind: "caseStudy", slug: parts[1] };
    if (parts[0] === "authors") return { kind: "author", slug: parts[1] };
  }
  if (parts.length === 1 && valid(parts[0])) return { kind: "pageOrLanding", slug: parts[0] };
  return { kind: "none" };
}

/** Paths that must never be indexed or rendered from the CMS. */
export function isPrivatePath(path: string) {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized === "/dashboard" || normalized === "/studio" || normalized === "/drivwon/der" || normalized.startsWith("/drivwon/der/") || normalized.startsWith("/api/");
}
