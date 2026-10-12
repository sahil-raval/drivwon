import { useEffect } from "react";
import { useSiteSettings } from "./useSiteSettings";
import type { SeoData } from "./types";

type HeadData = {
  title: string;
  description?: string;
  seo?: SeoData;
  path: string;
  type?: "website" | "article";
  publishedAt?: string;
};

function setMeta(attribute: "name" | "property", key: string, content?: string) {
  if (!content) return;
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function PageSEO({ data }: { data: HeadData }) {
  const settings = useSiteSettings();
  useEffect(() => {
    const seo = { ...settings?.defaultSeo, ...data.seo };
    const title = seo.metaTitle || data.title;
    const description = seo.metaDescription || data.description;
    const canonical = seo.canonicalUrl || `${window.location.origin}${data.path}`;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", seo.noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
    setMeta("property", "og:title", seo.ogTitle || title);
    setMeta("property", "og:description", seo.ogDescription || description);
    setMeta("property", "og:type", data.type || "website");
    setMeta("property", "og:url", canonical);
    const image = seo.ogImage as { asset?: { _ref?: string } } | undefined;
    if (image?.asset?._ref) {
      const [, id, dimensions, format] = image.asset._ref.split("-");
      if (id && dimensions && format) setMeta("property", "og:image", `https://cdn.sanity.io/images/v6luawxh/production/${id}-${dimensions}.${format}?w=1200&auto=format`);
    }
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.ogTitle || title);
    setMeta("name", "twitter:description", seo.ogDescription || description);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
    document.head.querySelector('script[data-drivwon-schema="page"]')?.remove();
    const schemas: object[] = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: settings?.siteName || "Drivwon",
        url: "https://drivwon.com",
        address: { "@type": "PostalAddress", addressLocality: settings?.addressLocality || "Geelong", addressRegion: settings?.addressRegion || "Victoria", addressCountry: settings?.addressCountry || "AU" },
        email: settings?.email,
        telephone: settings?.phone,
        sameAs: settings?.socialLinks?.map((item) => item.url),
      },
    ];
    if (seo.structuredData) {
      try {
        const custom = JSON.parse(seo.structuredData);
        if (custom && typeof custom === "object" && !Array.isArray(custom)) schemas.push(custom);
      } catch {
        // Invalid custom JSON-LD is ignored instead of breaking page metadata.
      }
    }
    if (data.type === "article") {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        datePublished: data.publishedAt,
        mainEntityOfPage: canonical,
        publisher: { "@type": "Organization", name: "Drivwon", url: "https://drivwon.com" },
      });
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.drivwonSchema = "page";
    script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    document.head.appendChild(script);
  }, [data, settings]);
  return null;
}
