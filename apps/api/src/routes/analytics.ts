import type { Express } from "express";
import { log } from "@repo/logger";
import { authenticateToken } from "../auth";
import { requirePermission, requireTenantMatch } from "../auth/rbac";
import { getStorage } from "../storage";
import { db } from "../db";
import { businesses } from "@repo/schema";
import { getWebSocketMetrics } from "./websocket-routes";

type CacheEntry = { data: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const setCache = (key: string, data: unknown, ttlMs: number) => {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
};
const getCache = (key: string) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

export function registerAnalyticsRoutes(app: Express) {
  // Per-tenant analytics summary (business admin scope)
  app.get(
    "/api/analytics/business/summary",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const businessId = (req as any).businessId as number | undefined;
        if (!businessId) {
          return res.status(400).json({ error: "Tenant context required" });
        }
        const cacheKey = `biz_sum_${businessId}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const storage = getStorage(req);
        const [requests, customers, drivers] = await Promise.all([
          storage.getPickupRequests(),
          storage.getCustomers(),
          storage.getDrivers(),
        ]);

        const now = Date.now();
        const completed = requests.filter(
          (r: any) => r.isCompleted && r.completedAt
        );
        const avgCompletionMinutes =
          completed.length === 0
            ? 0
            : Math.round(
                completed.reduce((acc: number, r: any) => {
                  const created = new Date(r.createdAt).getTime();
                  const done = new Date(r.completedAt).getTime();
                  return acc + Math.max(0, done - created);
                }, 0) /
                  completed.length /
                  60000
              );

        const summary = {
          businessId,
          totals: {
            totalPickups: requests.length,
            completedPickups: completed.length,
            inProcess: requests.filter(
              (r: any) => r.productionStatus === "in_process"
            ).length,
            readyForDelivery: requests.filter(
              (r: any) => r.productionStatus === "ready_for_delivery"
            ).length,
            readyToBill: requests.filter(
              (r: any) => r.productionStatus === "ready_to_bill"
            ).length,
            billed: requests.filter((r: any) => r.productionStatus === "billed")
              .length,
          },
          activeCustomers: customers.length,
          activeDrivers: drivers.filter((d: any) => d.isActive).length,
          averageCompletionMinutes: avgCompletionMinutes,
          generatedAt: now,
        };

        setCache(cacheKey, summary, 60_000);
        res.json(summary);
      } catch (error) {
        log("error", "Failed to compute tenant analytics", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to compute analytics" });
      }
    }
  );

  // Cross-business analytics (exec scope)
  app.get(
    "/api/analytics/platform/summary",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const cacheKey = `platform_sum`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const storage = getStorage(req);
        const businesses = await storage.getBusinesses();

        // Compute per-business summaries (shallow sample metrics)
        const perBusiness = await Promise.all(
          businesses.map(async (b: any) => {
            // Create a storage bound to this tenant's schema for analytics
            const tenantStorage = new (storage as any).constructor({
              tenant: b.databaseSchema,
              businessId: b.id,
            });
            const [requests, drivers] = await Promise.all([
              tenantStorage.getPickupRequests(),
              tenantStorage.getDrivers(),
            ]);

            const billed = requests.filter(
              (r: any) => r.productionStatus === "billed"
            );
            const completed = requests.filter((r: any) => r.isCompleted);
            const avgMinutes =
              completed.length === 0
                ? 0
                : Math.round(
                    completed.reduce((acc: number, r: any) => {
                      const created = new Date(r.createdAt).getTime();
                      const done = new Date(
                        r.completedAt || r.createdAt
                      ).getTime();
                      return acc + Math.max(0, done - created);
                    }, 0) /
                      completed.length /
                      60000
                  );

            return {
              businessId: b.id,
              businessName: b.businessName,
              status: b.status,
              subscriptionStatus: b.subscriptionStatus,
              monthlyRevenue: b.monthlyRevenue || 0,
              totals: {
                totalPickups: requests.length,
                completedPickups: completed.length,
                billed: billed.length,
              },
              activeDrivers: drivers.filter((d: any) => d.isActive).length,
              averageCompletionMinutes: avgMinutes,
            };
          })
        );

        const summary = {
          businesses: perBusiness,
          totals: {
            businesses: businesses.length,
            activeBusinesses: businesses.filter(
              (b: any) => b.status === "active"
            ).length,
            totalMonthlyRevenue: perBusiness.reduce(
              (sum, b) => sum + (b.monthlyRevenue || 0),
              0
            ),
            totalPickups: perBusiness.reduce(
              (sum, b) => sum + b.totals.totalPickups,
              0
            ),
            billed: perBusiness.reduce((sum, b) => sum + b.totals.billed, 0),
          },
          generatedAt: Date.now(),
        };

        // Cache for 60s
        setCache(cacheKey, summary, 60_000);
        res.json(summary);
      } catch (error) {
        log("error", "Failed to compute platform analytics", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to compute analytics" });
      }
    }
  );

  // Platform health endpoint
  app.get(
    "/api/admin/health",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const startedAt = Date.now();
        // DB check (simple select 1 and count businesses)
        let dbOk = false;
        let dbLatencyMs = 0;
        let businessCount = 0;
        try {
          const t0 = Date.now();
          const all = await db.select({ id: businesses.id }).from(businesses);
          dbLatencyMs = Date.now() - t0;
          dbOk = true;
          businessCount = all.length;
        } catch (e) {
          dbOk = false;
        }

        // Auth health: presence of user from token
        const authOk = !!req.user;

        // WebSocket metrics
        const ws = getWebSocketMetrics();

        // Basic email check stub (no provider wired here)
        const emailOk = true;

        const payload = {
          ok: dbOk && authOk,
          checks: {
            db: { ok: dbOk, latencyMs: dbLatencyMs, businessCount },
            auth: { ok: authOk },
            websocket: ws,
            email: { ok: emailOk },
          },
          generatedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
        };
        res.json(payload);
      } catch (error) {
        log("error", "Platform health failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ ok: false, error: "Health check failed" });
      }
    }
  );

  // Tenant health endpoint
  app.get(
    "/api/admin/health/tenant/:id",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const businessId = parseInt(req.params.id);
        if (Number.isNaN(businessId)) {
          return res
            .status(400)
            .json({ ok: false, error: "Invalid businessId" });
        }
        const startedAt = Date.now();
        const storage = getStorage(req as any);
        // Create a storage bound to this tenant using its schema
        const baseStorage = getStorage(req);
        const base = await baseStorage.getBusiness(businessId);
        if (!base)
          return res
            .status(404)
            .json({ ok: false, error: "Business not found" });

        const tenantStorage = new (storage as any).constructor({
          tenant: base.databaseSchema,
          businessId,
        });

        // Run a few queries to validate tenant data access
        let customersOk = false;
        let driversOk = false;
        let requestsOk = false;
        let timings: Record<string, number> = {};
        try {
          const t0 = Date.now();
          await tenantStorage.getCustomers();
          timings.customersMs = Date.now() - t0;
          customersOk = true;
        } catch {}
        try {
          const t0 = Date.now();
          await tenantStorage.getDrivers();
          timings.driversMs = Date.now() - t0;
          driversOk = true;
        } catch {}
        try {
          const t0 = Date.now();
          await tenantStorage.getPickupRequests();
          timings.requestsMs = Date.now() - t0;
          requestsOk = true;
        } catch {}

        const ok = customersOk && driversOk && requestsOk;
        res.json({
          ok,
          businessId,
          tenant: base.databaseSchema,
          checks: {
            customers: {
              ok: customersOk,
              latencyMs: timings.customersMs ?? null,
            },
            drivers: { ok: driversOk, latencyMs: timings.driversMs ?? null },
            requests: { ok: requestsOk, latencyMs: timings.requestsMs ?? null },
          },
          latencyMs: Date.now() - startedAt,
        });
      } catch (error) {
        log("error", "Tenant health failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ ok: false, error: "Tenant health failed" });
      }
    }
  );
}
