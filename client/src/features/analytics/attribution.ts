/**
 * First-touch and last-touch marketing attribution, saved in the visitor's browser and sent with each lead.
 * Lets you see in Sanity which channel/campaign/keyword produced every enquiry.
 */
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid", "li_fat_id", "ref"];
const STORE = "drivwon_attribution_v1";
const SESSION = "drivwon_session";

type Touch = Record<string, string>;
export type Attribution = { firstTouch?: Touch; lastTouch?: Touch; landingPage?: string; referrer?: string; visits?: number; device?: string };

function read(): Attribution {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; }
}
function write(value: Attribution) {
  try { localStorage.setItem(STORE, JSON.stringify(value)); } catch { /* private mode */ }
}

function externalReferrer() {
  try {
    if (!document.referrer) return "";
    const ref = new URL(document.referrer);
    return ref.host === window.location.host ? "" : `${ref.origin}${ref.pathname}`;
  } catch { return ""; }
}

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const touch: Touch = {};
  for (const key of KEYS) { const value = params.get(key); if (value) touch[key] = value.slice(0, 300); }
  const referrer = externalReferrer();
  if (!Object.keys(touch).length && referrer) touch.referrer = referrer;
  const state = read();
  const now = new Date().toISOString();
  if (Object.keys(touch).length) {
    touch.at = now;
    touch.page = window.location.pathname;
    if (!state.firstTouch) state.firstTouch = touch;
    state.lastTouch = touch;
  }
  state.landingPage ??= window.location.pathname + window.location.search;
  if (referrer) state.referrer = referrer;
  let newSession = false;
  try { newSession = !sessionStorage.getItem(SESSION); sessionStorage.setItem(SESSION, "1"); } catch { /* ignore */ }
  if (newSession) state.visits = (state.visits ?? 0) + 1;
  state.device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop";
  write(state);
}

export function getAttribution(): Attribution {
  return typeof window === "undefined" ? {} : read();
}
