import { getAttribution } from "@/features/analytics/attribution";
import { trackLead } from "@/features/analytics/tracking";

export type LeadPayload = {
  formName: string;
  leadType?: string;
  value?: number;
  fields: Record<string, string | boolean | number>;
  startedAt?: number;
  website?: string;
  campaign?: string;
};

/** Sends a lead to /api/leads with attribution, then fires conversion events. Never throws on tracking errors. */
export async function submitLead(payload: LeadPayload): Promise<{ ok: boolean; error?: string }> {
  const attribution = { ...getAttribution(), campaign: payload.campaign };
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formName: payload.formName, leadType: payload.leadType, fields: payload.fields, pagePath: window.location.pathname, attribution, website: payload.website, startedAt: payload.startedAt }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: body.error || "Something went wrong. Please try again or call us." };
    try {
      trackLead({ formName: payload.formName, leadType: payload.leadType, value: payload.value, email: String(payload.fields.email ?? "") || undefined, phone: String(payload.fields.phone ?? "") || undefined });
    } catch { /* tracking must not block the user */ }
    return { ok: true };
  } catch {
    return { ok: false, error: "We could not send your message. Check your connection or call us." };
  }
}
