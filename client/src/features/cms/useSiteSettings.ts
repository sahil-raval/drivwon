import { useQuery } from "@tanstack/react-query";
import { getSettings } from "./client";

export const defaultNavigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/quotation", label: "Get Quote" },
  { href: "/contact", label: "Contact" },
];

export function isPrivateWorkspacePath(href: string) {
  let pathname = href;
  try {
    pathname = new URL(href, "https://drivwon.invalid").pathname;
  } catch {
    // Fall through to exact-path matching for malformed editor input.
  }
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/dashboard" || normalized === "/drivwon/der" || normalized.startsWith("/drivwon/der/");
}

/** Site settings from Sanity. The server embeds them in the page, so the first render needs no extra request. */
export function useSiteSettings(): any | null {
  const initial = typeof window !== "undefined" ? window.__DRIVWON_SETTINGS__ : undefined;
  const query = useQuery({ queryKey: ["site-settings"], queryFn: getSettings, staleTime: 5 * 60_000, initialData: initial ?? undefined, retry: 1 });
  return query.data ?? null;
}
