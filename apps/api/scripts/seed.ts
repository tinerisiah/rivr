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

type Mode = "full" | "auth";

async function clearData(mode: Mode): Promise<void> {
  console.log("🗑️  Clearing existing data...");
  if (mode === "full") {
    await db.execute("DELETE FROM route_stops");
    await db.execute("DELETE FROM routes");
    await db.execute("DELETE FROM pickup_requests");
    await db.execute("DELETE FROM quote_requests");
    await db.execute("DELETE FROM customers");
  }
  await db.execute("DELETE FROM driver_messages");
  await db.execute("DELETE FROM driver_status_updates");
  await db.execute("DELETE FROM drivers");
  await db.execute("DELETE FROM rivr_admins");
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
  console.log("👥 Creating customers...");
  const customersData = [
    {
      first_name: "John",
      last_name: "Customer",
      email: "john@customer.com",
      phone: "(555) 777-8888",
      business_name: "Customer Auto",
      address: "321 Customer St, Customer City, CA 90213",
      access_token: "customer_token_1",
    },
    {
      first_name: "Alice",
      last_name: "Client",
      email: "alice@client.com",
      phone: "(555) 999-0000",
      business_name: "Client Motors",
      address: "654 Client Ave, Client Town, CA 90214",
      access_token: "customer_token_2",
    },
    {
      first_name: "Bob",
      last_name: "User",
      email: "bob@user.com",
      phone: "(555) 111-3333",
      business_name: "User Garage",
      address: "987 User Rd, User Village, CA 90215",
      access_token: "customer_token_3",
    },
  ];

  const createdCustomers: Array<{ id: number } & Record<string, unknown>> = [];
  for (const c of customersData) {
    const result: any = await db.execute(
      `INSERT INTO customers (first_name, last_name, email, phone, business_name, address, access_token)
       VALUES ('${c.first_name}', '${c.last_name}', '${c.email}', '${c.phone}', '${c.business_name}', '${c.address}', '${c.access_token}') RETURNING id`
    );
    const id = result[0]?.id || result.rows?.[0]?.id;
    createdCustomers.push({ ...c, id });
  }
  console.log(`✅ Created ${createdCustomers.length} customers`);

  console.log("📦 Creating pickup requests...");
  const pickupRequestsData = [
    {
      customer_id: createdCustomers[0].id,
      first_name: "John",
      last_name: "Customer",
      email: "john@customer.com",
      phone: "(555) 777-8888",
      business_name: "Customer Auto",
      address: "321 Customer St, Customer City, CA 90213",
      wheel_count: 4,
      latitude: "34.0522",
      longitude: "-118.2437",
      production_status: "pending",
      priority: "normal",
      customer_notes: "Please pick up in the morning",
    },
    {
      customer_id: createdCustomers[1].id,
      first_name: "Alice",
      last_name: "Client",
      email: "alice@client.com",
      phone: "(555) 999-0000",
      business_name: "Client Motors",
      address: "654 Client Ave, Client Town, CA 90214",
      wheel_count: 2,
      latitude: "34.0522",
      longitude: "-118.2437",
      production_status: "in_process",
      priority: "high",
      customer_notes: "Urgent pickup needed",
    },
  ];

  const createdPickups: Array<{ id: number } & Record<string, unknown>> = [];
  for (const p of pickupRequestsData) {
    const result: any = await db.execute(
      `INSERT INTO pickup_requests (customer_id, first_name, last_name, email, phone, business_name, address, wheel_count, latitude, longitude, production_status, priority, customer_notes)
       VALUES (${p.customer_id}, '${p.first_name}', '${p.last_name}', '${p.email}', '${p.phone}', '${p.business_name}', '${p.address}', ${p.wheel_count}, '${p.latitude}', '${p.longitude}', '${p.production_status}', '${p.priority}', '${p.customer_notes}') RETURNING id`
    );
    const id = result[0]?.id || result.rows?.[0]?.id;
    createdPickups.push({ ...p, id });
  }
  console.log(`✅ Created ${createdPickups.length} pickup requests`);

  console.log("💬 Creating quote requests...");
  const quoteRequestsData = [
    {
      first_name: "Tom",
      last_name: "Quote",
      email: "tom@quote.com",
      phone: "(555) 444-5555",
      business_name: "Quote Auto",
      description: "Need quote for 10 wheels pickup service",
      photos: ["photo1.jpg", "photo2.jpg"],
    },
  ];
  for (const q of quoteRequestsData) {
    await db.execute(
      `INSERT INTO quote_requests (first_name, last_name, email, phone, business_name, description, photos)
       VALUES ('${q.first_name}', '${q.last_name}', '${q.email}', '${q.phone}', '${q.business_name}', '${q.description}', ARRAY[${q.photos
         .map((p) => `'${p}'`)
         .join(", ")}])`
    );
  }
  console.log("✅ Created quote requests");

  console.log("🗺️  Creating routes + stops...");
  const routesData = [
    {
      name: "Morning Route - Alex",
      driver_email: "alex@rivr.com",
      status: "active",
      estimated_duration: 240,
      total_distance: "45.5",
    },
  ];

  for (const r of routesData) {
    // Find driver id by email
    const driverRow: any = await db.execute(
      `SELECT id FROM drivers WHERE email='${r.driver_email}' LIMIT 1`
    );
    const driverId = driverRow[0]?.id || driverRow.rows?.[0]?.id;
    if (!driverId) continue;
    const routeRes: any = await db.execute(
      `INSERT INTO routes (name, driver_id, status, estimated_duration, total_distance)
       VALUES ('${r.name}', ${driverId}, '${r.status}', ${r.estimated_duration}, '${r.total_distance}') RETURNING id`
    );
    const routeId = routeRes[0]?.id || routeRes.rows?.[0]?.id;
    // Add one stop if pickups exist
    if (createdPickups.length > 0) {
      await db.execute(
        `INSERT INTO route_stops (route_id, stop_type, pickup_request_id, customer_id, address, business_name, contact_name, contact_phone, stop_order)
         VALUES (${routeId}, 'pickup', ${createdPickups[0].id}, NULL, '${createdPickups[0].address}', '${createdPickups[0].business_name}', '${createdPickups[0].first_name} ${createdPickups[0].last_name}', '${createdPickups[0].phone}', 1)`
      );
    }
  }
  console.log("✅ Created routes and stops");
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
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
