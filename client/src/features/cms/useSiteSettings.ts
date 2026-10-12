import { useEffect, useState } from "react";
import { sanityClient } from "./client";
import type { SeoData } from "./types";

type SiteSettings = {
  siteName?: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  defaultSeo?: SeoData;
  logo?: { asset?: { _ref?: string }; alt?: string };
  navigation?: Array<{ label: string; href: string }>;
  footerServices?: Array<{ label: string; href?: string }>;
  footerLinks?: Array<{ label: string; href: string }>;
  footerText?: string;
  email?: string;
  phone?: string;
  socialLinks?: Array<{ label: string; url: string }>;
};

let settingsPromise: Promise<SiteSettings | null> | null = null;

function getSiteSettings() {
  settingsPromise ??= sanityClient
    .fetch<SiteSettings | null>(`*[_type == "siteSettings"][0]{siteName,addressLocality,addressRegion,addressCountry,defaultSeo,logo,navigation,footerServices,footerLinks,footerText,email,phone,socialLinks}`)
    .then((value) => value ?? null)
    .catch((error) => {
      settingsPromise = null;
      throw error;
    });
  return settingsPromise;
}

export const defaultNavigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/quotation", label: "Get Quote" },
  { href: "/contact", label: "Contact" },
];

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((value) => { if (active) setSettings(value); })
      .catch((error) => console.error("Sanity site settings query failed", error));
    return () => { active = false; };
  }, []);
  return settings;
}
