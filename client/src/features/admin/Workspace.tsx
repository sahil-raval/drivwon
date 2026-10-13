import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, BadgeDollarSign, BriefcaseBusiness,
  Check, FileText, FolderOpen, HardDrive, KeyRound, LoaderCircle, LogOut, Plus, ShieldCheck,
  Upload, X,
} from "lucide-react";

type Project = {
  id: string; name: string; clientName: string; clientEmail?: string | null;
  service: string; status: "active" | "paused" | "complete"; progress: number;
  startDate?: string | null; dueDate?: string | null; budgetCents: number; notes?: string | null;
};
type Invoice = {
  id: string; invoiceNumber: string; projectId?: string | null; clientName: string;
  clientEmail?: string | null; description: string; subtotalCents: number; taxCents: number;
  totalCents: number; currency: string; dueDate: string; status: "draft" | "sent" | "paid" | "overdue"; paidAt?: string | null;
};
type Update = { id: string; projectId: string; channel: string; period: string; title: string; summary: string; metrics?: Record<string, string | number> };
type Document = { id: string; projectId: string; invoiceId?: string | null; category: string; fileName: string; mimeType: string; sizeBytes: number; driveUrl: string; createdAt: string };
type WorkspaceData = {
  user: { email: string; name: string; picture?: string };
  driveConnected: boolean;
  driveConfigured: boolean;
  driveFolderName: string | null;
  projects: Project[];
  invoices: Invoice[];
  updates: Update[];
  documents: Document[];
  metrics: { activeProjects: number; averageProgress: number; openInvoices: number; totalOutstandingCents: number; documents: number };
};
type AuthStatus = { configured: boolean; driveOAuthConfigured: boolean; driveConnected: boolean; user: WorkspaceData["user"] | null };

declare global {
  interface Window {
    gapi?: { load: (api: string, options: { callback: () => void }) => void };
    google?: { picker: any };
  }
}

const serviceOptions = ["SEO", "Social media", "Web development", "Branding", "Software", "Other"];
const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "projects", label: "Projects", icon: BriefcaseBusiness },
  { id: "invoices", label: "Invoices", icon: BadgeDollarSign },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "updates", label: "Monthly reports", icon: ArrowDownToLine },
] as const;
type TabId = typeof tabs[number]["id"];

const formatMoney = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
const formatDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { dateStyle: "medium" }) : "—";
const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
  return data as T;
}

function printDocument(invoice: Invoice, receipt = false) {
  const page = window.open("", "_blank", "width=900,height=720");
  if (!page) {
    window.alert("Allow pop-ups for this site to print invoices and receipts.");
    return;
  }
  const title = receipt ? `Receipt ${invoice.invoiceNumber}` : `Invoice ${invoice.invoiceNumber}`;
  const dateLabel = receipt ? `Paid ${invoice.paidAt ? formatDate(invoice.paidAt) : "date not recorded"}` : `Due ${formatDate(invoice.dueDate)}`;
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    *{box-sizing:border-box}body{font:15px/1.5 Arial,sans-serif;color:#14151a;margin:0;padding:56px}.top{display:flex;justify-content:space-between;gap:32px;border-bottom:2px solid #241b3b;padding-bottom:28px}.brand{font-size:28px;font-weight:700}.muted{color:#626572}.right{text-align:right}.pill{display:inline-block;padding:5px 10px;border-radius:999px;background:#f0ebf8;color:#56319a;font-size:12px;font-weight:bold;margin-top:8px}h1{font-size:32px;margin:36px 0 12px}h2{font-size:16px;margin:32px 0 10px}table{border-collapse:collapse;width:100%;margin-top:34px}th,td{text-align:left;padding:14px 12px;border-bottom:1px solid #dedee5}th{font-size:12px;text-transform:uppercase;color:#626572}.amount{text-align:right}.total{font-size:18px;font-weight:bold}.foot{margin-top:80px;border-top:1px solid #dedee5;padding-top:18px;color:#626572;font-size:12px}@media print{body{padding:25mm 20mm}}</style></head><body>
    <div class="top"><div><div class="brand">Drivwon</div><div class="muted">Geelong, Victoria, Australia<br>info@drivwon.com</div></div><div class="right"><div class="muted">${receipt ? "PAYMENT RECEIPT" : "INVOICE"}</div><h2>${esc(invoice.invoiceNumber)}</h2><div>${esc(dateLabel)}</div><span class="pill">${esc(invoice.status.toUpperCase())}</span></div></div>
    <h1>${esc(title)}</h1><h2>Bill to</h2><div>${esc(invoice.clientName)}${invoice.clientEmail ? `<br>${esc(invoice.clientEmail)}` : ""}</div>
    <table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody><tr><td>${esc(invoice.description)}</td><td class="amount">${formatMoney(invoice.subtotalCents)}</td></tr><tr><td>GST / tax</td><td class="amount">${formatMoney(invoice.taxCents)}</td></tr><tr><td class="total">Total ${receipt ? "paid" : "due"}</td><td class="amount total">${formatMoney(invoice.totalCents)}</td></tr></tbody></table>
    <div class="foot">This ${receipt ? "receipt confirms payment recorded by Drivwon" : "invoice was prepared by Drivwon"} in Australian dollars. Please contact info@drivwon.com if any details need correction.</div>
    <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250))</script></body></html>`);
  page.document.close();
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-start justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon size={18} className="text-primary" /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>;
}

function Workspace() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  async function refresh() {
    setError("");
    try {
      const status = await api<AuthStatus>("/api/auth/status");
      setAuth(status);
      if (status.user) {
        const workspace = await api<WorkspaceData>("/api/workspace");
        setData(workspace);
      } else {
        setData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the private workspace.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function save(url: string, body: unknown, onSuccess?: () => void) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onSuccess?.();
      setNotice("Saved successfully.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function updateInvoiceStatus(invoice: Invoice, status: Invoice["status"]) {
    setSaving(true);
    setError("");
    try {
      await api(`/api/workspace/invoices/${invoice.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      await refresh();
      setNotice(`Invoice ${invoice.invoiceNumber} marked ${status}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      setData(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out.");
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setSaving(false);
    }
  }

  const projectName = useMemo(() => new Map((data?.projects ?? []).map((project) => [project.id, project.name])), [data?.projects]);
  const invoiceNumber = useMemo(() => new Map((data?.invoices ?? []).map((invoice) => [invoice.id, invoice.invoiceNumber])), [data?.invoices]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white"><LoaderCircle className="animate-spin" /></div>;

  if (!auth?.user) return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-5 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.035] p-8 md:p-10">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary"><ShieldCheck /></div>
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Private team area</p>
        <h1 className="mt-3 text-3xl font-bold">Drivwon workspace</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">This private area is not linked from the public site. Enter the team password to continue.</p>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {auth?.configured ? (
          <form onSubmit={signIn} className="mt-7 space-y-3">
            <label className="block text-sm font-medium" htmlFor="workspace-password">Admin password</label>
            <input id="workspace-password" name="password" type="password" autoComplete="current-password" required minLength={16} maxLength={512} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-primary" />
            <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black transition-colors hover:bg-white/85 disabled:opacity-60"><KeyRound size={17} /> {saving ? "Checking…" : "Open private workspace"}</button>
            <p className="text-xs text-muted-foreground">After signing in, connect an allowlisted Google account separately to use Drive.</p>
          </form>
        ) : (
          <div className="mt-7 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground"><strong className="text-white">Not configured yet.</strong><p className="mt-2">Set DRIVWON_ADMIN_PASSWORD (at least 16 characters), SESSION_SECRET and the database in server Secrets, then run the database migration. Access remains disabled until all are configured.</p></div>
        )}
        <a href="/" className="mt-6 inline-block text-sm text-muted-foreground hover:text-white">← Back to Drivwon</a>
      </section>
    </main>
  );

  if (!data) return <main className="min-h-screen bg-[#09090b] p-8 text-white"><p role="alert" className="text-red-200">{error || "The workspace could not load."}</p><button className="mt-4 underline" onClick={() => void refresh()}>Try again</button></main>;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary"><Activity size={19} /></div><div><p className="font-semibold">Drivwon workspace</p><p className="text-xs text-muted-foreground">Private operations</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{data.user.name}</p><p className="text-xs text-muted-foreground">{data.user.email}</p></div><button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground hover:text-white"><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></button></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-4 py-7 md:px-8">
        {(error || notice) && <div role={error ? "alert" : "status"} className={`mb-5 flex items-start justify-between gap-4 rounded-xl border p-3 text-sm ${error ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"}`}><span>{error || notice}</span><button aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}><X size={16} /></button></div>}
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">Operations</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold md:text-4xl">Good work, {data.user.name.split(" ")[0]}.</h1><p className="mt-1 text-muted-foreground">The latest status across Drivwon projects and accounts.</p></div><div className={`rounded-full border px-3 py-1.5 text-xs ${data.driveConfigured ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>{data.driveConfigured ? `Drive: ${data.driveFolderName}` : "Drive setup needed"}</div></div>
        </div>

        <nav className="mb-7 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[.025] p-1" aria-label="Workspace sections">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors ${tab === id ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}><Icon size={16} />{label}</button>)}
        </nav>

        {tab === "overview" && <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BriefcaseBusiness} label="Active projects" value={`${data.metrics.activeProjects}`} detail={`${data.metrics.averageProgress}% average completion`} />
            <MetricCard icon={Activity} label="Average progress" value={`${data.metrics.averageProgress}%`} detail="Across active client work" />
            <MetricCard icon={BadgeDollarSign} label="Unpaid invoices" value={`${data.metrics.openInvoices}`} detail={`${formatMoney(data.metrics.totalOutstandingCents)} outstanding`} />
            <MetricCard icon={FolderOpen} label="Drive documents" value={`${data.metrics.documents}`} detail="Grouped under project and invoice" />
          </div>
          <div className="mt-7 grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Project progress</h2><button onClick={() => setTab("projects")} className="text-sm text-primary">All projects <ArrowUpRight size={14} className="inline" /></button></div>
              {data.projects.length ? <div className="space-y-5">{data.projects.slice(0, 5).map((project) => <div key={project.id}><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{project.name}</span><span className="shrink-0 text-muted-foreground">{project.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{project.clientName} · {project.service} · due {formatDate(project.dueDate)}</p></div>)}</div> : <Empty label="No projects yet" action="Add a project" onClick={() => setShowProjectForm(true)} />}
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent invoices</h2><button onClick={() => setTab("invoices")} className="text-sm text-primary">All invoices <ArrowUpRight size={14} className="inline" /></button></div>
              {data.invoices.length ? <div className="space-y-3">{data.invoices.slice(0, 5).map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0"><div><p className="font-medium">{invoice.invoiceNumber} <span className="ml-1 text-xs text-muted-foreground">{invoice.clientName}</span></p><p className="mt-1 text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</p></div><div className="text-right"><p>{formatMoney(invoice.totalCents)}</p><Status status={invoice.status} /></div></div>)}</div> : <Empty label="No invoices yet" action="Create an invoice" onClick={() => setShowInvoiceForm(true)} />}
            </section>
          </div>
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5"><h2 className="mb-4 text-lg font-semibold">Latest monthly updates</h2>{data.updates.length ? <div className="grid gap-3 md:grid-cols-2">{data.updates.slice(0, 4).map((update) => <article key={update.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-3"><span className="text-xs uppercase tracking-wider text-primary">{update.channel} · {update.period}</span><span className="text-xs text-muted-foreground">{projectName.get(update.projectId) ?? "Project"}</span></div><h3 className="mt-2 font-medium">{update.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{update.summary}</p></article>)}</div> : <p className="text-sm text-muted-foreground">No monthly reports have been recorded yet.</p>}</section>
        </section>}

        {tab === "projects" && <section className="rounded-2xl border border-white/10 bg-white/[.025]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><h2 className="text-lg font-semibold">Client projects</h2><p className="mt-1 text-sm text-muted-foreground">Track deliverables, project dates and progress.</p></div><button onClick={() => setShowProjectForm((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold"><Plus size={16} /> New project</button></div>
          {showProjectForm && <ProjectForm busy={saving} onCancel={() => setShowProjectForm(false)} onSubmit={(body) => save("/api/workspace/projects", body, () => setShowProjectForm(false))} />}
          {data.projects.length ? <div className="divide-y divide-white/5">{data.projects.map((project) => <ProjectRow key={project.id} project={project} onSave={(body) => api(`/api/workspace/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(refresh)} />)}</div> : <Empty label="Start by adding a project." action="Add a project" onClick={() => setShowProjectForm(true)} />}
        </section>}

        {tab === "invoices" && <section className="rounded-2xl border border-white/10 bg-white/[.025]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><h2 className="text-lg font-semibold">Invoices & receipts</h2><p className="mt-1 text-sm text-muted-foreground">Amounts are in AUD. Print or save a PDF from your browser.</p></div><button onClick={() => setShowInvoiceForm((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold"><Plus size={16} /> New invoice</button></div>
          {showInvoiceForm && <InvoiceForm projects={data.projects} busy={saving} onCancel={() => setShowInvoiceForm(false)} onSubmit={(body) => save("/api/workspace/invoices", body, () => setShowInvoiceForm(false))} />}
          {data.invoices.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Client / project</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{data.invoices.map((invoice) => <tr key={invoice.id}><td className="px-5 py-4 font-medium">{invoice.invoiceNumber}<p className="mt-1 text-xs font-normal text-muted-foreground">{invoice.description}</p></td><td className="px-5 py-4">{invoice.clientName}<p className="mt-1 text-xs text-muted-foreground">{projectName.get(invoice.projectId ?? "") ?? "No project linked"}</p></td><td className="px-5 py-4 text-muted-foreground">{formatDate(invoice.dueDate)}</td><td className="px-5 py-4">{formatMoney(invoice.totalCents)}</td><td className="px-5 py-4"><Status status={invoice.status} /></td><td className="px-5 py-4"><div className="flex items-center gap-2"><button onClick={() => printDocument(invoice, false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Print</button>{invoice.status === "paid" ? <button onClick={() => printDocument(invoice, true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10">Receipt</button> : <button disabled={saving} onClick={() => void updateInvoiceStatus(invoice, "paid")} className="rounded-lg border border-emerald-300/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-300/10">Mark paid</button>}</div></td></tr>)}</tbody></table></div> : <Empty label="No invoices yet." action="Create an invoice" onClick={() => setShowInvoiceForm(true)} />}
        </section>}

        {tab === "documents" && <section className="rounded-2xl border border-white/10 bg-white/[.025]">
          <div className="border-b border-white/10 p-5"><h2 className="text-lg font-semibold">Project documents</h2><p className="mt-1 text-sm text-muted-foreground">Uploaded files go to the configured Google Drive folder, under project and invoice folders.</p></div>
          {!data.driveConnected ? (
            <div className="m-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-muted-foreground">Google Drive is a separate connection used only for file storage.</p>
              {auth?.driveOAuthConfigured ? <a href="/api/auth/google" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black"><HardDrive size={16} /> Connect Google Drive</a> : <p className="mt-3 text-xs text-amber-100">Drive OAuth is not configured yet. Add the Google OAuth values and approved team email allowlist in server Secrets.</p>}
            </div>
          ) : <>
            <DriveFolderPicker currentName={data.driveFolderName} onError={setError} onConnected={refresh} />
            <FileUpload projects={data.projects} invoices={data.invoices} driveReady={data.driveConfigured} onUploaded={refresh} onError={setError} />
          </>}
          {data.documents.length ? <div className="divide-y divide-white/5">{data.documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><FileText size={18} className="shrink-0 text-primary" /><div className="min-w-0"><a className="truncate font-medium hover:text-primary" href={document.driveUrl} target="_blank" rel="noreferrer">{document.fileName}</a><p className="mt-1 text-xs text-muted-foreground">{projectName.get(document.projectId) ?? "Project"} · {invoiceNumber.get(document.invoiceId ?? "") ?? document.category} · {(document.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div></div><a href={document.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">Open in Drive <ArrowUpRight size={14} /></a></div>)}</div> : <p className="px-5 py-8 text-sm text-muted-foreground">No documents uploaded yet.</p>}
        </section>}

        {tab === "updates" && <section className="rounded-2xl border border-white/10 bg-white/[.025]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5"><div><h2 className="text-lg font-semibold">Monthly service reports</h2><p className="mt-1 text-sm text-muted-foreground">Keep SEO, social media and web development progress tied to each client project.</p></div><button onClick={() => setShowUpdateForm((open) => !open)} disabled={!data.projects.length} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus size={16} /> Add report</button></div>
          {showUpdateForm && <UpdateForm projects={data.projects} busy={saving} onCancel={() => setShowUpdateForm(false)} onSubmit={(body) => save("/api/workspace/updates", body, () => setShowUpdateForm(false))} />}
          {data.updates.length ? <div className="divide-y divide-white/5">{data.updates.map((update) => <article key={update.id} className="p-5"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-widest text-primary">{update.channel} · {update.period}</span><span className="text-xs text-muted-foreground">{projectName.get(update.projectId) ?? "Project"}</span></div><h3 className="mt-2 text-lg font-semibold">{update.title}</h3><p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{update.summary}</p>{Object.keys(update.metrics ?? {}).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(update.metrics ?? {}).map(([key, value]) => <span key={key} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs">{key}: <strong>{value}</strong></span>)}</div>}</article>)}</div> : <p className="px-5 py-8 text-sm text-muted-foreground">No reports recorded yet.</p>}
        </section>}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-muted-foreground"><span>Private workspace · access is logged in the server session</span><a href="/" className="hover:text-white">Visit public site ↗</a></footer>
      </div>

      {showProjectForm && tab === "overview" && <Modal title="New project" onClose={() => setShowProjectForm(false)}><ProjectForm busy={saving} onCancel={() => setShowProjectForm(false)} onSubmit={(body) => save("/api/workspace/projects", body, () => setShowProjectForm(false))} /></Modal>}
      {showInvoiceForm && tab === "overview" && <Modal title="New invoice" onClose={() => setShowInvoiceForm(false)}><InvoiceForm projects={data.projects} busy={saving} onCancel={() => setShowInvoiceForm(false)} onSubmit={(body) => save("/api/workspace/invoices", body, () => setShowInvoiceForm(false))} /></Modal>}
    </main>
  );
}

function Status({ status }: { status: string }) {
  const palette: Record<string, string> = { paid: "bg-emerald-300/10 text-emerald-200", complete: "bg-emerald-300/10 text-emerald-200", active: "bg-sky-300/10 text-sky-200", sent: "bg-sky-300/10 text-sky-200", paused: "bg-amber-300/10 text-amber-100", overdue: "bg-red-300/10 text-red-200", draft: "bg-white/10 text-muted-foreground" };
  return <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${palette[status] ?? "bg-white/10 text-muted-foreground"}`}>{status}</span>;
}

function Empty({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return <div className="p-8 text-center"><p className="text-sm text-muted-foreground">{label}</p><button onClick={onClick} className="mt-4 text-sm font-medium text-primary hover:underline">{action}</button></div>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "md:col-span-2" : ""}`}><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

const fieldClass = "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-primary";
const inputClass = ` ${fieldClass}`;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111116] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><h2 className="font-semibold">{title}</h2><button aria-label="Close form" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}

function ProjectForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (value: unknown) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      name: String(form.get("name")),
      clientName: String(form.get("clientName")),
      clientEmail: String(form.get("clientEmail")),
      service: String(form.get("service")),
      status: String(form.get("status")),
      progress: Number(form.get("progress")),
      startDate: String(form.get("startDate") ?? ""),
      dueDate: String(form.get("dueDate") ?? ""),
      budgetCents: Math.round(Number(form.get("budget") || 0) * 100),
      notes: String(form.get("notes") ?? ""),
    });
  }
  return <form onSubmit={submit} className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-2">
    <Field label="Project name"><input required name="name" className={inputClass} placeholder="Website redesign" /></Field>
    <Field label="Client name"><input required name="clientName" className={inputClass} placeholder="Client or company" /></Field>
    <Field label="Client email"><input type="email" name="clientEmail" className={inputClass} placeholder="name@example.com" /></Field>
    <Field label="Service"><select name="service" className={inputClass}>{serviceOptions.map((service) => <option key={service}>{service}</option>)}</select></Field>
    <Field label="Status"><select name="status" className={inputClass}><option value="active">Active</option><option value="paused">Paused</option><option value="complete">Complete</option></select></Field>
    <Field label="Progress"><div className="flex items-center gap-2"><input type="range" name="progress" min="0" max="100" defaultValue="0" className="w-full accent-violet-500" /><span className="text-xs text-muted-foreground">0–100%</span></div></Field>
    <Field label="Start date"><input type="date" name="startDate" className={inputClass} /></Field>
    <Field label="Due date"><input type="date" name="dueDate" className={inputClass} /></Field>
    <Field label="Project budget (AUD)"><input type="number" min="0" step="0.01" name="budget" className={inputClass} placeholder="0.00" /></Field>
    <Field label="Internal notes" wide><textarea name="notes" rows={3} className={inputClass} placeholder="Internal-only context for the team" /></Field>
    <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Saving…" : "Save project"}</button></div>
  </form>;
}

function ProjectRow({ project, onSave }: { project: Project; onSave: (value: unknown) => Promise<void> }) {
  const [progress, setProgress] = useState(project.progress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update() {
    setBusy(true); setError("");
    try { await onSave({ progress }); } catch (e) { setError(e instanceof Error ? e.message : "Could not update project."); }
    finally { setBusy(false); }
  }
  return <article className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{project.name}</h3><Status status={project.status} /></div><p className="mt-1 text-sm text-muted-foreground">{project.clientName}{project.clientEmail ? ` · ${project.clientEmail}` : ""} · {project.service}</p><p className="mt-1 text-xs text-muted-foreground">Budget {formatMoney(project.budgetCents)} · due {formatDate(project.dueDate)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div>{error && <p className="mt-2 text-xs text-red-200">{error}</p>}</div><div className="flex items-center gap-2"><label className="text-xs text-muted-foreground">Progress <input aria-label={`${project.name} progress`} type="number" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="ml-2 w-16 rounded border border-white/10 bg-black/20 p-1.5 text-center text-white" /></label><button disabled={busy || progress === project.progress} onClick={() => void update()} title="Save progress" className="rounded-lg border border-white/10 p-2 text-sm disabled:opacity-40"><Check size={16} /></button></div></article>;
}

function InvoiceForm({ projects, busy, onCancel, onSubmit }: { projects: Project[]; busy: boolean; onCancel: () => void; onSubmit: (value: unknown) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subtotalCents = Math.round(Number(form.get("subtotal")) * 100);
    const taxCents = Math.round(Number(form.get("tax")) * 100);
    onSubmit({
      invoiceNumber: String(form.get("invoiceNumber")),
      projectId: String(form.get("projectId") ?? ""),
      clientName: String(form.get("clientName")),
      clientEmail: String(form.get("clientEmail") ?? ""),
      description: String(form.get("description")),
      subtotalCents,
      taxCents,
      dueDate: String(form.get("dueDate")),
      status: String(form.get("status")),
    });
  }
  return <form onSubmit={submit} className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-2">
    <Field label="Invoice number"><input required name="invoiceNumber" className={inputClass} placeholder="DW-2026-001" /></Field>
    <Field label="Project"><select name="projectId" className={inputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
    <Field label="Client name"><input required name="clientName" className={inputClass} /></Field>
    <Field label="Client email"><input type="email" name="clientEmail" className={inputClass} /></Field>
    <Field label="Line item description" wide><input required name="description" className={inputClass} placeholder="Monthly SEO services" /></Field>
    <Field label="Subtotal (AUD)"><input required type="number" min="0" step="0.01" name="subtotal" className={inputClass} /></Field>
    <Field label="GST / tax (AUD)"><input type="number" min="0" step="0.01" name="tax" defaultValue="0" className={inputClass} /></Field>
    <Field label="Due date"><input required type="date" name="dueDate" className={inputClass} /></Field>
    <Field label="Initial status"><select name="status" className={inputClass}><option value="draft">Draft</option><option value="sent">Sent</option></select></Field>
    <p className="text-xs text-muted-foreground md:col-span-2">Tax is entered manually. Confirm the correct GST treatment with your accountant before issuing an invoice.</p>
    <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Saving…" : "Create invoice"}</button></div>
  </form>;
}

function UpdateForm({ projects, busy, onCancel, onSubmit }: { projects: Project[]; busy: boolean; onCancel: () => void; onSubmit: (value: unknown) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const metrics: Record<string, number> = {};
    const metricName = String(form.get("metricName") ?? "").trim();
    const metricValue = Number(form.get("metricValue"));
    if (metricName && Number.isFinite(metricValue)) metrics[metricName] = metricValue;
    onSubmit({ projectId: String(form.get("projectId")), channel: String(form.get("channel")), period: String(form.get("period")), title: String(form.get("title")), summary: String(form.get("summary")), metrics });
  }
  const currentMonth = new Date().toISOString().slice(0, 7);
  return <form onSubmit={submit} className="grid gap-4 border-b border-white/10 p-5 md:grid-cols-2">
    <Field label="Project"><select required name="projectId" className={inputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name} — {project.clientName}</option>)}</select></Field>
    <Field label="Service area"><select name="channel" className={inputClass}><option>SEO</option><option>Social media</option><option>Web development</option><option>Other</option></select></Field>
    <Field label="Report month"><input required type="month" name="period" defaultValue={currentMonth} className={inputClass} /></Field>
    <Field label="Report title"><input required name="title" className={inputClass} placeholder="September performance" /></Field>
    <Field label="Summary" wide><textarea required name="summary" rows={4} className={inputClass} placeholder="Work completed, blockers and next steps" /></Field>
    <Field label="One metric name (optional)"><input name="metricName" className={inputClass} placeholder="Organic clicks" /></Field>
    <Field label="Metric value"><input type="number" name="metricValue" className={inputClass} placeholder="0" /></Field>
    <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Saving…" : "Save report"}</button></div>
  </form>;
}

let googlePickerScript: Promise<void> | null = null;

function loadGooglePickerScript() {
  if (window.gapi?.load) return Promise.resolve();
  if (!googlePickerScript) {
    googlePickerScript = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-picker="true"]');
      const script = existing ?? document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.dataset.googlePicker = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Drive Picker could not be loaded."));
      if (!existing) document.head.appendChild(script);
    });
  }
  return googlePickerScript;
}

function DriveFolderPicker({ currentName, onError, onConnected }: { currentName: string | null; onError: (message: string) => void; onConnected: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY as string | undefined;

  async function chooseFolder() {
    setBusy(true);
    onError("");
    try {
      if (!apiKey) throw new Error("Set VITE_GOOGLE_PICKER_API_KEY and enable the Google Picker API to connect Drive.");
      const { accessToken } = await api<{ accessToken: string }>("/api/workspace/drive/picker-token");
      await loadGooglePickerScript();
      if (!window.gapi?.load || !window.google?.picker) throw new Error("Google Drive Picker did not initialize. Try again.");
      window.gapi.load("picker", {
        callback: () => {
          const pickerApi = window.google!.picker;
          const view = new pickerApi.DocsView(pickerApi.ViewId.FOLDERS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setMimeTypes("application/vnd.google-apps.folder");
          const picker = new pickerApi.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(apiKey)
            .setOrigin(window.location.origin)
            .enableFeature(pickerApi.Feature.SUPPORT_DRIVES)
            .setCallback(async (data: any) => {
              if (data.action === pickerApi.Action.CANCEL) setBusy(false);
              if (data.action !== pickerApi.Action.PICKED) return;
              try {
                const selected = data.docs?.[0];
                if (!selected?.id) throw new Error("Choose a folder to connect.");
                await api("/api/workspace/drive/folder", { method: "PUT", body: JSON.stringify({ folderId: selected.id }) });
                await onConnected();
              } catch (error) {
                onError(error instanceof Error ? error.message : "Could not connect that Drive folder.");
              } finally {
                setBusy(false);
              }
            })
            .build();
          picker.setVisible(true);
        },
      });
    } catch (error) {
      setBusy(false);
      onError(error instanceof Error ? error.message : "Could not open Google Drive Picker.");
    }
  }

  return <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[.015] p-5 sm:flex-row sm:items-center sm:justify-between">
    <div><p className="text-sm font-medium">{currentName ? `Connected folder: ${currentName}` : "Connect a shared Google Drive folder"}</p><p className="mt-1 text-xs text-muted-foreground">Select the company folder. Each approved team member connects it once from their own Workspace account.</p></div>
    <button type="button" disabled={busy} onClick={() => void chooseFolder()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <FolderOpen size={15} />}{busy ? "Opening Drive…" : currentName ? "Change folder" : "Connect Drive"}</button>
  </div>;
}

function FileUpload({ projects, invoices, driveReady, onUploaded, onError }: { projects: Project[]; invoices: Invoice[]; driveReady: boolean; onUploaded: () => Promise<void>; onError: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [invoiceId, setInvoiceId] = useState("");
  const [category, setCategory] = useState("other");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const projectInvoices = invoices.filter((invoice) => invoice.projectId === projectId);
  useEffect(() => { if (!projects.some((project) => project.id === projectId)) setProjectId(projects[0]?.id ?? ""); }, [projects, projectId]);

  async function upload() {
    if (!file || !projectId) return;
    setBusy(true); setMessage(""); onError("");
    try {
      const response = await fetch("/api/workspace/files", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-project-id": projectId,
          "x-invoice-id": invoiceId,
          "x-document-category": category,
          "x-file-name": encodeURIComponent(file.name),
        },
        body: await file.arrayBuffer(),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Upload failed (${response.status}).`);
      setMessage("Uploaded to Google Drive and linked to the selected project.");
      setFile(null);
      await onUploaded();
    } catch (e) {
      onError(e instanceof Error ? e.message : "File upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-3 border-b border-white/10 p-5 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
    <Field label="Project"><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setInvoiceId(""); }} className={inputClass}><option value="">Choose…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
    <Field label="Invoice folder"><select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className={inputClass}><option value="">Project documents</option>{projectInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber}</option>)}</select></Field>
    <Field label="Document category"><select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="other">Other</option><option value="invoice">Invoice</option><option value="receipt">Receipt</option><option value="SEO">SEO</option><option value="social media">Social media</option><option value="web development">Web development</option></select></Field>
    <Field label="File"><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white" /></Field>
    <button disabled={!file || !projectId || !driveReady || busy} onClick={() => void upload()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />} Upload</button>
    {!driveReady && <p className="text-xs text-amber-100 md:col-span-5">Drive uploads are disabled until you connect a shared Drive folder above. Files are not stored in this app as a fallback.</p>}
    {message && <p role="status" className="text-xs text-emerald-200 md:col-span-5">{message}</p>}
    {file && <p className="text-xs text-muted-foreground md:col-span-5">Selected: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB (maximum 50 MB)</p>}
  </div>;
}

export default Workspace;
