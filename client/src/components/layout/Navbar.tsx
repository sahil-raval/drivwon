import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAudio } from "@/lib/audio";
import { hrefForLink } from "@shared/cms/routes";
import { defaultNavigation, isPrivateWorkspacePath, useSiteSettings } from "@/features/cms/useSiteSettings";
import { imageUrl } from "@/features/cms/client";
import { CmsLink } from "@/features/cms/ui";
import logoFallback from "@/assets/logo.png";

type NavLink = { label: string; href: string; description?: string; children?: NavLink[] };

/** Accepts the new CMS menu (navItem with link + dropdown) and the older {label, href} shape. */
function normalise(items: any[] | undefined): NavLink[] {
  if (!items?.length) return defaultNavigation;
  return items
    .map((item): NavLink => {
      const label = item.link?.label ?? item.label ?? "";
      const href = (item.link ? hrefForLink(item.link) : item.href) ?? "";
      return { label, href, description: item.description, children: item.children?.length ? normalise(item.children) : [] };
    })
    .filter((item) => Boolean(item.label && item.href) && !isPrivateWorkspacePath(item.href));
}

export default function Navbar({ minimal = false }: { minimal?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { playHover, playClick } = useAudio();
  const settings = useSiteSettings();
  const links = normalise(settings?.navigation);
  const logo = imageUrl(settings?.logo, 360) || logoFallback;
  const announcement = settings?.announcement?.enabled && settings.announcement.text ? settings.announcement : null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => setIsOpen(false), [location]);

  const active = (href: string) => (href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`));

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <nav aria-label="Main" className={cn("fixed top-0 z-50 w-full border-b border-transparent transition-all duration-300", scrolled ? "border-white/10 bg-background/85 backdrop-blur-md" : "bg-transparent")}>
        {announcement && !minimal && (
          <div className="bg-primary px-4 py-2 text-center text-sm text-white">
            {announcement.text} {announcement.link && <CmsLink link={announcement.link} asButton={false} className="ml-2 font-semibold underline" />}
          </div>
        )}
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link href="/" className="flex items-center" onMouseEnter={playHover} onClick={playClick} aria-label={`${settings?.siteName || "Drivwon"} home`}>
            <img src={logo} alt={settings?.logo?.alt || settings?.siteName || "Drivwon"} width={140} height={32} className="mr-2 inline-block h-8 w-auto flex-shrink-0" />
          </Link>

          {!minimal && (
            <div className="hidden items-center gap-7 md:flex">
              {links.map((link) => (
                <div key={link.href} className="group relative">
                  <Link href={link.href} className={cn("relative flex cursor-pointer items-center gap-1 text-sm font-medium tracking-wide transition-all hover:text-primary", active(link.href) ? "text-primary" : "text-muted-foreground")} onMouseEnter={playHover} onClick={playClick} aria-current={active(link.href) ? "page" : undefined}>
                    {link.label}
                    {link.children?.length ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : null}
                    <span className={cn("absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-300", active(link.href) ? "w-full" : "w-0 group-hover:w-full")} />
                  </Link>
                  {link.children?.length ? (
                    <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 pt-4 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <ul className="rounded-2xl border border-white/10 bg-[#101014] p-2 shadow-2xl">
                        {link.children.map((child) => (
                          <li key={child.href}><Link href={child.href} className="block rounded-xl px-4 py-3 hover:bg-white/5"><span className="block text-sm font-medium text-white">{child.label}</span>{child.description && <span className="block text-xs text-muted-foreground">{child.description}</span>}</Link></li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
              {settings?.headerCta && <CmsLink link={settings.headerCta} className="px-5 py-2 text-sm" arrow={false} />}
            </div>
          )}
          {minimal && settings?.phone && <a href={`tel:${String(settings.phoneE164 || settings.phone).replace(/[^\d+]/g, "")}`} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">Call {settings.phone}</a>}

          {!minimal && (
            <button aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isOpen} className="text-white md:hidden" onClick={() => { setIsOpen(!isOpen); playClick(); }}>
              {isOpen ? <X /> : <Menu />}
            </button>
          )}
        </div>

        {isOpen && !minimal && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="absolute left-0 top-20 flex max-h-[80vh] w-full flex-col gap-1 overflow-y-auto border-b border-white/10 bg-background p-6 md:hidden">
            {links.map((link) => (
              <div key={link.href}>
                <Link href={link.href} className={cn("block py-2 font-display text-lg font-medium", active(link.href) ? "text-primary" : "text-white")} onClick={playClick}>{link.label}</Link>
                {link.children?.map((child) => <Link key={child.href} href={child.href} className="block py-1.5 pl-4 text-muted-foreground">{child.label}</Link>)}
              </div>
            ))}
            {settings?.headerCta && <CmsLink link={settings.headerCta} className="mt-4 justify-center" />}
          </motion.div>
        )}
      </nav>
    </>
  );
}
