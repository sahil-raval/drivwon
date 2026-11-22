import { useEffect } from "react";
import { buildHead, type HeadInput } from "@shared/seo/head";
import { useSiteSettings } from "./useSiteSettings";

const MANAGED = "data-drivwon-head";

/**
 * Keeps <head> correct during client-side navigation. The first page load already has the same tags from the server.
 * Uses the exact same builder as the server, so tags never disagree.
 */
export default function Head(props: Omit<HeadInput, "settings">) {
  const settings = useSiteSettings();
  const { doc, path, fallback, list } = props;
  useEffect(() => {
    const head = buildHead({ doc, settings, path, fallback, list });
    document.title = head.title;
    // Remove server-rendered and previously managed tags that we now own.
    document.head.querySelectorAll(`[${MANAGED}], link[rel="canonical"], link[rel="alternate"][hreflang], script[type="application/ld+json"]`).forEach((node) => node.remove());
    const managedNames = new Set(head.tags.filter((tag) => tag.tag === "meta").map((tag) => tag.attrs.name || tag.attrs.property));
    document.head.querySelectorAll("meta[name], meta[property]").forEach((node) => {
      const key = node.getAttribute("name") || node.getAttribute("property");
      if (key && (managedNames.has(key) || key.startsWith("og:") || key.startsWith("twitter:") || key.startsWith("article:"))) node.remove();
    });
    for (const tag of head.tags) {
      const element = document.createElement(tag.tag);
      for (const [key, value] of Object.entries(tag.attrs)) element.setAttribute(key, value);
      element.setAttribute(MANAGED, "");
      document.head.appendChild(element);
    }
    for (const json of head.jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MANAGED, "");
      script.textContent = JSON.stringify(json);
      document.head.appendChild(script);
    }
  }, [doc, settings, path, fallback, list]);
  return null;
}
