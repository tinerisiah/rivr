import { db } from "./db";
import type { Request } from "express";
import {
  getTenantContextFromRequest,
  withTenantDb,
  type TenantContext,
} from "./lib/tenant-db";
import {
  customers,
  pickupRequests,
  quoteRequests,
  drivers,
  routes,
  routeStops,
  driverMessages,
  driverStatusUpdates,
  businesses,
  businessSettings,
  rivrAdmins,
  businessAnalytics,
  emailTemplates,
  emailAutomationLog,
  type Customer,
  type PickupRequest,
  type QuoteRequest,
  type Driver,
  type Route,
  type RouteStop,
  type Business,
  type BusinessSettings,
  businessEmployees,
  type BusinessEmployee,
  type InsertBusinessEmployee,
  type InsertCustomer,
  type InsertPickupRequest,
  type InsertQuoteRequest,
  type InsertDriver,
  type InsertRoute,
  type InsertRouteStop,
  type InsertBusiness,
  type InsertBusinessSettings,
  type InsertRivrAdmin,
  type InsertBusinessAnalytics,
  type InsertEmailTemplate,
  type InsertEmailLog,
} from "@repo/schema";
import {
  eq,
  and,
  desc,
  asc,
  isNull,
  isNotNull,
  or,
  inArray,
} from "drizzle-orm";
import { randomUUID } from "crypto";
import { hashPassword } from "./auth";

class Storage {
  private readonly tenantContext: TenantContext;

  constructor(tenantContext: TenantContext = {}) {
    this.tenantContext = tenantContext;
  }
  private async withDb<T>(fn: (dbc: typeof db) => Promise<T>): Promise<T> {
    // If a tenant schema name is not known but a businessId is available,
    // resolve the schema from the businesses table lazily.
    if (!this.tenantContext.tenant && this.tenantContext.businessId) {
      const [biz] = await db
        .select({ databaseSchema: businesses.databaseSchema })
        .from(businesses)
        .where(eq(businesses.id, this.tenantContext.businessId))
        .limit(1);
      if (biz?.databaseSchema) {
        this.tenantContext.tenant = biz.databaseSchema;
      }
    }

    // If no tenant context after attempted resolution, run against shared schema
    if (!this.tenantContext.tenant) {
      return fn(db);
    }

    // Tenant-scoped: set search_path within a transaction for the lifetime of the callback
    return db.transaction(async (tx) => {
      await tx.execute(`SET LOCAL search_path TO ${this.tenantContext.tenant}`);
      return fn(tx as unknown as typeof db);
    });
  }
  // Customer operations
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const accessToken = randomUUID();
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .insert(customers)
        .values({
          ...data,
          accessToken,
        })
        .returning();
      return customer;
    });
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .select()
        .from(customers)
        .where(eq(customers.email, email));
      return customer || null;
    });
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .select()
        .from(customers)
        .where(eq(customers.id, id));
      return customer || null;
    });
  }

  async getCustomerByToken(token: string): Promise<Customer | null> {
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .select()
        .from(customers)
        .where(eq(customers.accessToken, token));
      return customer || null;
    });
  }

  async getCustomers(): Promise<Customer[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(customers).orderBy(desc(customers.createdAt))
    );
  }

  async updateCustomer(
    id: number,
    updates: Partial<InsertCustomer>
  ): Promise<Customer | null> {
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .update(customers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return customer || null;
    });
  }

  async setCustomerSuspended(
    id: number,
    suspended: boolean
  ): Promise<Customer | null> {
    return this.withDb(async (dbc) => {
      const [customer] = await dbc
        .update(customers)
        .set({ isSuspended: suspended, updatedAt: new Date() } as any)
        .where(eq(customers.id, id))
        .returning();
      return customer || null;
    });
  }

  async deleteCustomerCascade(id: number): Promise<void> {
    return this.withDb(async (dbc) => {
      // Delete dependent pickup requests first due to FK
      await dbc.delete(pickupRequests).where(eq(pickupRequests.customerId, id));
      await dbc.delete(customers).where(eq(customers.id, id));
    });
  }

  // Pickup request operations
  async createPickupRequest(data: InsertPickupRequest): Promise<PickupRequest> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .insert(pickupRequests)
        .values(data)
        .returning();
      return request;
    });
  }

  async getPickupRequests(): Promise<PickupRequest[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(pickupRequests).orderBy(desc(pickupRequests.createdAt))
    );
  }

  async getPickupRequestsByCustomerId(
    customerId: number
  ): Promise<PickupRequest[]> {
    return this.withDb(async (dbc) =>
      dbc
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.customerId, customerId))
        .orderBy(desc(pickupRequests.createdAt))
    );
  }

  async getPickupRequest(id: number): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.id, id));
      return request || null;
    });
  }

  async completePickupRequest(
    id: number,
    completionData: {
      completionPhoto: string;
      completionLocation: string;
      completionNotes?: string;
      employeeName: string;
      roNumber?: string;
    }
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({
          ...completionData,
          isCompleted: true,
          completedAt: new Date(),
        })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async adminCompletePickupRequest(
    id: number,
    completionData: {
      roNumber: string;
      completionNotes?: string;
      completionPhoto: string;
      wheelQrCodes: string[];
    }
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({
          ...completionData,
          isCompleted: true,
          completedAt: new Date(),
        })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async deliverPickupRequest(
    id: number,
    deliveryData: {
      deliveryNotes?: string;
      deliveryQrCodes: string[];
      deliveryPhoto?: string;
    }
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({
          ...deliveryData,
          isDelivered: true,
          deliveredAt: new Date(),
        })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async updatePickupRequestProductionStatus(
    id: number,
    status: string,
    photo?: string
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const now = new Date();
      const timeline: any = { productionStatus: status as any };
      if (status === "in_process") {
        timeline.inProcessAt = now;
        if (photo) timeline.inProcessPhoto = photo;
      }
      if (status === "ready_for_delivery") {
        timeline.readyForDeliveryAt = now;
        if (photo) timeline.readyForDeliveryPhoto = photo;
      }
      if (status === "ready_to_bill") {
        timeline.readyToBillAt = now;
        if (photo) timeline.readyToBillPhoto = photo;
      }
      if (status === "billed") {
        if (photo) timeline.billedPhoto = photo;
      }
      const [request] = await dbc
        .update(pickupRequests)
        .set(timeline)
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async updatePickupRequestByCustomer(
    id: number,
    customerId: number,
    updates: Partial<{
      roNumber?: string;
      customerNotes?: string;
      address?: string;
    }>
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [existing] = await dbc
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.id, id));
      if (!existing) return null;
      // Only allow update by the owning customer and when not completed/archived
      if (
        existing.customerId !== customerId ||
        existing.isCompleted ||
        existing.isArchived
      ) {
        return null;
      }
      const [request] = await dbc
        .update(pickupRequests)
        .set({
          roNumber: updates.roNumber ?? existing.roNumber,
          customerNotes: updates.customerNotes ?? existing.customerNotes,
          address: updates.address ?? existing.address,
        })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async markPickupRequestAsBilled(
    id: number,
    billingData: {
      billedAt: string;
      productionStatus: string;
      billedAmount?: string;
      invoiceNumber?: string;
    }
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({
          ...billingData,
          billedAt: new Date(billingData.billedAt),
          productionStatus: billingData.productionStatus as any,
        })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async updatePickupCompletion(
    id: number,
    completionData: {
      completionNotes?: string;
      roNumber?: string;
      completionPhoto?: string;
      isCompleted: boolean;
      completedAt: Date;
    }
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set(completionData)
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  async reassignPickup(
    id: number,
    driverId: number | null,
    routeId: number | null
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({ routeId })
        .where(eq(pickupRequests.id, id))
        .returning();
      return request || null;
    });
  }

  // Quote request operations
  async createQuoteRequest(data: InsertQuoteRequest): Promise<QuoteRequest> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .insert(quoteRequests)
        .values(data)
        .returning();
      return request;
    });
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt))
    );
  }

  async getQuoteRequest(id: number): Promise<QuoteRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.id, id));
      return request || null;
    });
  }

  // Driver operations
  async createDriver(data: InsertDriver): Promise<Driver> {
    return this.withDb(async (dbc) => {
      const values: InsertDriver = { ...data } as InsertDriver;
      if (
        values &&
        typeof (values as any).password === "string" &&
        (values as any).password.trim().length > 0
      ) {
        (values as any).password = await hashPassword(
          (values as any).password as unknown as string
        );
      }
      const [driver] = await dbc
        .insert(drivers)
        .values(values as any)
        .returning();
      return driver;
    });
  }

  async getDriverByEmail(email: string): Promise<Driver | null> {
    return this.withDb(async (dbc) => {
      const [driver] = await dbc
        .select()
        .from(drivers)
        .where(eq(drivers.email, email));
      return driver || null;
    });
  }

  // Note: PIN-based authentication has been removed in favor of credential-based auth.

  async getDrivers(): Promise<Driver[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(drivers).orderBy(asc(drivers.name))
    );
  }

  async getDriver(id: number): Promise<Driver | null> {
    return this.withDb(async (dbc) => {
      const [driver] = await dbc
        .select()
        .from(drivers)
        .where(eq(drivers.id, id));
      return driver || null;
    });
  }

  async updateDriver(
    id: number,
    updates: Partial<InsertDriver>
  ): Promise<Driver | null> {
    return this.withDb(async (dbc) => {
      const nextUpdates: Partial<InsertDriver> = { ...updates };
      if (
        typeof (nextUpdates as any).password === "string" &&
        (nextUpdates as any).password!.trim().length > 0
      ) {
        (nextUpdates as any).password = await hashPassword(
          (nextUpdates as any).password as unknown as string
        );
      }
      const [driver] = await dbc
        .update(drivers)
        .set(nextUpdates as any)
        .where(eq(drivers.id, id))
        .returning();
      return driver || null;
    });
  }

  async deleteDriver(id: number): Promise<void> {
    await this.withDb((dbc) => dbc.delete(drivers).where(eq(drivers.id, id)));
  }

  async updateDriverLocation(
    id: number,
    latitude: string,
    longitude: string
  ): Promise<Driver | null> {
    return this.withDb(async (dbc) => {
      const [driver] = await dbc
        .update(drivers)
        .set({ currentLatitude: latitude, currentLongitude: longitude })
        .where(eq(drivers.id, id))
        .returning();
      return driver || null;
    });
  }

  async getActiveDrivers(): Promise<Driver[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(drivers).where(eq(drivers.isActive, true))
    );
  }

  // Route operations
  async createRoute(data: InsertRoute): Promise<Route> {
    return this.withDb(async (dbc) => {
      const [route] = await dbc.insert(routes).values(data).returning();
      return route;
    });
  }

  async getRoutes(): Promise<Route[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(routes).orderBy(desc(routes.createdAt))
    );
  }

  async getRoute(id: number): Promise<Route | null> {
    return this.withDb(async (dbc) => {
      const [route] = await dbc.select().from(routes).where(eq(routes.id, id));
      return route || null;
    });
  }

  async updateRoute(
    id: number,
    updates: Partial<InsertRoute>
  ): Promise<Route | null> {
    return this.withDb(async (dbc) => {
      const [route] = await dbc
        .update(routes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(routes.id, id))
        .returning();
      return route || null;
    });
  }

  async getPickupsByRoute(routeId: number): Promise<PickupRequest[]> {
    return this.withDb(async (dbc) =>
      dbc
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.routeId, routeId))
    );
  }

  async getUnassignedPickups(): Promise<PickupRequest[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(pickupRequests).where(isNull(pickupRequests.routeId))
    );
  }

  async assignPickupsToRoute(
    routeId: number,
    pickupIds: number[]
  ): Promise<PickupRequest[]> {
    return this.withDb(async (dbc) => {
      const [pickups] = await dbc
        .update(pickupRequests)
        .set({ routeId })
        .where(eq(pickupRequests.id, pickupIds[0]))
        .returning();
      return [pickups];
    });
  }

  // Route stops operations
  async createMixedRoute(
    name: string,
    driverId: number | null,
    pickupIds: number[],
    deliveryRequests: any[]
  ): Promise<Route> {
    return this.withDb(async (dbc) => {
      const [route] = await dbc
        .insert(routes)
        .values({
          name,
          driverId,
          status: "pending",
        })
        .returning();
      return route;
    });
  }

  async getRouteStops(routeId: number): Promise<RouteStop[]> {
    return this.withDb(async (dbc) =>
      dbc.select().from(routeStops).where(eq(routeStops.routeId, routeId))
    );
  }

  async completeRouteStop(
    stopId: number,
    completionNotes?: string
  ): Promise<RouteStop | null> {
    return this.withDb(async (dbc) => {
      const [stop] = await dbc
        .update(routeStops)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          completionNotes,
        })
        .where(eq(routeStops.id, stopId))
        .returning();
      return stop || null;
    });
  }

  // Driver communication operations
  async getDriverMessages(driverId: number): Promise<any[]> {
    return this.withDb(async (dbc) =>
      dbc
        .select()
        .from(driverMessages)
        .where(
          or(
            eq(driverMessages.toDriverId, driverId),
            eq(driverMessages.fromDriverId, driverId)
          )
        )
        .orderBy(asc(driverMessages.timestamp))
    );
  }

  async updateDriverMessage(
    id: number,
    updates: Partial<{ isRead: boolean; deliveredAt: Date; readAt: Date }>
  ): Promise<any | null> {
    return this.withDb(async (dbc) => {
      const [row] = await (dbc as any)
        .update(driverMessages)
        .set({ ...updates })
        .where(eq(driverMessages.id, id))
        .returning();
      return row || null;
    });
  }

  async createDriverMessage(data: any): Promise<any> {
    return this.withDb(async (dbc) => {
      const [message] = await dbc
        .insert(driverMessages)
        .values(data)
        .returning();
      return message;
    });
  }

  async updateDriverStatus(data: any): Promise<any> {
    return this.withDb(async (dbc) => {
      const [update] = await dbc
        .insert(driverStatusUpdates)
        .values(data)
        .returning();
      return update;
    });
  }

  async getDriverStatusUpdates(): Promise<any[]> {
    return this.withDb(async (dbc) =>
      dbc
        .select()
        .from(driverStatusUpdates)
        .orderBy(desc(driverStatusUpdates.timestamp))
    );
  }

  async getOrCreateDriverRoute(driverId: number): Promise<Route> {
    // This is a simplified implementation
    return this.withDb(async (dbc) => {
      const [route] = await dbc
        .select()
        .from(routes)
        .where(eq(routes.driverId, driverId));
      if (route) return route;
      const [newRoute] = await dbc
        .insert(routes)
        .values({
          name: `Route for Driver ${driverId}`,
          driverId,
          status: "pending",
        })
        .returning();
      return newRoute;
    });
  }

  async assignPickupsToDriverRoute(
    driverId: number,
    pickupIds: number[]
  ): Promise<any> {
    // Simplified implementation
    return { success: true, assignedCount: pickupIds.length };
  }

  // Business operations (multi-tenant)
  async createBusiness(data: InsertBusiness): Promise<Business> {
    const [business] = await db.insert(businesses).values(data).returning();
    return business;
  }

  async getBusinesses(): Promise<Business[]> {
    return await db
      .select()
      .from(businesses)
      .orderBy(desc(businesses.createdAt));
  }

  async getBusiness(id: number): Promise<Business | null> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id));
    return business || null;
  }

  async updateBusinessStatus(
    id: number,
    status: "pending" | "active" | "suspended" | "canceled"
  ): Promise<Business | null> {
    const [business] = await db
      .update(businesses)
      .set({ status, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business || null;
  }

  async updateBusinessSubscription(
    id: number,
    subscriptionPlan: "starter" | "professional" | "enterprise",
    subscriptionStatus:
      | "active"
      | "suspended"
      | "canceled"
      | "trial"
      | "past_due"
  ): Promise<Business | null> {
    const [business] = await db
      .update(businesses)
      .set({
        subscriptionPlan,
        subscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, id))
      .returning();
    return business || null;
  }

  async updateBusinessInfo(
    id: number,
    updates: Partial<
      Pick<
        InsertBusiness,
        "businessName" | "phone" | "address" | "customDomain"
      >
    >
  ): Promise<Business | null> {
    const [business] = await db
      .update(businesses)
      .set({ ...(updates as any), updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business || null;
  }

  // Permanently delete a business and platform-level related data
  async deleteBusinessPlatformData(id: number): Promise<void> {
    // Delete platform-level children first to satisfy FK constraints
    await db
      .delete(businessSettings)
      .where(eq(businessSettings.businessId, id));
    await db
      .delete(businessEmployees)
      .where(eq(businessEmployees.businessId, id));
    await db
      .delete(businessAnalytics)
      .where(eq(businessAnalytics.businessId, id));
    // Finally, delete the business record
    await db.delete(businesses).where(eq(businesses.id, id));
  }

  // Business settings operations
  async getBusinessSettings(
    businessId: number
  ): Promise<BusinessSettings | null> {
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.businessId, businessId));
    return settings || null;
  }

  async createBusinessSettings(
    data: InsertBusinessSettings
  ): Promise<BusinessSettings> {
    const [settings] = await db
      .insert(businessSettings)
      .values(data)
      .returning();
    return settings;
  }

  async updateBusinessSettings(
    businessId: number,
    updates: Partial<InsertBusinessSettings>
  ): Promise<BusinessSettings | null> {
    const [settings] = await db
      .update(businessSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(businessSettings.businessId, businessId))
      .returning();
    return settings || null;
  }

  async upsertBusinessSettings(
    businessId: number,
    data: Partial<InsertBusinessSettings>
  ): Promise<BusinessSettings> {
    // Try to update first, if no rows affected, insert
    const updated = await this.updateBusinessSettings(businessId, data);
    if (updated) {
      return updated;
    }

    // If no existing settings, create new ones
    return this.createBusinessSettings({
      businessId,
      ...data,
    });
  }

  // Email operations
  async getEmailTemplates(): Promise<any[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.isActive, true));
  }

  // Business employee operations (tenant-agnostic: stored in shared schema keyed by businessId)
  async createBusinessEmployee(
    data: InsertBusinessEmployee
  ): Promise<BusinessEmployee> {
    const [row] = await db.insert(businessEmployees).values(data).returning();
    return row as BusinessEmployee;
  }

  async getBusinessEmployees(businessId: number): Promise<BusinessEmployee[]> {
    return (await db
      .select()
      .from(businessEmployees)
      .where(eq(businessEmployees.businessId, businessId))) as any;
  }

  async updateBusinessEmployee(
    id: number,
    updates: Partial<InsertBusinessEmployee>
  ): Promise<BusinessEmployee | null> {
    const nextUpdates: Partial<InsertBusinessEmployee> = { ...updates };
    if (
      typeof (nextUpdates as any).password === "string" &&
      (nextUpdates as any).password!.trim().length > 0
    ) {
      (nextUpdates as any).password = await hashPassword(
        (nextUpdates as any).password as unknown as string
      );
    }
    const [row] = await db
      .update(businessEmployees)
      .set({ ...(nextUpdates as any), updatedAt: new Date() })
      .where(eq(businessEmployees.id, id))
      .returning();
    return (row as BusinessEmployee) || null;
  }

  async deleteBusinessEmployee(id: number): Promise<void> {
    await db.delete(businessEmployees).where(eq(businessEmployees.id, id));
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<any> {
    const [template] = await db.insert(emailTemplates).values(data).returning();
    return template;
  }

  async updateEmailTemplate(
    id: number,
    updates: Partial<InsertEmailTemplate>
  ): Promise<any> {
    const [template] = await db
      .update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || null;
  }

  async getEmailTemplateByType(templateType: string): Promise<any | null> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.isActive, true),
          eq(emailTemplates.templateType, templateType)
        )
      )
      .limit(1);
    return template || null;
  }

  async createEmailLog(data: InsertEmailLog): Promise<any> {
    // Store in shared schema to avoid tenant-specific table requirements
    const [row] = await db.insert(emailAutomationLog).values(data).returning();
    return row;
  }

  async getEmailLogs(
    customerId?: number,
    pickupRequestId?: number
  ): Promise<any[]> {
    const conditions = [] as any[];
    const hasTenantContext =
      !!this.tenantContext.tenant || !!this.tenantContext.businessId;

    if (customerId) {
      conditions.push(eq(emailAutomationLog.customerId, customerId));
    }
    if (pickupRequestId) {
      conditions.push(eq(emailAutomationLog.pickupRequestId, pickupRequestId));
    }

    // If tenant context exists and no explicit pickup filter, scope to tenant's pickup IDs
    if (hasTenantContext && !pickupRequestId) {
      const ids = await this.withDb(async (dbc) =>
        dbc.select({ id: pickupRequests.id }).from(pickupRequests)
      );
      const tenantPickupIds = ids
        .map((r) => r.id)
        .filter((id): id is number => typeof id === "number");
      if (tenantPickupIds.length === 0) return [];
      conditions.push(
        inArray(emailAutomationLog.pickupRequestId, tenantPickupIds)
      );
    }

    const base = db.select().from(emailAutomationLog);
    const rows =
      conditions.length > 0
        ? await base
            .where(and(...conditions))
            .orderBy(desc(emailAutomationLog.sentAt))
        : await base.orderBy(desc(emailAutomationLog.sentAt));
    return rows as any[];
  }
}

// Legacy default export (non-tenant). Prefer getStorage(req) in route handlers.
export const storage = new Storage();

export function getStorage(req: Request): Storage {
  const context = getTenantContextFromRequest(req);
  return new Storage(context);
}
