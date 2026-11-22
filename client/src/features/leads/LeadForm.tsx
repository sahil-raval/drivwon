import { FormEvent, useRef, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { pathForDoc } from "@shared/cms/routes";
import { track } from "@/features/analytics/tracking";
import { submitLead } from "./submitLead";

type Field = { _key?: string; label: string; name: string; type?: string; placeholder?: string; help?: string; options?: string[]; required?: boolean; width?: string };
export type LeadFormDoc = {
  _id?: string; title: string; fields?: Field[]; submitLabel?: string; successTitle?: string; successMessage?: string;
  redirectPath?: { _type?: string; slug?: string } | null; leadType?: string; estimatedValue?: number; privacyNote?: string; consentCheckbox?: boolean;
};

const inputClass = "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

const autoComplete: Record<string, string> = { name: "name", email: "email", phone: "tel", company: "organization", website: "url" };

export const defaultContactForm: LeadFormDoc = {
  title: "Contact form",
  leadType: "enquiry",
  submitLabel: "Send message",
  fields: [
    { name: "name", label: "Name", type: "text", required: true, width: "half" },
    { name: "email", label: "Email", type: "email", required: true, width: "half" },
    { name: "phone", label: "Phone", type: "tel", width: "half" },
    { name: "service", label: "What do you need?", type: "select", width: "half", options: ["SEO", "Website", "Website + SEO", "E-commerce", "App", "AI automation", "Something else"] },
    { name: "message", label: "Tell us about your project", type: "textarea", required: true },
  ],
};

export default function LeadForm({ form, campaign, compact = false }: { form?: LeadFormDoc | null; campaign?: string; compact?: boolean }) {
  const config = form?.fields?.length ? form : defaultContactForm;
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const started = useRef<number | null>(null);

  function onStart() {
    if (started.current) return;
    started.current = Date.now();
    track("form_start", { form_name: config.title });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fields: Record<string, string | boolean> = {};
    for (const field of config.fields ?? []) {
      if (field.type === "checkbox") fields[field.name] = data.get(field.name) === "on";
      else fields[field.name] = String(data.get(field.name) ?? "");
    }
    if (config.consentCheckbox) fields.marketingConsent = data.get("marketingConsent") === "on";
    setStatus("sending");
    setError("");
    const result = await submitLead({ formName: config.title, leadType: config.leadType, value: config.estimatedValue, fields, startedAt: started.current ?? undefined, website: String(data.get("website") ?? ""), campaign });
    if (!result.ok) { setStatus("error"); setError(result.error ?? "Please try again."); return; }
    if (config.redirectPath?.slug) { navigate(pathForDoc(config.redirectPath)); return; }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-primary/30 bg-primary/10 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
        <p className="text-2xl font-bold text-white">{config.successTitle || "Thanks — we got your message"}</p>
        <p className="mt-2 text-muted-foreground">{config.successMessage || "We reply within one business day."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} onFocus={onStart} className={`relative rounded-3xl border border-white/10 bg-white/5 ${compact ? "p-5" : "p-6 md:p-10"}`} noValidate={false} aria-label={config.title}>
      <div className="grid gap-5 md:grid-cols-2">
        {(config.fields ?? []).map((field) => {
          const id = `${config._id ?? "form"}-${field.name}`;
          const common = { id, name: field.name, required: field.required, placeholder: field.placeholder, autoComplete: autoComplete[field.name], "aria-describedby": field.help ? `${id}-help` : undefined };
          const wide = field.width !== "half" || ["textarea", "radio"].includes(field.type ?? "");
          return (
            <div key={field._key ?? field.name} className={wide ? "md:col-span-2" : ""}>
              {field.type !== "checkbox" && <label htmlFor={id} className="mb-2 block text-sm font-medium text-white">{field.label}{field.required && <span className="text-primary"> *</span>}</label>}
              {field.type === "textarea" ? <textarea {...common} rows={5} className={`${inputClass} min-h-[140px]`} />
                : field.type === "select" ? <select {...common} defaultValue="" className={inputClass}><option value="" disabled>Choose one…</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>
                : field.type === "radio" ? <div className="flex flex-wrap gap-3" role="radiogroup">{(field.options ?? []).map((option) => <label key={option} className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm"><input type="radio" name={field.name} value={option} required={field.required} /> {option}</label>)}</div>
                : field.type === "checkbox" ? <label className="flex items-start gap-3 text-sm text-muted-foreground"><input type="checkbox" name={field.name} required={field.required} className="mt-1" /> {field.label}</label>
                : <input {...common} type={field.type || "text"} inputMode={field.type === "tel" ? "tel" : undefined} className={inputClass} />}
              {field.help && <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
            </div>
          );
        })}
      </div>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {config.consentCheckbox && <label className="mt-5 flex items-start gap-3 text-sm text-muted-foreground"><input type="checkbox" name="marketingConsent" className="mt-1" /> Send me occasional tips and offers. Unsubscribe any time.</label>}
      {error && <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-lg font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60">
        {status === "sending" ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Sending…</> : config.submitLabel || "Send enquiry"}
      </button>
      {config.privacyNote && <p className="mt-3 text-center text-xs text-muted-foreground">{config.privacyNote}</p>}
    </form>
  );
}
