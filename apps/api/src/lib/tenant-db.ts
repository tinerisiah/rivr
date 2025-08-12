import type { Request } from "express";
import { db } from "../db";

export interface TenantContext {
  tenant?: string;
  businessId?: number;
}

export function getTenantContextFromRequest(req: Request): TenantContext {
  return {
    tenant: (req as any).tenant as string | undefined,
    businessId: (req as any).businessId as number | undefined,
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

  return db.transaction(async (tx) => {
    // Set tenant schema for the lifetime of this transaction
    // Using identifier interpolation is dangerous; tenant names should be validated at creation.
    await tx.execute(`SET LOCAL search_path TO ${context.tenant}`);
    return fn(tx as unknown as typeof db, context);
  });
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
      access_token text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
  `);

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${schemaName}.drivers (
      id serial PRIMARY KEY,
      name text NOT NULL,
      email text,
      phone text,
      is_active boolean DEFAULT true NOT NULL,
      current_latitude text,
      current_longitude text
    );
  `);

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
}
