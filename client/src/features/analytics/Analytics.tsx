import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useSiteSettings } from "@/features/cms/useSiteSettings";
import { captureAttribution } from "./attribution";
import { getConsent, initTracking, pageview, setConsent, track } from "./tracking";

/** Mount once. Loads trackers, sends SPA page views and tracks clicks, scroll depth and outbound links. */
export default function Analytics() {
  const settings = useSiteSettings();
  const [location] = useLocation();
  const [showBanner, setShowBanner] = useState(false);
  const ready = useRef(false);

  useEffect(() => { captureAttribution(); }, []);

  useEffect(() => {
    if (!settings || ready.current) return;
    ready.current = true;
    initTracking(settings);
    setShowBanner(settings.consentMode !== "none" && getConsent() === null && Boolean(settings.ga4Id || settings.gtmId || settings.metaPixelId || settings.clarityId || settings.linkedinPartnerId || settings.tiktokPixelId || settings.googleAdsId));
    pageview(window.location.pathname);
  }, [settings]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    // Wait a tick so the new page has set document.title.
    const timer = window.setTimeout(() => pageview(location), 50);
    return () => window.clearTimeout(timer);
  }, [location]);

  // Click tracking: CTAs (data-track), phone, email and outbound links.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLElement>("a, button, [data-track]");
      if (!anchor) return;
      const label = (anchor.getAttribute("data-track-label") || anchor.textContent || "").trim().slice(0, 100);
      const custom = anchor.getAttribute("data-track");
      if (custom) track(custom, { label, page_path: window.location.pathname });
      const href = anchor.getAttribute("href") || "";
      if (settings?.trackOutbound === false) return;
      if (href.startsWith("tel:")) track("phone_click", { label, page_path: window.location.pathname });
      else if (href.startsWith("mailto:")) track("email_click", { label, page_path: window.location.pathname });
      else if (/^https?:\/\//.test(href) && !href.includes(window.location.host)) track("outbound_click", { link_url: href, label });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [settings]);

  // Scroll depth per page.
  useEffect(() => {
    if (settings?.trackScrollDepth === false) return;
    const marks = [25, 50, 75, 90];
    const sent = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const percent = (window.scrollY / max) * 100;
      for (const mark of marks) if (percent >= mark && !sent.has(mark)) { sent.add(mark); track("scroll_depth", { percent: mark, page_path: window.location.pathname }); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location, settings]);

  if (!showBanner) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#101014]/95 p-5 text-sm shadow-2xl backdrop-blur md:inset-x-auto md:left-6">
      <p className="text-muted-foreground">{settings?.consentText || "We use cookies to understand how people use our site and to improve our marketing."} <a href="/privacy-policy" className="text-primary underline">Privacy policy</a></p>
      <div className="mt-4 flex gap-3">
        <button className="rounded-full bg-primary px-5 py-2 font-semibold text-white" onClick={() => { setConsent("granted"); setShowBanner(false); }}>Accept</button>
        <button className="rounded-full border border-white/20 px-5 py-2 text-white" onClick={() => { setConsent("denied"); setShowBanner(false); }}>Decline</button>
      </div>
    </div>
  );
}
