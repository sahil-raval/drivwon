/**
 * One place for all tracking. IDs come from Sanity → Site settings → Analytics & tracking.
 * Supports GA4, GTM, Google Ads, Meta Pixel, Microsoft Clarity, LinkedIn Insight and TikTok, with Google Consent Mode v2.
 */
type Settings = Record<string, any> | null;
type Params = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    lintrk?: (...args: unknown[]) => void;
    ttq?: { track: (...args: unknown[]) => void; page: () => void };
    _linkedin_partner_id?: string;
  }
}

const CONSENT_KEY = "drivwon_consent";
let settings: Settings = null;
let googleLoaded = false;
let marketingLoaded = false;

export type Consent = "granted" | "denied" | null;

export function getConsent(): Consent {
  try { return (localStorage.getItem(CONSENT_KEY) as Consent) ?? null; } catch { return null; }
}

function script(src: string, id: string) {
  if (document.getElementById(id)) return;
  const element = document.createElement("script");
  element.async = true;
  element.src = src;
  element.id = id;
  document.head.appendChild(element);
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // gtag must push the arguments object itself.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function loadGoogle(current: Settings, consent: Consent) {
  if (googleLoaded || !current) return;
  googleLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag as any;
  const needsBanner = current.consentMode !== "none";
  const state = !needsBanner || consent === "granted" ? "granted" : "denied";
  gtag("consent", "default", { ad_storage: state, analytics_storage: state, ad_user_data: state, ad_personalization: state, wait_for_update: 500 });
  gtag("js", new Date());
  if (current.gtmId) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(current.gtmId)}`, "gtm");
  }
  const tagId = current.ga4Id || current.googleAdsId;
  if (tagId) {
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`, "gtag");
    if (current.ga4Id) gtag("config", current.ga4Id, { send_page_view: false });
    if (current.googleAdsId) gtag("config", current.googleAdsId, { allow_enhanced_conversions: true });
  }
}

function loadMarketing(current: Settings) {
  if (marketingLoaded || !current) return;
  marketingLoaded = true;
  if (current.metaPixelId) {
    const fbq: any = function (...args: unknown[]) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
    fbq.queue = []; fbq.loaded = true; fbq.version = "2.0"; fbq.push = fbq;
    window.fbq = window.fbq || fbq;
    script("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    window.fbq!("init", current.metaPixelId);
  }
  if (current.clarityId) {
    const clarity: any = function (...args: unknown[]) { (clarity.q = clarity.q || []).push(args); };
    window.clarity = window.clarity || clarity;
    script(`https://www.clarity.ms/tag/${encodeURIComponent(current.clarityId)}`, "clarity");
  }
  if (current.linkedinPartnerId) {
    window._linkedin_partner_id = current.linkedinPartnerId;
    const lintrk: any = function (...args: unknown[]) { (lintrk.q = lintrk.q || []).push(args); };
    window.lintrk = window.lintrk || lintrk;
    script("https://snap.licdn.com/li.lms-analytics/insight.min.js", "linkedin");
  }
  if (current.tiktokPixelId) {
    const queue: unknown[][] = [];
    window.ttq = window.ttq || { track: (...args: unknown[]) => queue.push(["track", ...args]), page: () => queue.push(["page"]) };
    script(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(current.tiktokPixelId)}&lib=ttq`, "tiktok");
  }
}

export function initTracking(current: Settings) {
  settings = current;
  if (!current || typeof window === "undefined") return;
  const consent = getConsent();
  loadGoogle(current, consent);
  if (current.consentMode === "none" || consent === "granted") loadMarketing(current);
}

export function setConsent(value: "granted" | "denied") {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
  window.gtag?.("consent", "update", { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value });
  if (value === "granted") loadMarketing(settings);
  track("consent_update", { consent: value });
}

export function pageview(path: string, title = document.title) {
  if (!settings) return;
  const params = { page_path: path, page_location: window.location.href, page_title: title };
  if (settings.ga4Id) window.gtag?.("event", "page_view", { ...params, send_to: settings.ga4Id });
  window.dataLayer?.push({ event: "virtual_page_view", ...params });
  window.fbq?.("track", "PageView");
  window.ttq?.page();
}

/** Send any event to every connected tool. */
export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (settings?.ga4Id) window.gtag?.("event", event, params);
  window.clarity?.("event", event);
}

/** Call after a successful form submit. Fires GA4 generate_lead, Google Ads conversion, Meta Lead, LinkedIn and TikTok. */
export function trackLead(params: { formName: string; leadType?: string; value?: number; email?: string; phone?: string }) {
  const value = params.value ?? 0;
  track("generate_lead", { form_name: params.formName, lead_type: params.leadType, value, currency: "AUD" });
  if (settings?.googleAdsId && settings?.googleAdsLeadLabel) {
    // Enhanced conversions: Google hashes these in the browser.
    if (params.email || params.phone) window.gtag?.("set", "user_data", { email: params.email, phone_number: params.phone });
    window.gtag?.("event", "conversion", { send_to: `${settings.googleAdsId}/${settings.googleAdsLeadLabel}`, value, currency: "AUD" });
  }
  window.fbq?.("track", "Lead", { content_name: params.formName, value, currency: "AUD" });
  window.ttq?.track("SubmitForm", { content_name: params.formName });
}
