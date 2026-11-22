/**
 * Lead capture. Stores each enquiry in Sanity as a PRIVATE document (ID "leads.<uuid>" — documents with a
 * dot in the ID are never returned to unauthenticated requests, even in a public dataset), then optionally
 * emails it (Resend) and forwards it to a webhook (Zapier/Make/CRM).
 *
 * Server env:
 *   SANITY_LEADS_TOKEN (or SANITY_WRITE_TOKEN) — Editor token, server-side only
 *   LEAD_NOTIFY_EMAIL, LEAD_FROM_EMAIL, RESEND_API_KEY — optional email alerts
 *   LEAD_WEBHOOK_URL — optional JSON webhook
 */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sanityConfig } from "../shared/cms/config.js";

const leadSchema = z.object({
  formName: z.string().trim().max(120).default("Website form"),
  formId: z.string().max(120).optional(),
  leadType: z.string().max(40).optional(),
  fields: z.record(z.string().max(60), z.union([z.string().max(5000), z.boolean(), z.number()])).refine((value) => Object.keys(value).length <= 40),
  pagePath: z.string().max(500).optional(),
  attribution: z.object({
    firstTouch: z.record(z.string().max(40), z.string().max(500)).optional(),
    lastTouch: z.record(z.string().max(40), z.string().max(500)).optional(),
    landingPage: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
    visits: z.number().int().min(0).max(100000).optional(),
    device: z.string().max(40).optional(),
    campaign: z.string().max(200).optional(),
  }).partial().default({}),
  website: z.string().max(200).optional(), // honeypot — real people never fill this
  startedAt: z.number().optional(),
});

export type LeadResult = { status: number; json: Record<string, unknown> };

const attempts = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((time) => now - time < 10 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > 6;
}

const AI_HOSTS = ["chatgpt.com", "chat.openai.com", "perplexity.ai", "claude.ai", "gemini.google.com", "copilot.microsoft.com", "bing.com/chat", "you.com", "phind.com", "deepseek.com", "meta.ai", "grok.com"];

export function classifyChannel(touch: Record<string, string> = {}, referrer = "") {
  const medium = (touch.utm_medium ?? "").toLowerCase();
  const source = (touch.utm_source ?? "").toLowerCase();
  const ref = referrer.toLowerCase();
  if (touch.gclid || touch.gbraid || touch.wbraid || touch.msclkid || /^(cpc|ppc|paid|paidsearch|paid_search)$/.test(medium)) return "Paid search";
  if (touch.fbclid && medium && medium !== "organic" || touch.ttclid || touch.li_fat_id || /paid_social|paidsocial|social_paid|cpm/.test(medium)) return "Paid social";
  if (AI_HOSTS.some((host) => ref.includes(host) || source.includes(host.split(".")[0]))) return "AI assistant";
  if (medium === "email" || source.includes("newsletter")) return "Email";
  if (/google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\./.test(ref) || medium === "organic") return "Organic search";
  if (/facebook\.|instagram\.|linkedin\.|t\.co|twitter\.|x\.com|tiktok\.|youtube\./.test(ref) || medium === "social") return "Organic social";
  if (source === "gbp" || source === "google_business" || medium === "local") return "Google Business Profile";
  if (ref) return "Referral";
  return medium || source ? "Campaign" : "Direct";
}

const toPairs = (record?: Record<string, unknown>) => Object.entries(record ?? {}).filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => ({ _key: randomUUID().slice(0, 12), _type: "keyValue", label, value: String(value) }));

export async function handleLead(raw: unknown, ip: string): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, json: { error: "Please check the form and try again." } };
  const input = parsed.data;
  // Bots: pretend success so they do not retry.
  if (input.website) return { status: 200, json: { ok: true } };
  if (rateLimited(ip)) return { status: 429, json: { error: "Too many submissions. Please wait a few minutes or call us." } };

  const fields = Object.fromEntries(Object.entries(input.fields).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
  const text = (key: string) => (typeof fields[key] === "string" ? (fields[key] as string) : undefined);
  const email = text("email");
  if (email && !z.string().email().safeParse(email).success) return { status: 400, json: { error: "Please enter a valid email address." } };
  if (!email && !text("phone")) return { status: 400, json: { error: "Please add an email or phone number so we can reply." } };

  const tooFast = input.startedAt ? Date.now() - input.startedAt < 2500 : false;
  const firstTouch = input.attribution.firstTouch ?? {};
  const lastTouch = input.attribution.lastTouch ?? {};
  const clickIds = Object.fromEntries(Object.entries({ ...firstTouch, ...lastTouch }).filter(([key]) => /clid$|braid$|^li_fat_id$/.test(key)));
  const utms = (touch: Record<string, string>) => Object.fromEntries(Object.entries(touch).filter(([key]) => key.startsWith("utm_") || key === "ref"));
  const channel = classifyChannel(lastTouch, input.attribution.referrer ?? "");

  const doc = {
    _id: `leads.${randomUUID()}`,
    _type: "lead",
    status: tooFast ? "spam" : "new",
    name: text("name") ?? [text("firstName"), text("lastName")].filter(Boolean).join(" "),
    email,
    phone: text("phone"),
    company: text("company"),
    service: text("service"),
    budget: text("budget"),
    message: text("message") ?? text("details"),
    fields: toPairs(fields),
    formName: input.formName,
    leadType: input.leadType,
    marketingConsent: fields.marketingConsent === true || fields.marketingConsent === "true",
    submittedAt: new Date().toISOString(),
    pagePath: input.pagePath,
    landingPage: input.attribution.landingPage,
    referrer: input.attribution.referrer,
    channel,
    campaign: input.attribution.campaign || lastTouch.utm_campaign || firstTouch.utm_campaign,
    firstTouch: toPairs(utms(firstTouch)),
    lastTouch: toPairs(utms(lastTouch)),
    clickIds: toPairs(clickIds),
    device: input.attribution.device,
    visits: input.attribution.visits,
  };

  const token = process.env.SANITY_LEADS_TOKEN || process.env.SANITY_WRITE_TOKEN;
  let stored = false;
  if (token) {
    try {
      const response = await fetch(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/mutate/${sanityConfig.dataset}?returnIds=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mutations: [{ create: doc }] }),
        signal: AbortSignal.timeout(5000),
      });
      stored = response.ok;
      if (!response.ok) console.error("[leads] Sanity rejected the lead", response.status, await response.text().catch(() => ""));
    } catch (error) {
      console.error("[leads] Could not store lead in Sanity", error);
    }
  } else {
    console.warn("[leads] SANITY_LEADS_TOKEN is not set — lead not stored in Sanity.");
  }

  const tasks: Promise<unknown>[] = [];
  if (process.env.LEAD_WEBHOOK_URL) {
    tasks.push(fetch(process.env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...doc, fields }), signal: AbortSignal.timeout(5000) }).catch((error) => console.error("[leads] Webhook failed", error)));
  }
  if (process.env.RESEND_API_KEY && process.env.LEAD_NOTIFY_EMAIL && doc.status !== "spam") {
    const rows = Object.entries({ Form: doc.formName, Channel: channel, Campaign: doc.campaign, Page: doc.pagePath, "First page": doc.landingPage, Referrer: doc.referrer, ...fields })
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(label)}</td><td>${escapeHtml(String(value))}</td></tr>`).join("");
    tasks.push(fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.LEAD_FROM_EMAIL || "Drivwon website <leads@drivwon.com>", to: process.env.LEAD_NOTIFY_EMAIL.split(","), reply_to: email, subject: `New lead: ${doc.name || email || doc.phone} (${doc.formName})`, html: `<h2>New website lead</h2><table>${rows}</table>` }),
      signal: AbortSignal.timeout(5000),
    }).catch((error) => console.error("[leads] Email failed", error)));
  }
  await Promise.all(tasks);
  return { status: 200, json: { ok: true, stored, channel } };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
