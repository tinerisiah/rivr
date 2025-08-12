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
  type InsertCustomer,
  type InsertPickupRequest,
  type InsertQuoteRequest,
  type InsertDriver,
  type InsertRoute,
  type InsertRouteStop,
  type InsertBusiness,
  type InsertRivrAdmin,
  type InsertBusinessAnalytics,
  type InsertEmailTemplate,
  type InsertEmailLog,
} from "@repo/schema";
import { eq, and, desc, asc, isNull, isNotNull, or } from "drizzle-orm";
import { randomUUID } from "crypto";

class Storage {
  private readonly tenantContext: TenantContext;

  constructor(tenantContext: TenantContext = {}) {
    this.tenantContext = tenantContext;
  }
  private async withDb<T>(fn: (dbc: typeof db) => Promise<T>): Promise<T> {
    if (!this.tenantContext.tenant) {
      if (process.env.ENFORCE_TENANT === "true") {
        throw new Error("Tenant context required for this operation");
      }
      return fn(db);
    }
    // Neon HTTP driver doesn't support transactions or session state.
    // Until a connection-oriented driver is used, fall back to shared schema.
    // Note: This means tenant isolation via search_path isn't applied here.
    return fn(db);
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
    const [customer] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || null;
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
    status: string
  ): Promise<PickupRequest | null> {
    return this.withDb(async (dbc) => {
      const [request] = await dbc
        .update(pickupRequests)
        .set({ productionStatus: status as any })
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

  // Driver operations
  async createDriver(data: InsertDriver): Promise<Driver> {
    return this.withDb(async (dbc) => {
      const [driver] = await dbc.insert(drivers).values(data).returning();
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
      const [driver] = await dbc
        .update(drivers)
        .set(updates)
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

  // Email operations
  async getEmailTemplates(): Promise<any[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.isActive, true));
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

  async getEmailLogs(
    customerId?: number,
    pickupRequestId?: number
  ): Promise<any[]> {
    const conditions = [] as any[];

    if (customerId) {
      conditions.push(eq(emailAutomationLog.customerId, customerId));
    }

    if (pickupRequestId) {
      conditions.push(eq(emailAutomationLog.pickupRequestId, pickupRequestId));
    }

    const rows = await this.withDb(async (dbc) => {
      const base = dbc.select().from(emailAutomationLog);
      if (conditions.length > 0) {
        return base
          .where(and(...conditions))
          .orderBy(desc(emailAutomationLog.sentAt));
      }
      return base.orderBy(desc(emailAutomationLog.sentAt));
    });
    return rows as any[];
  }
}

// Legacy default export (non-tenant). Prefer getStorage(req) in route handlers.
export const storage = new Storage();

export function getStorage(req: Request): Storage {
  const context = getTenantContextFromRequest(req);
  return new Storage(context);
}
