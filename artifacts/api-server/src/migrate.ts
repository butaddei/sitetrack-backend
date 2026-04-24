import { pool } from "@workspace/db";
import { logger } from "./lib/logger";

const SQL = `
-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('admin', 'employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('pending', 'in_progress', 'completed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan AS ENUM ('free', 'pro', 'business');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('active', 'inactive', 'trialing', 'past_due', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#f97316',
  secondary_color TEXT NOT NULL DEFAULT '#0f172a',
  business_abn TEXT,
  business_email TEXT,
  business_address TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan plan NOT NULL DEFAULT 'free',
  plan_status plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role role NOT NULL DEFAULT 'employee',
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  position TEXT,
  start_date TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  abn TEXT,
  business_address TEXT,
  bank_name TEXT,
  account_name TEXT,
  bsb TEXT,
  account_number TEXT,
  invoice_notes TEXT,
  invoice_prefix TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date TEXT,
  expected_end_date TEXT,
  status project_status NOT NULL DEFAULT 'pending',
  paint_colors TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_assignments (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_minutes INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_items_json TEXT,
  payment_terms TEXT NOT NULL DEFAULT 'on_receipt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("Running database migrations...");
    await client.query(SQL);
    logger.info("Database migrations complete.");
  } catch (err) {
    logger.error({ err }, "Database migration failed");
    throw err;
  } finally {
    client.release();
  }
}
