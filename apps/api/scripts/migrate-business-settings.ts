/*
  Script: migrate-business-settings.ts
  Usage:
    pnpm --filter api ts-node src/scripts/migrate-business-settings.ts

  Description:
    Creates the business_settings table in the main database for storing
    business-specific configuration like logos and branding.
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
  console.log("🏗️  Creating business_settings table...");

  try {
    // Create business_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS business_settings (
        id serial PRIMARY KEY,
        business_id integer NOT NULL REFERENCES businesses(id),
        custom_logo text,
        custom_branding text,
        email_settings text,
        notification_settings text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create unique index on business_id
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS business_settings_business_id_idx 
      ON business_settings(business_id);
    `);

    console.log("✅ business_settings table created successfully");
    
    // Check if table exists and show structure
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'business_settings'
      ORDER BY ordinal_position;
    `);
    
    console.log("\n📋 Table structure:");
    console.table(result);
    
  } catch (error) {
    console.error("❌ Failed to create business_settings table:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
