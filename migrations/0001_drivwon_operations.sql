CREATE TABLE IF NOT EXISTS "drivwon_projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "client_name" text NOT NULL,
  "client_email" text,
  "service" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "progress" integer NOT NULL DEFAULT 0,
  "start_date" date,
  "due_date" date,
  "budget_cents" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "drivwon_invoices" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_number" text NOT NULL UNIQUE,
  "project_id" varchar REFERENCES "drivwon_projects"("id") ON DELETE SET NULL,
  "client_name" text NOT NULL,
  "client_email" text,
  "description" text NOT NULL,
  "subtotal_cents" integer NOT NULL,
  "tax_cents" integer NOT NULL DEFAULT 0,
  "total_cents" integer NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'AUD',
  "due_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "paid_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "drivwon_monthly_updates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "drivwon_projects"("id") ON DELETE CASCADE,
  "channel" text NOT NULL,
  "period" varchar(7) NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "metrics" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "drivwon_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL REFERENCES "drivwon_projects"("id") ON DELETE CASCADE,
  "invoice_id" varchar REFERENCES "drivwon_invoices"("id") ON DELETE SET NULL,
  "category" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "drive_file_id" text NOT NULL,
  "drive_url" text NOT NULL,
  "drive_parent_id" text NOT NULL,
  "uploaded_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "drivwon_user_sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" jsonb NOT NULL,
  "expire" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "drivwon_drive_folders" (
  "email" varchar PRIMARY KEY,
  "folder_id" text NOT NULL,
  "folder_name" text NOT NULL,
  "drive_id" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "drivwon_projects_status_idx" ON "drivwon_projects" ("status");
CREATE INDEX IF NOT EXISTS "drivwon_invoices_due_date_idx" ON "drivwon_invoices" ("due_date");
CREATE INDEX IF NOT EXISTS "drivwon_documents_project_idx" ON "drivwon_documents" ("project_id");
CREATE INDEX IF NOT EXISTS "drivwon_updates_project_period_idx" ON "drivwon_monthly_updates" ("project_id", "period");
CREATE INDEX IF NOT EXISTS "drivwon_user_sessions_expire_idx" ON "drivwon_user_sessions" ("expire");
