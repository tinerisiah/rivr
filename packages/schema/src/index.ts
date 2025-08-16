import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database enums for better type safety and constraints
export const productionStatusEnum = pgEnum("production_status", [
  "pending",
  "in_process",
  "ready_for_delivery",
  "ready_to_bill",
  "billed",
  "archived",
]);

export const routeStopTypeEnum = pgEnum("route_stop_type", [
  "pickup",
  "dropoff",
]);
export const priorityEnum = pgEnum("priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// Multi-tenant enums
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "past_due",
  "canceled",
  "suspended",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "starter",
  "professional",
  "enterprise",
]);

export const businessStatusEnum = pgEnum("business_status", [
  "pending",
  "active",
  "suspended",
  "canceled",
]);

// Multi-tenant business accounts table (RIVR platform level)
export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    businessName: text("business_name").notNull(),
    ownerFirstName: text("owner_first_name").notNull(),
    ownerLastName: text("owner_last_name").notNull(),
    ownerEmail: text("owner_email").notNull().unique(),
    phone: text("phone"),
    address: text("address"),
    subdomain: text("subdomain").notNull().unique(), // unique subdomain for each business
    customDomain: text("custom_domain"), // optional custom domain
    databaseSchema: text("database_schema").notNull().unique(), // unique schema name
    status: businessStatusEnum("status").default("pending").notNull(),
    subscriptionPlan: subscriptionPlanEnum("subscription_plan")
      .default("starter")
      .notNull(),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .default("trial")
      .notNull(),
    subscriptionStartDate: timestamp("subscription_start_date"),
    subscriptionEndDate: timestamp("subscription_end_date"),
    trialEndsAt: timestamp("trial_ends_at"),
    monthlyRevenue: integer("monthly_revenue").default(0), // in cents
    annualRevenue: integer("annual_revenue").default(0), // in cents
    maxUsers: integer("max_users").default(10).notNull(),
    maxDrivers: integer("max_drivers").default(5).notNull(),
    maxCustomers: integer("max_customers").default(1000).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerEmailIdx: uniqueIndex("businesses_owner_email_idx").on(
      table.ownerEmail
    ),
    subdomainIdx: uniqueIndex("businesses_subdomain_idx").on(table.subdomain),
    statusIdx: index("businesses_status_idx").on(table.status),
    subscriptionStatusIdx: index("businesses_subscription_status_idx").on(
      table.subscriptionStatus
    ),
  })
);

// Business settings table for tenant-specific configuration
export const businessSettings = pgTable(
  "business_settings",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id),
    customLogo: text("custom_logo"), // URL or base64 data for the logo
    customBranding: text("custom_branding"), // JSON string for additional branding
    emailSettings: text("email_settings"), // JSON string for email preferences
    notificationSettings: text("notification_settings"), // JSON string for notification preferences
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    businessIdIdx: uniqueIndex("business_settings_business_id_idx").on(
      table.businessId
    ),
  })
);

// RIVR platform admin users (your executive portal users)
export const rivrAdmins = pgTable(
  "rivr_admins",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(), // hashed
    role: text("role").default("admin").notNull(), // admin, super_admin
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("rivr_admins_email_idx").on(table.email),
  })
);

// Business analytics and metrics
export const businessAnalytics = pgTable(
  "business_analytics",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .references(() => businesses.id)
      .notNull(),
    month: text("month").notNull(), // YYYY-MM format
    totalPickups: integer("total_pickups").default(0).notNull(),
    completedPickups: integer("completed_pickups").default(0).notNull(),
    totalRevenue: integer("total_revenue").default(0).notNull(), // in cents
    activeCustomers: integer("active_customers").default(0).notNull(),
    activeDrivers: integer("active_drivers").default(0).notNull(),
    averageCompletionTime: integer("average_completion_time").default(0), // in minutes
    customerSatisfactionScore: integer("customer_satisfaction_score").default(
      0
    ), // 1-10 scale
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    businessMonthIdx: uniqueIndex("business_analytics_business_month_idx").on(
      table.businessId,
      table.month
    ),
    businessIdx: index("business_analytics_business_idx").on(table.businessId),
  })
);

// Original users table (now per-business schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    businessName: text("business_name").notNull(),
    address: text("address").notNull(),
    accessToken: text("access_token").notNull().unique(),
    emailUpdatesEnabled: boolean("email_updates_enabled")
      .default(false)
      .notNull(),
    customSignature: text("custom_signature"),
    customLogo: text("custom_logo"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Database indexes for performance
    emailIdx: index("customers_email_idx").on(table.email),
    businessNameIdx: index("customers_business_name_idx").on(
      table.businessName
    ),
    accessTokenIdx: uniqueIndex("customers_access_token_idx").on(
      table.accessToken
    ),
    nameIdx: index("customers_name_idx").on(table.lastName, table.firstName),
  })
);

export const pickupRequests = pgTable(
  "pickup_requests",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .references(() => customers.id)
      .notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    businessName: text("business_name").notNull(),
    address: text("address").notNull(),
    wheelCount: integer("wheel_count").default(1).notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    isCompleted: boolean("is_completed").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    completionPhoto: text("completion_photo"),
    completionLocation: text("completion_location"),
    completionNotes: text("completion_notes"),
    employeeName: text("employee_name"),
    roNumber: text("ro_number"),
    customerNotes: text("customer_notes"),
    // Additional production timeline fields
    inProcessAt: timestamp("in_process_at"),
    readyForDeliveryAt: timestamp("ready_for_delivery_at"),
    readyToBillAt: timestamp("ready_to_bill_at"),
    // Delivery completion photo
    deliveryPhoto: text("delivery_photo"),
    wheelQrCodes: text("wheel_qr_codes").array().default([]),
    isDelivered: boolean("is_delivered").default(false).notNull(),
    deliveredAt: timestamp("delivered_at"),
    deliveryNotes: text("delivery_notes"),
    deliveryQrCodes: text("delivery_qr_codes").array().default([]),
    isArchived: boolean("is_archived").default(false).notNull(),
    archivedAt: timestamp("archived_at"),
    routeId: integer("route_id").references(() => routes.id),
    routeOrder: integer("route_order"),
    priority: priorityEnum("priority").default("normal"),
    estimatedPickupTime: timestamp("estimated_pickup_time"),
    // Production workflow status
    productionStatus:
      productionStatusEnum("production_status").default("pending"),
    billedAt: timestamp("billed_at"),
    billedAmount: text("billed_amount"),
    invoiceNumber: text("invoice_number"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Performance indexes for pickup requests
    customerIdIdx: index("pickup_requests_customer_id_idx").on(
      table.customerId
    ),
    statusIdx: index("pickup_requests_status_idx").on(table.productionStatus),
    routeIdx: index("pickup_requests_route_idx").on(table.routeId),
    completedIdx: index("pickup_requests_completed_idx").on(table.isCompleted),
    createdAtIdx: index("pickup_requests_created_at_idx").on(table.createdAt),
    businessNameIdx: index("pickup_requests_business_name_idx").on(
      table.businessName
    ),
  })
);

export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  businessName: text("business_name").notNull(),
  description: text("description").notNull(),
  photos: text("photos").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  pin: text("pin"), // Legacy PIN field (optional now)
  password: text("password"), // Hashed password for credential-based auth
  currentLatitude: text("current_latitude"),
  currentLongitude: text("current_longitude"),
  status: text("status").default("available").notNull(), // available, busy, break, offline
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverMessages = pgTable("driver_messages", {
  id: serial("id").primaryKey(),
  fromDriverId: integer("from_driver_id").references(() => drivers.id),
  toDriverId: integer("to_driver_id").references(() => drivers.id),
  fromAdmin: boolean("from_admin").default(false).notNull(),
  toAdmin: boolean("to_admin").default(false).notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").default("text").notNull(), // text, location, route_update, emergency
  routeId: integer("route_id").references(() => routes.id),
  isRead: boolean("is_read").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
});

export const driverStatusUpdates = pgTable("driver_status_updates", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id")
    .references(() => drivers.id)
    .notNull(),
  status: text("status").notNull(), // started_route, completed_pickup, break_started, break_ended, emergency
  routeId: integer("route_id").references(() => routes.id),
  pickupId: integer("pickup_id").references(() => pickupRequests.id),
  location: text("location"), // JSON string with lat/lng
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  driverId: integer("driver_id").references(() => drivers.id),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed
  totalDistance: text("total_distance"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  optimizedWaypoints: text("optimized_waypoints"), // JSON string of waypoints
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for individual route stops (both pickups and dropoffs)
export const routeStops = pgTable("route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id")
    .references(() => routes.id)
    .notNull(),
  stopType: text("stop_type").notNull(), // 'pickup' or 'dropoff'
  pickupRequestId: integer("pickup_request_id").references(
    () => pickupRequests.id
  ),
  customerId: integer("customer_id").references(() => customers.id),
  address: text("address").notNull(),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  stopOrder: integer("stop_order").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  estimatedTime: timestamp("estimated_time"),
  actualArrivalTime: timestamp("actual_arrival_time"),
  // For dropoffs - items being delivered
  itemsToDeliver: text("items_to_deliver"), // JSON array of items/RO numbers
  deliveryQrCodes: text("delivery_qr_codes").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email Templates table for customizable workflow email automation
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),
    templateType: text("template_type").notNull(), // 'pending', 'in_process', 'ready_for_delivery', 'ready_to_bill', 'billed'
    subject: text("subject").notNull(),
    bodyTemplate: text("body_template").notNull(), // HTML template with placeholders
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    templateTypeIdx: index("email_templates_type_idx").on(table.templateType),
  })
);

// Email Automation Log for tracking sent emails
export const emailAutomationLog = pgTable(
  "email_automation_log",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .references(() => customers.id)
      .notNull(),
    pickupRequestId: integer("pickup_request_id")
      .references(() => pickupRequests.id)
      .notNull(),
    templateType: text("template_type").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    subject: text("subject").notNull(),
    sentBy: text("sent_by").notNull(), // email of the admin who triggered the status change
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    status: text("status").default("sent").notNull(), // sent, failed, pending
    errorMessage: text("error_message"),
  },
  (table) => ({
    customerIdx: index("email_log_customer_idx").on(table.customerId),
    pickupIdx: index("email_log_pickup_idx").on(table.pickupRequestId),
    sentAtIdx: index("email_log_sent_at_idx").on(table.sentAt),
  })
);

// Platform-level refresh tokens for session management (rotation & revocation)
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    // Stable identifier embedded in the JWT payload for lookup
    tokenId: text("token_id").notNull().unique(),
    userId: integer("user_id").notNull(),
    // Minimal role string from JWT (e.g., 'business_owner', 'rivr_admin', 'driver')
    role: text("role").notNull(),
    // Business/tenant identifier when applicable
    tenantId: integer("tenant_id"),
    // Rotation tracking
    replacedByTokenId: text("replaced_by_token_id"),
    revoked: boolean("revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at"),
    // Metadata
    userAgent: text("user_agent"),
    createdByIp: text("created_by_ip"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Expiration (derived from env, not authoritative vs JWT but helps queries)
    expiresAt: timestamp("expires_at"),
  },
  (table) => ({
    tokenIdx: uniqueIndex("refresh_tokens_token_idx").on(table.tokenId),
    userIdx: index("refresh_tokens_user_idx").on(table.userId, table.role),
    tenantIdx: index("refresh_tokens_tenant_idx").on(table.tenantId),
    activeIdx: index("refresh_tokens_active_idx").on(table.revoked),
  })
);

// Schema definitions
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  accessToken: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPickupRequestSchema = createInsertSchema(
  pickupRequests
).omit({
  id: true,
  createdAt: true,
});

export const completePickupSchema = z.object({
  id: z.number(),
  completionPhoto: z.string().min(1, "Photo is required"),
  completionLocation: z.string().min(1, "Location is required"),
  completionNotes: z.string().optional(),
  employeeName: z.string().min(1, "Employee name is required"),
  roNumber: z.string().optional(),
});

export const adminCompletePickupSchema = z.object({
  id: z.number(),
  roNumber: z.string().min(1, "RO# is required"),
  completionNotes: z.string().optional(),
  completionPhoto: z.string().min(1, "Photo is required"),
  wheelQrCodes: z.array(z.string()).default([]),
});

export const deliverPickupSchema = z.object({
  id: z.number(),
  deliveryNotes: z.string().optional(),
  deliveryQrCodes: z.array(z.string()).default([]),
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({
  id: true,
  createdAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const optimizeRouteSchema = z.object({
  pickupIds: z.array(z.number()).min(1, "At least one pickup is required"),
  driverId: z.number().optional(),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
});

export const insertRouteStopSchema = createInsertSchema(routeStops).omit({
  id: true,
  createdAt: true,
});

// Multi-tenant schema definitions
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRivrAdminSchema = createInsertSchema(rivrAdmins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessAnalyticsSchema = createInsertSchema(
  businessAnalytics
).omit({
  id: true,
  createdAt: true,
});

// Email automation schema definitions
export const insertEmailTemplateSchema = createInsertSchema(
  emailTemplates
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailAutomationLog).omit(
  {
    id: true,
    sentAt: true,
  }
);

export const insertBusinessSettingsSchema = createInsertSchema(
  businessSettings
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertPickupRequest = z.infer<typeof insertPickupRequestSchema>;
export type PickupRequest = typeof pickupRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type CompletePickup = z.infer<typeof completePickupSchema>;
export type AdminCompletePickup = z.infer<typeof adminCompletePickupSchema>;
export type DeliverPickup = z.infer<typeof deliverPickupSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;
export type OptimizeRoute = z.infer<typeof optimizeRouteSchema>;
export type InsertRouteStop = z.infer<typeof insertRouteStopSchema>;
export type RouteStop = typeof routeStops.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<
  typeof insertBusinessSettingsSchema
>;
export type RivrAdmin = typeof rivrAdmins.$inferSelect;
export type InsertRivrAdmin = z.infer<typeof insertRivrAdminSchema>;
export type BusinessAnalytics = typeof businessAnalytics.$inferSelect;
export type InsertBusinessAnalytics = z.infer<
  typeof insertBusinessAnalyticsSchema
>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailAutomationLog = typeof emailAutomationLog.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
