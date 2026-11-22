import { Link } from "wouter";
import { Phone } from "lucide-react";
import logoFallback from "@/assets/logo.png";
import { hrefForLink } from "@shared/cms/routes";
import { isPrivateWorkspacePath, useSiteSettings } from "@/features/cms/useSiteSettings";
import { imageUrl } from "@/features/cms/client";
import { CmsLink } from "@/features/cms/ui";

type FooterLink = { label: string; href?: string };

const fallbackColumns: Array<{ title: string; links: FooterLink[] }> = [
  { title: "Services", links: [{ label: "SEO Geelong", href: "/services/seo-geelong" }, { label: "Web Design Geelong", href: "/services/web-design-geelong" }, { label: "E-commerce", href: "/services/ecommerce-development" }, { label: "AI Automation", href: "/services/ai-automation" }, { label: "All services", href: "/services" }] },
  { title: "Company", links: [{ label: "About Us", href: "/about" }, { label: "Projects", href: "/projects" }, { label: "Blog", href: "/blog" }, { label: "Get a Quote", href: "/quotation" }, { label: "Contact", href: "/contact" }] },
];

function toLinks(links?: any[]): FooterLink[] {
  return (links ?? []).map((link) => ({ label: link.label, href: hrefForLink(link) ?? link.href })).filter((link) => link.label && (!link.href || !isPrivateWorkspacePath(link.href)));
}

function FooterAnchor({ item }: { item: FooterLink }) {
  if (!item.href) return <>{item.label}</>;
  if (/^(https?:|tel:|mailto:)/.test(item.href)) return <a href={item.href} className="hover:text-primary" target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}>{item.label}</a>;
  return <Link href={item.href} className="transition-colors hover:text-primary">{item.label}</Link>;
}

export default function Footer({ minimal = false }: { minimal?: boolean }) {
  const settings = useSiteSettings();
  const logo = imageUrl(settings?.logo, 360) || logoFallback;
  const name = settings?.siteName || "Drivwon";
  const columns = settings?.footerColumns?.length ? settings.footerColumns.map((column: any) => ({ title: column.title, links: toLinks(column.links) })) : fallbackColumns;
  const legal = settings?.legalLinks?.length ? toLinks(settings.legalLinks) : [{ label: "Privacy Policy", href: "/privacy-policy" }];
  const copyright = (settings?.copyright || `© {year} ${name}. All rights reserved.`).replace("{year}", String(new Date().getFullYear()));
  const phoneHref = settings?.phone ? `tel:${String(settings.phoneE164 || settings.phone).replace(/[^\d+]/g, "")}` : undefined;
  const email = settings?.email || "info@drivwon.com";
  const socials = (settings?.socialLinks ?? []).filter((item: any) => item?.url && item.showInFooter !== false);
  const sticky = settings?.stickyCta;

  return (
    <>
      <footer className="border-t border-white/10 bg-black py-16 pb-28 md:pb-16">
        {!minimal && settings?.footerCta?.heading && (
          <div className="container mx-auto mb-16 px-6">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-primary/25 to-transparent p-8 md:flex-row md:items-center md:p-12">
              <div><p className="font-display text-3xl font-bold text-white">{settings.footerCta.heading}</p>{settings.footerCta.text && <p className="mt-2 max-w-xl text-white/70">{settings.footerCta.text}</p>}</div>
              <CmsLink link={settings.footerCta.link} />
            </div>
          </div>
        )}
        <div className={`container mx-auto grid gap-10 px-6 ${minimal ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
          <div className="space-y-4">
            <img src={logo} alt={settings?.logo?.alt || name} width={140} height={32} className="h-8 w-auto" loading="lazy" />
            <p className="text-sm text-muted-foreground">{settings?.footerText ?? "Web design, SEO and AI automation built in-house in Geelong, Victoria."}</p>
          </div>
          {!minimal && columns.map((column: { title: string; links: FooterLink[] }) => (
            <div key={column.title}>
              <p className="mb-4 font-display font-bold text-white">{column.title}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">{column.links.map((item) => <li key={`${item.label}-${item.href}`}><FooterAnchor item={item} /></li>)}</ul>
            </div>
          ))}
          <div>
            <p className="mb-4 font-display font-bold text-white">Contact</p>
            {/* NAP — must match the Google Business Profile exactly. */}
            <address className="space-y-1 text-sm not-italic text-muted-foreground">
              <p className="text-white">{name}</p>
              {settings?.showAddress && settings?.streetAddress && <p>{settings.streetAddress}</p>}
              <p>{settings?.addressLocality || "Geelong"} {settings?.addressRegion || "VIC"}{settings?.showAddress && settings?.postalCode ? ` ${settings.postalCode}` : ""}, Australia</p>
              {phoneHref && <p><a href={phoneHref} className="hover:text-primary">{settings.phone}</a></p>}
              <p><a className="hover:text-primary" href={`mailto:${email}`}>{email}</a></p>
              {settings?.abn && <p>ABN {settings.abn}</p>}
              {settings?.acn && <p>ACN {settings.acn}</p>}
            </address>
            {socials.length > 0 && <ul className="mt-4 flex flex-wrap gap-4 text-sm">{socials.map((item: any) => <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer me" className="text-muted-foreground hover:text-primary">{item.label}</a></li>)}</ul>}
          </div>
        </div>
        <div className="container mx-auto mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 px-6 pt-8 text-xs text-muted-foreground md:flex-row">
          <p>{copyright}</p>
          <ul className="flex gap-4">{legal.map((item) => <li key={item.label}><FooterAnchor item={item} /></li>)}</ul>
        </div>
      </footer>
      {sticky?.enabled !== false && phoneHref && (
        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-background/95 p-3 backdrop-blur md:hidden">
          <a href={phoneHref} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 py-3 font-semibold text-white" data-track="sticky_call"><Phone className="h-4 w-4" aria-hidden />{sticky?.callLabel || "Call"}</a>
          {sticky?.quoteLink ? <CmsLink link={sticky.quoteLink} className="justify-center rounded-xl py-3" arrow={false} /> : <Link href="/quotation" className="flex items-center justify-center rounded-xl bg-primary py-3 font-semibold text-white" data-track="sticky_quote">Get a quote</Link>}
        </div>
      )}
    </>
  );
}
