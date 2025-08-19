import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

function esc(input: string): string {
  return input.replace(/'/g, "''");
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log("🌱 Seeding ONLY RIVR admin users (3 accounts)...");

  // Verify connection
  await db.execute("SELECT 1");

  const defaultPassword = process.env.ADMIN_SEED_PASSWORD || "admin123";
  const hashed = await hashPassword(defaultPassword);

  const admins = [
    {
      email: "admin@rivr-workflow.com",
      first_name: "RIVR",
      last_name: "Admin",
      role: "admin",
      is_active: true,
    },
    {
      email: "support@rivr-workflow.com",
      first_name: "RIVR",
      last_name: "Support",
      role: "admin",
      is_active: true,
    },
    {
      email: "info@rivr-workflow.com",
      first_name: "RIVR",
      last_name: "Info",
      role: "admin",
      is_active: true,
    },
  ] as const;

  const keepEmailsCsv = admins.map((a) => `'${esc(a.email)}'`).join(",");

  // Remove any admins not in the allowed list so ONLY these three remain
  console.log("🧹 Removing any existing admin users not in the allowlist...");
  await db.execute(
    `DELETE FROM rivr_admins WHERE email NOT IN (${keepEmailsCsv});`
  );

  // Upsert allowed admins with consistent details/password
  console.log("👤 Upserting admin users...");
  for (const a of admins) {
    await db.execute(`
      INSERT INTO rivr_admins (email, password, first_name, last_name, role, is_active)
      VALUES ('${esc(a.email)}', '${esc(hashed)}', '${esc(a.first_name)}', '${esc(a.last_name)}', '${esc(a.role)}', ${a.is_active})
      ON CONFLICT (email) DO UPDATE
        SET password = EXCLUDED.password,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active;
    `);
    console.log(`✅ Ensured admin: ${a.email}`);
  }

  console.log("\n🎉 Admin seeding completed successfully!");
  console.log("\n📋 Test Credentials (all use same password):");
  console.log(
    `  Password: ${process.env.ADMIN_SEED_PASSWORD ? "<from ADMIN_SEED_PASSWORD>" : defaultPassword}`
  );
  for (const a of admins) {
    console.log(`  Email: ${a.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
