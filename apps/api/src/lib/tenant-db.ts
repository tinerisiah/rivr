import type { Request } from "express";
import { db } from "../db";

export interface TenantContext {
  tenant?: string;
  businessId?: number;
}

export function getTenantContextFromRequest(req: Request): TenantContext {
  // Prefer explicit middleware-populated values; fall back to JWT tenantId when available
  const tokenTenantId = (req as any).user?.tenantId as number | undefined;
  const requestBusinessId = (req as any).businessId as number | undefined;
  return {
    tenant: (req as any).tenant as string | undefined,
    businessId:
      typeof requestBusinessId === "number" ? requestBusinessId : tokenTenantId,
  };
}

/**
 * Temporary passthrough to the shared Drizzle instance while we evolve to
 * schema-based isolation. The returned object carries tenant context so
 * callers can enforce scoping at the storage/query level.
 */
export function getTenantDb(req: Request): {
  db: typeof db;
  context: TenantContext;
} {
  return {
    db,
    context: getTenantContextFromRequest(req),
  };
}

/**
 * Run a function within a tenant-scoped transaction by setting search_path.
 * For Neon HTTP, transactions are supported; `SET LOCAL` applies to the tx.
 */
export async function withTenantDb<T>(
  req: Request,
  fn: (tx: typeof db, context: TenantContext) => Promise<T>
): Promise<T> {
  const context = getTenantContextFromRequest(req);
  if (!context.tenant) {
    return fn(db, context);
  }

  // For Neon HTTP (no tx) vs serverless WS (tx supported): try tx, fall back to direct SET
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(`SET LOCAL search_path TO ${context.tenant}`);
      return fn(tx as unknown as typeof db, context);
    });
  } catch (e) {
    // Fallback path when transactions are not supported
    await db.execute(`SET search_path TO ${context.tenant}`);
    return fn(db, context);
  }
}

// Minimal provisioning helper to create a per-tenant schema with core tables
export async function provisionTenantSchema(schemaName: string): Promise<void> {
  // Create schema
  await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);

  // Core tables (aligned with scripts/create-tenant-schema.ts)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.customers (
      id serial PRIMARY KEY,
      first_name text NOT NULL,
      last_name text NOT NULL,
      email text NOT NULL,
      phone text,
      business_name text NOT NULL,
      address text NOT NULL,
      password text,
      access_token text,
      email_updates_enabled boolean DEFAULT false NOT NULL,
      custom_signature text,
      custom_logo text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);
  // Ensure columns exist on legacy tables
  await db.execute(
    `ALTER TABLE ${schemaName}.customers 
       ADD COLUMN IF NOT EXISTS email_updates_enabled boolean DEFAULT false NOT NULL,
       ADD COLUMN IF NOT EXISTS custom_signature text,
       ADD COLUMN IF NOT EXISTS custom_logo text,
       ADD COLUMN IF NOT EXISTS password text;
    `
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.pickup_requests (
      id serial PRIMARY KEY,
      customer_id integer REFERENCES ${schemaName}.customers(id) NOT NULL,
      first_name text NOT NULL,
      last_name text NOT NULL,
      email text NOT NULL,
      phone text,
      business_name text NOT NULL,
      address text NOT NULL,
      wheel_count integer DEFAULT 1 NOT NULL,
      latitude text,
      longitude text,
      is_completed boolean DEFAULT false NOT NULL,
      completed_at timestamp,
      completion_photo text,
      completion_location text,
      completion_notes text,
      employee_name text,
      ro_number text,
      customer_notes text,
      wheel_qr_codes text[],
      is_delivered boolean DEFAULT false NOT NULL,
      delivered_at timestamp,
      delivery_notes text,
      delivery_qr_codes text[],
      is_archived boolean DEFAULT false NOT NULL,
      archived_at timestamp,
      route_id integer,
      route_order integer,
      priority text DEFAULT 'normal',
      estimated_pickup_time timestamp,
      production_status text DEFAULT 'pending',
      billed_at timestamp,
      billed_amount text,
      invoice_number text,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `);

  // Ensure new timeline columns exist on legacy pickup_requests tables
  await db.execute(
    `ALTER TABLE ${schemaName}.pickup_requests 
       ADD COLUMN IF NOT EXISTS in_process_at timestamp,
       ADD COLUMN IF NOT EXISTS ready_for_delivery_at timestamp,
       ADD COLUMN IF NOT EXISTS ready_to_bill_at timestamp,
       ADD COLUMN IF NOT EXISTS delivery_photo text;`
  );

  // Quote requests table to support admin quote management
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.quote_requests (
      id serial PRIMARY KEY,
      first_name text NOT NULL,
      last_name text NOT NULL,
      email text NOT NULL,
      phone text,
      business_name text NOT NULL,
      description text NOT NULL,
      photos text[],
      created_at timestamp DEFAULT now() NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.drivers (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text,
      phone text,
      license_number text,
      pin text,
      password text,
      status text DEFAULT 'available' NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      current_latitude text,
      current_longitude text,
      created_at timestamp DEFAULT now() NOT NULL
    );
  `);
  // Ensure columns exist on legacy tables
  await db.execute(
    `ALTER TABLE ${schemaName}.drivers 
       ADD COLUMN IF NOT EXISTS license_number text,
       ADD COLUMN IF NOT EXISTS pin text,
       ADD COLUMN IF NOT EXISTS password text,
       ADD COLUMN IF NOT EXISTS status text DEFAULT 'available' NOT NULL,
       ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;
    `
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.routes (
      id serial PRIMARY KEY,
      name text NOT NULL,
      driver_id integer,
      status text DEFAULT 'pending' NOT NULL,
      total_distance text,
      estimated_duration integer,
      actual_duration integer,
      start_time timestamp,
      end_time timestamp,
      optimized_waypoints text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);

  // Business settings table for tenant-specific configuration
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.business_settings (
      id serial PRIMARY KEY,
      custom_logo text,
      custom_branding text,
      email_settings text,
      notification_settings text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);
}
