import { Link } from "wouter";
import logoFallback from "@/assets/logo.png";
import { useSiteSettings } from "@/features/cms/useSiteSettings";
import { imageUrl } from "@/features/cms/client";

export default function Footer() {
  const settings = useSiteSettings();
  const logo = imageUrl(settings?.logo, 360) || logoFallback;
  const footerServices: Array<{ label: string; href?: string }> = settings?.footerServices?.length
    ? settings.footerServices
    : ["Branding & Design", "Web Development", "Mobile Applications", "Digital Marketing", "SEO Optimization", "AI Agents"].map((label) => ({ label }));
  const footerLinks = settings?.footerLinks?.length
    ? settings.footerLinks
    : [{ href: "/about", label: "About Us" }, { href: "/contact", label: "Contact" }, { href: "/quotation", label: "Get a Quote" }, { href: "/privacy-policy", label: "Privacy Policy" }];
  return (
    <footer className="bg-black border-t border-white/10 py-20">
      <div className="container mx-auto px-6 grid md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-bold text-white">
            <img src={logo} alt={settings?.logo?.alt || settings?.siteName || "Drivwon"} className="h-8 w-auto" />
            
          </h3>
          <p className="text-muted-foreground text-sm">
            {settings?.footerText ?? "Crafting digital experiences that transcend the ordinary. Based in Australia, serving the globe."}
          </p>
        </div>

        <div>
          <h4 className="font-display font-bold text-white mb-4">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {footerServices.map((item) => <li key={item.label}>{item.href ? <Link href={item.href} className="hover:text-primary">{item.label}</Link> : item.label}</li>)}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold text-white mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {footerLinks.map((item) => <li key={item.href}><Link href={item.href} className="hover:text-primary transition-colors">{item.label}</Link></li>)}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold text-white mb-4">Connect</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Geelong, Australia<br />
            <a className="hover:text-primary" href={`mailto:${settings?.email ?? "info@drivwon.com"}`}>{settings?.email ?? "info@drivwon.com"}</a>
            {settings?.phone && <><br /><a href={`tel:${settings.phone}`} className="hover:text-primary">{settings.phone}</a></>}
          </p>
          <div className="flex gap-4">
            {(settings?.socialLinks ?? []).map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="hover:text-primary">{item.label}</a>)}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-6 mt-10 pt-10 border-t border-white/5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Drivwon. All rights reserved.
      </div>
    </footer>
  );
}
