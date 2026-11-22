import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, type LucideIcon, Search, Globe, Code2, Bot, Smartphone, Palette, Sparkles, BarChart3, ShoppingCart, Megaphone, Rocket, Users, ShieldCheck, Layers, Network, MapPin, Phone, Mail, Clock, Zap, Target, TrendingUp, Award, CheckCircle2, Star, Heart, Lightbulb, Gauge, LineChart, PenTool, Cpu, Database, Cloud, Lock, MessageSquare, Workflow } from "lucide-react";

const icons: Record<string, LucideIcon> = { Search, Globe, Code2, Bot, Smartphone, Palette, Sparkles, BarChart3, ShoppingCart, Megaphone, Rocket, Users, ShieldCheck, Layers, Network, MapPin, Phone, Mail, Clock, Zap, Target, TrendingUp, Award, CheckCircle2, Star, Heart, Lightbulb, Gauge, LineChart, PenTool, Cpu, Database, Cloud, Lock, MessageSquare, Workflow };
import { hrefForLink, isExternal, type LinkValue } from "@shared/cms/routes";
import { fileUrl, hasImage, imageDimensions, imageSrcSet, imageUrl } from "@shared/cms/image";
import { cn } from "@/lib/utils";

export function Icon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const Component = icons[name];
  return Component ? <Component className={className} aria-hidden /> : null;
}

const buttonStyles: Record<string, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
  secondary: "border border-white/20 text-white hover:bg-white/10",
  ghost: "bg-white text-black hover:bg-white/90",
  link: "text-primary hover:underline px-0",
};

export function CmsLink({ link, className, children, asButton = true, arrow = true }: { link?: LinkValue | null; className?: string; children?: ReactNode; asButton?: boolean; arrow?: boolean }) {
  const href = hrefForLink(link);
  if (!href || (!link?.label && !children)) return null;
  const style = link?.style || "primary";
  const classes = asButton
    ? cn("inline-flex items-center gap-2 rounded-full font-semibold transition-all", style === "link" ? "" : "px-6 py-3", buttonStyles[style] ?? buttonStyles.primary, className)
    : className;
  const content = <>{children ?? link?.label}{asButton && arrow && style !== "secondary" && <ArrowRight size={16} aria-hidden />}</>;
  const data = { "data-track": link?.trackingEvent || "cta_click", "data-track-label": link?.label };
  if (isExternal(href)) {
    const rel = [link?.newTab ? "noopener noreferrer" : "", link?.nofollow ? "nofollow sponsored" : ""].filter(Boolean).join(" ") || undefined;
    return <a href={href} className={classes} target={link?.newTab ? "_blank" : undefined} rel={rel} {...data}>{content}</a>;
  }
  if (href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("#")) return <a href={href} className={classes} {...data}>{content}</a>;
  return <Link href={href} className={classes} {...data}>{content}</Link>;
}

export function Buttons({ buttons, className }: { buttons?: LinkValue[]; className?: string }) {
  if (!buttons?.length) return null;
  return <div className={cn("flex flex-wrap gap-3", className)}>{buttons.map((button, index) => <CmsLink key={(button as any)._key ?? index} link={{ ...button, style: button.style || (index === 0 ? "primary" : "secondary") }} />)}</div>;
}

/** Responsive, lazy, CLS-safe image from Sanity. Set priority for the hero (LCP) image. */
export function CmsImage({ image, width = 1600, height, className, priority = false, sizes = "100vw" }: { image: any; width?: number; height?: number; className?: string; priority?: boolean; sizes?: string }) {
  if (!hasImage(image)) return null;
  const natural = imageDimensions(image);
  const ratioHeight = height ?? (natural ? Math.round((natural.height / natural.width) * width) : undefined);
  return (
    <img
      src={imageUrl(image, width, height)}
      srcSet={height ? undefined : imageSrcSet(image)}
      sizes={height ? undefined : sizes}
      width={width}
      height={ratioHeight}
      alt={image.decorative ? "" : image.alt ?? ""}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // @ts-expect-error fetchpriority is valid HTML but not yet in React types for all versions
      fetchpriority={priority ? "high" : undefined}
      className={className}
    />
  );
}

function embedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`;
  return null;
}

export function CmsVideo({ video, className, background = false }: { video: any; className?: string; background?: boolean }) {
  if (!video) return null;
  const src = video.source === "upload" ? fileUrl(video.file) : video.url;
  if (!src) return null;
  const poster = hasImage(video.poster) ? imageUrl(video.poster, 1280) : undefined;
  const embed = video.source === "youtube" || video.source === "vimeo" ? embedUrl(src) : null;
  if (embed && !background) {
    return <div className={cn("aspect-video overflow-hidden rounded-3xl bg-black", className)}><iframe src={embed} title={video.title || "Video"} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>;
  }
  if (background || video.autoplay) return <video className={className} src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-hidden={background || undefined} />;
  return (
    <figure className={className}>
      <video controls playsInline preload="metadata" poster={poster} src={src} className="aspect-video w-full rounded-3xl bg-black" title={video.title} />
      {video.transcript && <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer text-white">Read the transcript</summary><p className="mt-2 whitespace-pre-line">{video.transcript}</p></details>}
    </figure>
  );
}

const backgrounds: Record<string, string> = {
  default: "",
  black: "bg-black",
  subtle: "bg-white/[.025]",
  primary: "bg-primary/10",
  gradient: "bg-gradient-to-b from-primary/15 via-transparent to-transparent",
};
const spacing: Record<string, string> = { none: "py-0", small: "py-10 md:py-12", normal: "py-16 md:py-24", large: "py-24 md:py-36" };
const widths: Record<string, string> = { narrow: "max-w-3xl", normal: "max-w-6xl", wide: "max-w-7xl", full: "max-w-none" };

export function SectionShell({ settings, children, className, defaultWidth = "normal", as: Tag = "section", label }: { settings?: any; children: ReactNode; className?: string; defaultWidth?: string; as?: "section" | "div"; label?: string }) {
  const hide = settings?.hideOn === "mobile" ? "hidden md:block" : settings?.hideOn === "desktop" ? "md:hidden" : "";
  return (
    <Tag id={settings?.anchorId || undefined} aria-label={label} className={cn("relative scroll-mt-24", backgrounds[settings?.background ?? "default"], spacing[settings?.spacing ?? "normal"], hide, className)}>
      <div className={cn("mx-auto px-6", widths[settings?.width ?? defaultWidth], settings?.align === "center" && "text-center")}>{children}</div>
    </Tag>
  );
}

export function Heading({ level = "h2", children, className }: { level?: string; children: ReactNode; className?: string }) {
  const Tag = (["h1", "h2", "h3"].includes(level) ? level : "h2") as "h1" | "h2" | "h3";
  return <Tag className={cn("font-display font-bold tracking-tight text-white", Tag === "h1" ? "text-4xl md:text-6xl" : Tag === "h2" ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl", className)}>{children}</Tag>;
}

export function SectionIntro({ section, level, center }: { section: any; level?: string; center?: boolean }) {
  if (!section.eyebrow && !section.heading && !section.intro) return null;
  return (
    <header className={cn("mb-10 md:mb-14", center || section.settings?.align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
      {section.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-[.18em] text-primary">{section.eyebrow}</p>}
      {section.heading && <Heading level={level ?? section.headingLevel}>{section.heading}</Heading>}
      {section.intro && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{section.intro}</p>}
    </header>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden>/</span>}
            {item.href && index < items.length - 1 ? <Link href={item.href} className="hover:text-primary">{item.name}</Link> : <span aria-current="page" className="text-white/80">{item.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
