import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const workProjects = pgTable("drivwon_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  service: text("service").notNull(),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  budgetCents: integer("budget_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessInvoices = pgTable("drivwon_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  projectId: varchar("project_id").references(() => workProjects.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  description: text("description").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("draft"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyUpdates = pgTable("drivwon_monthly_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => workProjects.id, { onDelete: "cascade" }).notNull(),
  channel: text("channel").notNull(),
  period: varchar("period", { length: 7 }).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  metrics: jsonb("metrics").$type<Record<string, string | number>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessDocuments = pgTable("drivwon_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => workProjects.id, { onDelete: "cascade" }).notNull(),
  invoiceId: varchar("invoice_id").references(() => businessInvoices.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  driveFileId: text("drive_file_id").notNull(),
  driveUrl: text("drive_url").notNull(),
  driveParentId: text("drive_parent_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(2).max(140),
  clientName: z.string().trim().min(2).max(140),
  clientEmail: z.string().email().optional().or(z.literal("")),
  service: z.enum(["SEO", "Social media", "Web development", "Branding", "Software", "Other"]),
  status: z.enum(["active", "paused", "complete"]).default("active"),
  progress: z.number().int().min(0).max(100).default(0),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  budgetCents: z.number().int().min(0).default(0),
  notes: z.string().max(4000).optional(),
});

export const invoiceInputSchema = z.object({
  invoiceNumber: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9-]+$/),
  projectId: z.string().optional().or(z.literal("")),
  clientName: z.string().trim().min(2).max(140),
  clientEmail: z.string().email().optional().or(z.literal("")),
  description: z.string().trim().min(2).max(1000),
  subtotalCents: z.number().int().min(0),
  taxCents: z.number().int().min(0),
  dueDate: z.string().date(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
});

export const updateInputSchema = z.object({
  projectId: z.string().min(1),
  channel: z.enum(["SEO", "Social media", "Web development", "Other"]),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(4000),
  metrics: z.record(z.string(), z.union([z.string().max(120), z.number()])),
});

export const documentInputSchema = z.object({
  projectId: z.string().min(1),
  invoiceId: z.string().optional().or(z.literal("")),
  category: z.enum(["invoice", "receipt", "SEO", "social media", "web development", "other"]),
});

export const userSessions = pgTable("drivwon_user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [index("drivwon_user_sessions_expire_idx").on(table.expire)]);

export const driveFolderConnections = pgTable("drivwon_drive_folders", {
  email: varchar("email").primaryKey(),
  folderId: text("folder_id").notNull(),
  folderName: text("folder_name").notNull(),
  driveId: text("drive_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
