/*
  Script: migrate-initial-tenant-seed.ts
  Usage:
    pnpm --filter api ts-node src/scripts/migrate-initial-tenant-seed.ts <schema_name>

  Description:
    Optionally copy initial public data into the tenant schema tables or seed demo rows.
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
  const [schemaName] = process.argv.slice(2);
  if (!schemaName) {
    console.error(
      "Usage: ts-node migrate-initial-tenant-seed.ts <schema_name>"
    );
    process.exit(1);
  }

  console.log(`🌱 Seeding initial data for schema '${schemaName}'...`);

  // Example: copy sample customers from a public table or insert demo rows
  // NOTE: Update logic according to your actual baseline data sources
  await db.execute(`
    INSERT INTO ${schemaName}.customers (first_name, last_name, email, phone, business_name, address, access_token)
    VALUES
      ('Demo', 'Customer', 'demo.customer@example.com', '(555) 000-0000', 'Demo Business', '100 Demo St', 'demo-token-1'),
      ('Sample', 'Customer', 'sample.customer@example.com', '(555) 000-0001', 'Sample Business', '101 Sample Ave', 'demo-token-2')
  `);

  console.log("✅ Initial tenant seed done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to seed tenant schema:", err);
    process.exit(1);
  });
