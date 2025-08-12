/*
  Script: create-tenant-schema.ts
  Usage:
    pnpm --filter api ts-node src/scripts/create-tenant-schema.ts <subdomain> <schema_name>

  Description:
    Creates a per-tenant schema by cloning core tenant tables into the new schema.
    Optionally seeds minimal data.
*/
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
  const [subdomain, schemaName] = process.argv.slice(2);
  if (!subdomain || !schemaName) {
    console.error(
      "Usage: ts-node create-tenant-schema.ts <subdomain> <schema_name>"
    );
    process.exit(1);
  }

  console.log(
    `🏗️  Creating tenant schema '${schemaName}' for '${subdomain}'...`
  );

  // Create schema if not exists
  await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);

  // Create tables within tenant schema (minimal set to start). In a full
  // implementation, you'd apply migrations per schema or use template schemas.
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

  console.log("✅ Tenant schema created (minimal tables)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to create tenant schema:", err);
    process.exit(1);
  });
