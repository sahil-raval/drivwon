import type { Express, Request } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import path from "path";
import {
  businessDocuments,
  businessInvoices,
  documentInputSchema,
  driveFolderConnections,
  invoiceInputSchema,
  monthlyUpdates,
  projectInputSchema,
  updateInputSchema,
  workProjects,
} from "@shared/schema";
import { db } from "../db";
import { getDriveAccessToken, requireAdmin, requireDriveUser } from "./auth";

type SessionRequest = Request & { session: Request["session"] };

function requireDatabase(res: import("express").Response): boolean {
  if (!db) {
    res.status(503).json({ error: "The private workspace database is not configured." });
    return false;
  }
  return true;
}

function validationError(res: import("express").Response, error: unknown) {
  if (error && typeof error === "object" && "issues" in error) {
    return res.status(400).json({ error: "Please check the submitted fields.", details: (error as { issues: unknown }).issues });
  }
  throw error;
}

function safeFolderName(value: string) {
  return value.trim().replace(/[\\/<>:"|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").slice(0, 100) || "Project";
}

async function driveApi(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error?.message === "string" ? body.error.message : "Google Drive request failed.";
    throw Object.assign(new Error(message), { status: response.status === 401 ? 401 : 502 });
  }
  return body;
}

async function findOrCreateFolder(token: string, name: string, parentId: string) {
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = `'${parentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const search = new URL("https://www.googleapis.com/drive/v3/files");
  search.searchParams.set("q", query);
  search.searchParams.set("fields", "files(id,name)");
  search.searchParams.set("pageSize", "10");
  search.searchParams.set("supportsAllDrives", "true");
  search.searchParams.set("includeItemsFromAllDrives", "true");
  const found = await driveApi(token, search.toString());
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const created = await driveApi(token, "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  return created.id as string;
}

function publicUrl(fileId: string) {
  return `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;
}

export function registerWorkspaceRoutes(app: Express) {
  app.get("/api/workspace", requireAdmin, async (_req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const [projects, invoices, updates, documents] = await Promise.all([
        db!.select().from(workProjects).orderBy(desc(workProjects.createdAt)),
        db!.select().from(businessInvoices).orderBy(desc(businessInvoices.createdAt)),
        db!.select().from(monthlyUpdates).orderBy(desc(monthlyUpdates.period), desc(monthlyUpdates.createdAt)),
        db!.select().from(businessDocuments).orderBy(desc(businessDocuments.createdAt)),
      ]);
      const activeProjects = projects.filter((project) => project.status === "active");
      const openInvoices = invoices.filter((invoice) => invoice.status !== "paid");
      const totalOutstandingCents = openInvoices.reduce((total, invoice) => total + invoice.totalCents, 0);
      res.setHeader("Cache-Control", "no-store, private");
    const googleIdentity = (_req as SessionRequest).session?.workspaceUser;
    const identity = googleIdentity ?? { email: "Admin access", name: "Drivwon admin" };
    const [driveFolder] = googleIdentity?.email
      ? await db!.select().from(driveFolderConnections).where(eq(driveFolderConnections.email, identity.email)).limit(1)
      : [];
    res.json({
        user: identity,
        driveConnected: Boolean((_req as SessionRequest).session?.googleTokensEncrypted),
        driveConfigured: Boolean(driveFolder),
        driveFolderName: driveFolder?.folderName ?? null,
        projects,
        invoices,
        updates,
        documents,
        metrics: {
          activeProjects: activeProjects.length,
          averageProgress: activeProjects.length ? Math.round(activeProjects.reduce((sum, item) => sum + item.progress, 0) / activeProjects.length) : 0,
          openInvoices: openInvoices.length,
          totalOutstandingCents,
          documents: documents.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workspace/projects", requireAdmin, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const parsed = projectInputSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const [project] = await db!.insert(workProjects).values({
        ...parsed.data,
        clientEmail: parsed.data.clientEmail || null,
        startDate: parsed.data.startDate || null,
        dueDate: parsed.data.dueDate || null,
        notes: parsed.data.notes || null,
      }).returning();
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/workspace/projects/:id", requireAdmin, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const parsed = projectInputSchema.partial().safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const [project] = await db!.update(workProjects).set(parsed.data).where(eq(workProjects.id, req.params.id)).returning();
      if (!project) return res.status(404).json({ error: "Project not found." });
      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workspace/invoices", requireAdmin, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const parsed = invoiceInputSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const [invoice] = await db!.insert(businessInvoices).values({
        ...parsed.data,
        projectId: parsed.data.projectId || null,
        clientEmail: parsed.data.clientEmail || null,
        totalCents: parsed.data.subtotalCents + parsed.data.taxCents,
      }).returning();
      res.status(201).json(invoice);
    } catch (error: any) {
      if (error?.code === "23505") return res.status(409).json({ error: "That invoice number already exists." });
      next(error);
    }
  });

  app.patch("/api/workspace/invoices/:id/status", requireAdmin, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const status = req.body?.status;
      if (!["draft", "sent", "paid", "overdue"].includes(status)) return res.status(400).json({ error: "Invalid invoice status." });
      const [invoice] = await db!.update(businessInvoices).set({
        status,
        paidAt: status === "paid" ? new Date() : null,
      }).where(eq(businessInvoices.id, req.params.id)).returning();
      if (!invoice) return res.status(404).json({ error: "Invoice not found." });
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workspace/updates", requireAdmin, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const parsed = updateInputSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const [update] = await db!.insert(monthlyUpdates).values(parsed.data).returning();
      res.status(201).json(update);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workspace/files", requireDriveUser, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const email = req.session!.workspaceUser!.email;
      const [driveFolder] = await db!.select().from(driveFolderConnections).where(eq(driveFolderConnections.email, email)).limit(1);
      if (!driveFolder) return res.status(503).json({ error: "Connect the shared company folder from this Google account before uploading." });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: "Choose a file to upload." });
      const projectId = String(req.header("x-project-id") ?? "");
      const invoiceId = String(req.header("x-invoice-id") ?? "");
      const category = String(req.header("x-document-category") ?? "");
      const parsed = documentInputSchema.safeParse({ projectId, invoiceId, category });
      if (!parsed.success) return validationError(res, parsed.error);
      const [project] = await db!.select().from(workProjects).where(eq(workProjects.id, projectId)).limit(1);
      if (!project) return res.status(404).json({ error: "Project not found." });
      if (invoiceId) {
        const [invoice] = await db!.select().from(businessInvoices).where(and(eq(businessInvoices.id, invoiceId), eq(businessInvoices.projectId, projectId))).limit(1);
        if (!invoice) return res.status(400).json({ error: "The selected invoice does not belong to this project." });
      }

      let requestedName = String(req.header("x-file-name") ?? "upload");
      try { requestedName = decodeURIComponent(requestedName); } catch { /* Keep the original header if malformed. */ }
      const fileName = safeFolderName(path.basename(requestedName));
      const mimeType = (req.header("content-type") ?? "application/octet-stream").split(";")[0].trim().toLowerCase();
      const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/avif", "text/csv", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "video/mp4", "video/webm", "application/octet-stream"]);
      if (!allowedTypes.has(mimeType)) return res.status(415).json({ error: "File type is not supported. Use PDF, common images, CSV, Office documents, or MP4/WebM video." });
      if (req.body.length > 50 * 1024 * 1024) return res.status(413).json({ error: "Files must be 50 MB or smaller." });

      const token = await getDriveAccessToken(req);
      const projectFolder = await findOrCreateFolder(token, safeFolderName(project.name), driveFolder.folderId);
      const [invoice] = invoiceId
        ? await db!.select().from(businessInvoices).where(eq(businessInvoices.id, invoiceId)).limit(1)
        : [];
      const invoiceFolderName = invoice?.invoiceNumber || "Project Documents";
      const invoiceFolder = await findOrCreateFolder(token, safeFolderName(invoiceFolderName), projectFolder);

      const metadata = {
        name: fileName,
        mimeType,
        parents: [invoiceFolder],
        description: `Drivwon ${parsed.data.category} document · ${project.name}${invoice ? ` · ${invoice.invoiceNumber}` : ""}`,
      };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([Uint8Array.from(req.body).buffer as ArrayBuffer], { type: mimeType }), fileName);
      const driveFile = await driveApi(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink", { method: "POST", body: form });
      if (!driveFile.id) throw new Error("Google Drive did not return a file ID.");

      const [document] = await db!.insert(businessDocuments).values({
        projectId,
        invoiceId: invoiceId || null,
        category: parsed.data.category,
        fileName,
        mimeType,
        sizeBytes: req.body.length,
        driveFileId: driveFile.id,
        driveUrl: driveFile.webViewLink || publicUrl(driveFile.id),
        driveParentId: invoiceFolder,
        uploadedBy: email,
      }).returning();
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/workspace/drive/folder", requireDriveUser, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const [folder] = await db!.select().from(driveFolderConnections).where(eq(driveFolderConnections.email, req.session!.workspaceUser!.email)).limit(1);
      res.json(folder ?? null);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/workspace/drive/picker-token", requireDriveUser, async (req, res, next) => {
    try {
      const token = await getDriveAccessToken(req);
      res.setHeader("Cache-Control", "no-store, private");
      res.json({ accessToken: token });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/workspace/drive/folder", requireDriveUser, async (req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const folderId = typeof req.body?.folderId === "string" ? req.body.folderId.trim() : "";
      if (!folderId || folderId.length > 200) return res.status(400).json({ error: "Choose a valid shared Drive folder." });
      const token = await getDriveAccessToken(req);
      const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`);
      url.searchParams.set("fields", "id,name,mimeType,driveId,capabilities(canAddChildren)");
      url.searchParams.set("supportsAllDrives", "true");
      const folder = await driveApi(token, url.toString());
      if (folder.mimeType !== "application/vnd.google-apps.folder" || folder.capabilities?.canAddChildren !== true) {
        return res.status(403).json({ error: "Choose a folder where your team can add files." });
      }
      const email = req.session!.workspaceUser!.email;
      const [saved] = await db!.insert(driveFolderConnections).values({
        email,
        folderId: folder.id,
        folderName: folder.name,
        driveId: folder.driveId ?? null,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: driveFolderConnections.email,
        set: { folderId: folder.id, folderName: folder.name, driveId: folder.driveId ?? null, updatedAt: new Date() },
      }).returning();
      res.json(saved);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/workspace/analytics", requireAdmin, async (_req, res, next) => {
    try {
      if (!requireDatabase(res)) return;
      const [byService] = await db!.select({
        total: sql<number>`coalesce(sum(${businessInvoices.totalCents}) filter (where ${businessInvoices.status} = 'paid'), 0)::int`,
      }).from(businessInvoices);
      const [openInvoices] = await db!.select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${businessInvoices.totalCents}), 0)::int`,
      }).from(businessInvoices).where(sql`${businessInvoices.status} <> 'paid'`);
      res.setHeader("Cache-Control", "no-store, private");
      res.json({ paidRevenueCents: byService?.total ?? 0, openInvoiceCount: openInvoices?.count ?? 0, outstandingCents: openInvoices?.total ?? 0 });
    } catch (error) {
      next(error);
    }
  });
}
