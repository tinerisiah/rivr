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

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

function esc(input: string): string {
  return input.replace(/'/g, "''");
}

type Mode = "full" | "auth";

type BusinessRow = {
  id: number;
  business_name: string;
  subdomain: string;
  database_schema: string;
};

async function tryDeleteTable(fullyQualifiedTableName: string): Promise<void> {
  try {
    await db.execute(`DELETE FROM ${fullyQualifiedTableName}`);
    console.log(`🧹 Cleared table: ${fullyQualifiedTableName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("does not exist") ||
      message.includes("undefined_table") ||
      message.includes('relation "')
    ) {
      console.log(
        `ℹ️ Skipped clearing ${fullyQualifiedTableName} (table not found)`
      );
    } else {
      console.log(`⚠️ Could not clear ${fullyQualifiedTableName}: ${message}`);
    }
  }
}

async function clearData(mode: Mode): Promise<void> {
  console.log("🗑️  Clearing existing data...");
  if (mode === "full") {
    // Remove dependent data in FK-safe order
    await tryDeleteTable("email_automation_log");
    await tryDeleteTable("route_stops");
    await tryDeleteTable("routes");
    await tryDeleteTable("quote_requests");
  }
  // Always remove pickups and customers at both global and tenant levels
  await tryDeleteTable("pickup_requests");
  await tryDeleteTable("customers");
  // Remove tenant-scoped pickups and customers
  try {
    const result:
      | { rows?: Array<{ database_schema: string }> }
      | Array<{ database_schema: string }> = await db.execute(
      `SELECT database_schema FROM businesses`
    );
    const container = result as
      | { rows?: Array<{ database_schema: string }> }
      | Array<{ database_schema: string }>;
    const tenants: Array<{ database_schema: string }> = Array.isArray(container)
      ? container
      : (container.rows ?? []);
    for (const t of tenants) {
      await tryDeleteTable(`${t.database_schema}.pickup_requests`);
      await tryDeleteTable(`${t.database_schema}.customers`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `⚠️ Could not enumerate tenant schemas to clear pickups/customers: ${message}`
    );
  }
  await tryDeleteTable("driver_messages");
  await tryDeleteTable("driver_status_updates");
  await tryDeleteTable("drivers");
  await tryDeleteTable("rivr_admins");
  // Platform-level tables that reference businesses must be cleared before businesses
  await tryDeleteTable("business_employees");
  await tryDeleteTable("business_settings");
  await tryDeleteTable("business_analytics");
  await tryDeleteTable("refresh_tokens");
  await tryDeleteTable("businesses");
  await tryDeleteTable("users");
}

async function seedAuth(): Promise<void> {
  console.log("👨‍💼 Creating RIVR admin users...");
  const adminPassword = await hashPassword("admin123");
  const adminUsers = [
    {
      email: "admin@rivr.com",
      password: adminPassword,
      first_name: "John",
      last_name: "Admin",
      role: "super_admin",
      is_active: true,
    },
    {
      email: "manager@rivr.com",
      password: adminPassword,
      first_name: "Sarah",
      last_name: "Manager",
      role: "admin",
      is_active: true,
    },
  ];

  for (const admin of adminUsers) {
    await db.execute(
      `INSERT INTO rivr_admins (email, password, first_name, last_name, role, is_active)
       VALUES ('${admin.email}', '${admin.password}', '${admin.first_name}', '${admin.last_name}', '${admin.role}', ${admin.is_active})`
    );
    console.log(`✅ Created admin: ${admin.email}`);
  }

  console.log("🚛 Creating driver users...");
  const driverPassword = await hashPassword("driver123");
  const driverUsers = [
    {
      name: "Alex Johnson",
      email: "alex@rivr.com",
      phone: "(555) 123-4567",
      license_number: "DL123456789",
      password: driverPassword,
      status: "available",
      is_active: true,
    },
    {
      name: "Maria Garcia",
      email: "maria@rivr.com",
      phone: "(555) 234-5678",
      license_number: "DL987654321",
      password: driverPassword,
      status: "available",
      is_active: true,
    },
    {
      name: "David Chen",
      email: "david@rivr.com",
      phone: "(555) 345-6789",
      license_number: "DL456789123",
      password: driverPassword,
      status: "available",
      is_active: true,
    },
  ];

  for (const driver of driverUsers) {
    await db.execute(
      `INSERT INTO drivers (name, email, phone, license_number, password, status, is_active)
       VALUES ('${driver.name}', '${driver.email}', '${driver.phone}', '${driver.license_number}', '${driver.password}', '${driver.status}', ${driver.is_active})`
    );
    console.log(`✅ Created driver: ${driver.email}`);
  }

  console.log("🏢 Creating business accounts and owner users...");
  const businessPassword = await hashPassword("business123");
  const businessUsers = [
    {
      business_name: "Smith Auto Repair",
      owner_first_name: "Robert",
      owner_last_name: "Smith",
      owner_email: "robert@smithauto.com",
      phone: "(555) 111-2222",
      address: "123 Main St, Anytown, CA 90210",
      subdomain: "smith-auto",
      database_schema: "smith_auto",
      status: "active",
      subscription_plan: "professional",
    },
    {
      business_name: "Doe Motors",
      owner_first_name: "Jane",
      owner_last_name: "Doe",
      owner_email: "jane@doemotors.com",
      phone: "(555) 333-4444",
      address: "456 Oak Ave, Somewhere, CA 90211",
      subdomain: "doe-motors",
      database_schema: "doe_motors",
      status: "active",
      subscription_plan: "enterprise",
    },
    {
      business_name: "the wheel house",
      owner_first_name: "William",
      owner_last_name: "House",
      owner_email: "owner@thewheelhouse.com",
      phone: "(555) 555-1212",
      address: "789 Wheel Way, Rivertown, CA 90212",
      subdomain: "the-wheel-house",
      database_schema: "the_wheel_house",
      status: "active",
      subscription_plan: "professional",
    },
  ];

  for (const business of businessUsers) {
    await db.execute(
      `INSERT INTO businesses (business_name, owner_first_name, owner_last_name, owner_email, phone, address, subdomain, database_schema, status, subscription_plan)
       VALUES ('${business.business_name}', '${business.owner_first_name}', '${business.owner_last_name}', '${business.owner_email}', '${business.phone}', '${business.address}', '${business.subdomain}', '${business.database_schema}', '${business.status}', '${business.subscription_plan}')`
    );
    await db.execute(
      `INSERT INTO users (username, password) VALUES ('${business.owner_email}', '${businessPassword}')`
    );
    console.log(`✅ Created business + owner user: ${business.business_name}`);
  }
}

async function seedFullExtras(): Promise<void> {
  // Fetch businesses and seed each tenant schema with unique data
  const bizRes: { rows?: BusinessRow[] } | BusinessRow[] = await db.execute(
    `SELECT id, business_name, subdomain, database_schema FROM businesses`
  );
  const bizContainer = bizRes as { rows?: BusinessRow[] } | BusinessRow[];
  const bizRows: BusinessRow[] = Array.isArray(bizContainer)
    ? bizContainer
    : (bizContainer.rows ?? []);

  for (const b of bizRows) {
    const schema = b.database_schema;
    console.log(
      `\n🏗️  Ensuring tenant schema '${schema}' for ${b.business_name}`
    );
    // Ensure schema + tables exist
    await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${schema}.drivers (
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
    // Backfill columns that may be missing from older tenant schemas
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS license_number text;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS password text;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS status text DEFAULT 'available' NOT NULL;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS current_latitude text;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS current_longitude text;`
    );
    await db.execute(
      `ALTER TABLE ${schema}.drivers ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;`
    );
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${schema}.routes (
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
    // Tenant seed focuses on drivers and supporting entities only

    console.log(`🚛 Seeding drivers for ${b.business_name}...`);
    // Ensure exactly three drivers per tenant by clearing existing rows first
    await tryDeleteTable(`${schema}.drivers`);

    // Ensure known test drivers exist in each tenant with hashed passwords
    console.log(`👤 Seeding test driver credentials for ${b.business_name}...`);
    const tenantDriverPassword = await hashPassword("driver123");
    const testDrivers = [
      {
        name: "Alex Johnson",
        email: "alex@rivr.com",
        phone: "(555) 123-4567",
        license_number: "DL123456789",
      },
      {
        name: "Maria Garcia",
        email: "maria@rivr.com",
        phone: "(555) 234-5678",
        license_number: "DL987654321",
      },
      {
        name: "David Chen",
        email: "david@rivr.com",
        phone: "(555) 345-6789",
        license_number: "DL456789123",
      },
    ];
    // Remove any existing rows for these emails (some environments lack a unique index on email)
    const emailsCsv = testDrivers.map((d) => `'${esc(d.email)}'`).join(",");
    await db.execute(
      `DELETE FROM ${schema}.drivers WHERE email IN (${emailsCsv});`
    );
    for (const d of testDrivers) {
      await db.execute(`
        INSERT INTO ${schema}.drivers (name, email, phone, license_number, password, status, is_active)
        VALUES ('${esc(d.name)}', '${esc(d.email)}', '${esc(d.phone)}', '${esc(d.license_number)}', '${tenantDriverPassword}', 'available', true);
      `);
    }
    console.log("✅ 3 drivers created with passwords");

    // End of tenant-specific seeding
  }
}

async function main() {
  const modeArg = (process.argv[2] || "full").toLowerCase();
  const mode: Mode = modeArg === "auth" ? "auth" : "full";

  console.log(`🌱 Running seed in '${mode}' mode...`);

  // Verify connection
  await db.execute("SELECT 1");
  await clearData(mode);
  await seedAuth();
  if (mode === "full") {
    await seedFullExtras();
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Test Credentials:");
  console.log("\n👨‍💼 Admin Users:");
  console.log("  Email: admin@rivr.com | Password: admin123");
  console.log("  Email: manager@rivr.com | Password: admin123");
  console.log("\n🚛 Driver Users:");
  console.log("  Email: alex@rivr.com | Password: driver123");
  console.log("  Email: maria@rivr.com | Password: driver123");
  console.log("  Email: david@rivr.com | Password: driver123");
  console.log("\n🏢 Business Users:");
  console.log("  Email: robert@smithauto.com | Password: business123");
  console.log("  Email: jane@doemotors.com | Password: business123");
  console.log("  Email: owner@thewheelhouse.com | Password: business123");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
