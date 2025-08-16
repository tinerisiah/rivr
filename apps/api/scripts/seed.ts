import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { faker } from "@faker-js/faker";

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

async function clearData(mode: Mode): Promise<void> {
  console.log("🗑️  Clearing existing data...");
  if (mode === "full") {
    await db.execute("DELETE FROM route_stops");
    await db.execute("DELETE FROM routes");
    await db.execute("DELETE FROM pickup_requests");
    await db.execute("DELETE FROM quote_requests");
    await db.execute("DELETE FROM customers");
    // Email automation log references pickup requests and customers
    await db.execute("DELETE FROM email_automation_log");
  }
  await db.execute("DELETE FROM driver_messages");
  await db.execute("DELETE FROM driver_status_updates");
  await db.execute("DELETE FROM drivers");
  await db.execute("DELETE FROM rivr_admins");
  // Platform-level tables that reference businesses must be cleared before businesses
  await db.execute("DELETE FROM business_settings");
  await db.execute("DELETE FROM business_analytics");
  await db.execute("DELETE FROM refresh_tokens");
  await db.execute("DELETE FROM businesses");
  await db.execute("DELETE FROM users");
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
  const bizRes: any = await db.execute(
    `SELECT id, business_name, subdomain, database_schema FROM businesses`
  );
  const bizRows: Array<{
    id: number;
    business_name: string;
    subdomain: string;
    database_schema: string;
  }> = bizRes.rows ?? bizRes;

  for (const b of bizRows) {
    const schema = b.database_schema;
    console.log(
      `\n🏗️  Ensuring tenant schema '${schema}' for ${b.business_name}`
    );
    // Ensure schema + tables exist
    await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${schema}.customers (
        id serial PRIMARY KEY,
        first_name text NOT NULL,
        last_name text NOT NULL,
        email text NOT NULL,
        phone text,
        business_name text NOT NULL,
        address text NOT NULL,
        access_token text,
        email_updates_enabled boolean DEFAULT false NOT NULL,
        custom_signature text,
        custom_logo text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${schema}.pickup_requests (
        id serial PRIMARY KEY,
        customer_id integer REFERENCES ${schema}.customers(id) NOT NULL,
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

    console.log(`👥 Seeding customers for ${b.business_name}...`);
    const customerIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email({
        firstName: first,
        lastName: last,
        provider: "example.com",
      });
      const phone = faker.phone.number();
      const address = faker.location.streetAddress({ useFullAddress: true });
      const token = faker.string.uuid();
      const result: any = await db.execute(`
        INSERT INTO ${schema}.customers (first_name, last_name, email, phone, business_name, address, access_token)
        VALUES ('${esc(first)}', '${esc(last)}', '${esc(email)}', '${esc(phone)}', '${esc(b.business_name)}', '${esc(address)}', '${esc(token)}')
        RETURNING id;
      `);
      const id = result[0]?.id || result.rows?.[0]?.id;
      if (id) customerIds.push(id);
    }
    console.log(`✅ ${customerIds.length} customers created`);

    console.log(`🚛 Seeding drivers for ${b.business_name}...`);
    for (let i = 0; i < 10; i++) {
      const name = faker.person.fullName();
      const email = faker.internet.email({
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" ") || "driver",
        provider: "example.com",
      });
      const phone = faker.phone.number();
      await db.execute(`
        INSERT INTO ${schema}.drivers (name, email, phone, is_active)
        VALUES ('${esc(name)}', '${esc(email)}', '${esc(phone)}', true);
      `);
    }
    console.log("✅ 10 drivers created");

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
    console.log("✅ Tenant test drivers created/updated with passwords");

    console.log(`📦 Seeding pickup requests for ${b.business_name}...`);
    // Real US addresses to improve navigation realism for seeded tasks
    const realUsAddresses = [
      {
        address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
        lat: 37.422,
        lng: -122.0841,
      },
      {
        address: "1 Apple Park Way, Cupertino, CA 95014",
        lat: 37.3349,
        lng: -122.009,
      },
      {
        address: "1 Infinite Loop, Cupertino, CA 95014",
        lat: 37.33182,
        lng: -122.03118,
      },
      {
        address: "350 5th Ave, New York, NY 10118",
        lat: 40.74844,
        lng: -73.98566,
      },
      {
        address: "233 S Wacker Dr, Chicago, IL 60606",
        lat: 41.87888,
        lng: -87.6359,
      },
      {
        address: "111 8th Ave, New York, NY 10011",
        lat: 40.74111,
        lng: -74.0039,
      },
      {
        address: "1 Microsoft Way, Redmond, WA 98052",
        lat: 47.63962,
        lng: -122.12806,
      },
      {
        address: "701 1st Ave, Sunnyvale, CA 94089",
        lat: 37.41621,
        lng: -122.02557,
      },
      {
        address: "1 Hacker Way, Menlo Park, CA 94025",
        lat: 37.48485,
        lng: -122.14838,
      },
      {
        address: "500 Terry A Francois Blvd, San Francisco, CA 94158",
        lat: 37.77072,
        lng: -122.38605,
      },
      {
        address: "600 Congress Ave, Austin, TX 78701",
        lat: 30.2681,
        lng: -97.7419,
      },
      {
        address: "405 Lexington Ave, New York, NY 10174",
        lat: 40.75162,
        lng: -73.9755,
      },
      {
        address: "1000 5th Ave, New York, NY 10028",
        lat: 40.7794,
        lng: -73.9632,
      },
      {
        address: "151 3rd St, San Francisco, CA 94103",
        lat: 37.78572,
        lng: -122.40107,
      },
      {
        address: "4 Pennsylvania Plaza, New York, NY 10001",
        lat: 40.75054,
        lng: -73.99345,
      },
      {
        address: "24 Willie Mays Plaza, San Francisco, CA 94107",
        lat: 37.77859,
        lng: -122.38927,
      },
      {
        address: "1600 Pennsylvania Ave NW, Washington, DC 20500",
        lat: 38.8977,
        lng: -77.03653,
      },
      {
        address: "405 Howard St, San Francisco, CA 94105",
        lat: 37.78802,
        lng: -122.39693,
      },
      {
        address: "2000 K St NW, Washington, DC 20006",
        lat: 38.90262,
        lng: -77.04545,
      },
      {
        address: "2211 N 1st St, San Jose, CA 95131",
        lat: 37.37008,
        lng: -121.91686,
      },
    ];
    const englishNotes = [
      "Please call upon arrival.",
      "Ask for the front desk upon entry.",
      "Gate code will be provided on site.",
      "Customer prefers afternoon pickup.",
      "Park near the loading zone.",
      "Verify order before leaving.",
      "Signature required at handoff.",
      "Use the service entrance only.",
      "Check in with reception first.",
      "Items are ready at the counter.",
    ];
    const statuses = [
      "pending",
      "in_process",
      "ready_for_delivery",
      "ready_to_bill",
      "billed",
    ];
    for (let i = 0; i < 20; i++) {
      const cid = customerIds[Math.floor(Math.random() * customerIds.length)];
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email({
        firstName: first,
        lastName: last,
        provider: "example.com",
      });
      const phone = faker.phone.number();
      const addr = realUsAddresses[i % realUsAddresses.length];
      const address = addr.address;
      const wheelCount = faker.number.int({ min: 1, max: 8 });
      const status =
        statuses[faker.number.int({ min: 0, max: statuses.length - 1 })];
      const priority = faker.helpers.arrayElement([
        "low",
        "normal",
        "high",
        "urgent",
      ]);
      const notes = faker.helpers.arrayElement(englishNotes);
      await db.execute(`
        INSERT INTO ${schema}.pickup_requests (
          customer_id, first_name, last_name, email, phone, business_name, address, wheel_count, latitude, longitude, production_status, priority, customer_notes
        ) VALUES (
          ${cid}, '${esc(first)}', '${esc(last)}', '${esc(email)}', '${esc(phone)}', '${esc(b.business_name)}', '${esc(address)}', ${wheelCount}, '${addr.lat}', '${addr.lng}', '${esc(status)}', '${esc(priority)}', '${esc(notes)}'
        );
      `);
    }
    console.log("✅ 20 pickup requests created");
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
