import type { Express } from "express";
import { z } from "zod";
import { log } from "@repo/logger";
import { getStorage } from "../storage";
import { routeOptimizer } from "../route-optimizer";
import {
  insertCustomerSchema,
  insertDriverSchema,
  insertBusinessSchema,
  adminCompletePickupSchema,
  optimizeRouteSchema,
} from "@repo/schema";
import { authenticateToken } from "../auth";
import { requirePermission, requireTenantMatch } from "../auth/rbac";

export function registerAdminRoutes(app: Express) {
  // Customer management routes (tenant-scoped)
  app.get(
    "/api/admin/customers",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const customers = await storage.getCustomers();
        res.json({ success: true, customers });
      } catch (error) {
        log("error", "Failed to fetch customers", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch customers",
        });
      }
    }
  );

  app.post(
    "/api/admin/customers",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const customerData = insertCustomerSchema.parse(req.body);
        const customer = await storage.createCustomer(customerData);

        res.json({
          success: true,
          customer,
          message: "Customer created successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid customer data",
            errors: error.errors,
          });
        } else {
          log("error", "Failed to create customer", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.status(500).json({
            success: false,
            message: "Failed to create customer",
          });
        }
      }
    }
  );

  app.put(
    "/api/admin/customers/:id",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const customerId = parseInt(req.params.id);
        const customerData = insertCustomerSchema.parse(req.body);
        const customer = await storage.updateCustomer(customerId, customerData);

        res.json({
          success: true,
          customer,
          message: "Customer updated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid customer data",
            errors: error.errors,
          });
        } else {
          log("error", "Failed to update customer", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.status(500).json({
            success: false,
            message: "Failed to update customer",
          });
        }
      }
    }
  );

  // Request management routes
  app.get(
    "/api/admin/pickup-requests",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const requests = await storage.getPickupRequests();
        res.json({ success: true, requests });
      } catch (error) {
        log("error", "Failed to fetch pickup requests", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch pickup requests",
        });
      }
    }
  );

  app.get(
    "/api/admin/quote-requests",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const requests = await storage.getQuoteRequests();
        res.json({ success: true, requests });
      } catch (error) {
        log("error", "Failed to fetch quote requests", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch quote requests",
        });
      }
    }
  );

  app.post(
    "/api/admin/complete-pickup",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const completionData = adminCompletePickupSchema.parse(req.body);
        const updatedRequest = await storage.adminCompletePickupRequest(
          completionData.id,
          completionData
        );

        res.json({
          success: true,
          request: updatedRequest,
          message: "Pickup completed successfully",
        });
      } catch (error) {
        log("error", "Error completing pickup", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid completion data",
            errors: error.errors,
          });
        } else {
          res.status(500).json({
            success: false,
            message: (error as Error).message || "Failed to complete pickup",
          });
        }
      }
    }
  );

  // Driver management routes
  app.get(
    "/api/admin/drivers",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const drivers = await storage.getDrivers();
        res.json({ success: true, drivers });
      } catch (error) {
        log("error", "Failed to fetch drivers", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch drivers",
        });
      }
    }
  );

  app.post(
    "/api/admin/drivers",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const driverData = insertDriverSchema.parse(req.body);
        const driver = await storage.createDriver(driverData);

        res.json({
          success: true,
          driver,
          message: "Driver created successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid driver data",
            errors: error.errors,
          });
        } else {
          log("error", "Failed to create driver", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.status(500).json({
            success: false,
            message: "Failed to create driver",
          });
        }
      }
    }
  );

  app.put(
    "/api/admin/drivers/:id",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const driverId = parseInt(req.params.id);
        const driverData = insertDriverSchema.parse(req.body);
        const driver = await storage.updateDriver(driverId, driverData);

        res.json({
          success: true,
          driver,
          message: "Driver updated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid driver data",
            errors: error.errors,
          });
        } else {
          log("error", "Failed to update driver", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.status(500).json({
            success: false,
            message: "Failed to update driver",
          });
        }
      }
    }
  );

  app.delete(
    "/api/admin/drivers/:id",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const driverId = parseInt(req.params.id);
        await storage.deleteDriver(driverId);

        res.json({
          success: true,
          message: "Driver deleted successfully",
        });
      } catch (error) {
        log("error", "Failed to delete driver", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to delete driver",
        });
      }
    }
  );

  // Business management routes
  app.get(
    "/api/admin/businesses",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businesses = await storage.getBusinesses();
        res.json({ success: true, businesses });
      } catch (error) {
        log("error", "Failed to fetch businesses", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch businesses",
        });
      }
    }
  );

  app.post(
    "/api/admin/businesses",
    authenticateToken,
    requirePermission("admin:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businessData = insertBusinessSchema.parse(req.body);
        const business = await storage.createBusiness(businessData);

        res.json({
          success: true,
          business,
          message: "Business created successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid business data",
            errors: error.errors,
          });
        } else {
          log("error", "Failed to create business", {
            error: error instanceof Error ? error.message : String(error),
          });
          res.status(500).json({
            success: false,
            message: "Failed to create business",
          });
        }
      }
    }
  );

  // Cross-tenant data access (exec scope)
  app.get(
    "/api/admin/tenants/:id/customers",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const businessId = parseInt(req.params.id);
        if (Number.isNaN(businessId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid businessId" });
        }
        const baseStorage = getStorage(req);
        const base = await baseStorage.getBusiness(businessId);
        if (!base)
          return res
            .status(404)
            .json({ success: false, message: "Business not found" });
        const tenantStorage = new (baseStorage as any).constructor({
          tenant: base.databaseSchema,
          businessId,
        });
        const customers = await tenantStorage.getCustomers();
        res.json({ success: true, customers });
      } catch (error) {
        log("error", "Failed to fetch tenant customers", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch tenant customers",
        });
      }
    }
  );

  app.get(
    "/api/admin/tenants/:id/drivers",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const businessId = parseInt(req.params.id);
        if (Number.isNaN(businessId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid businessId" });
        }
        const baseStorage = getStorage(req);
        const base = await baseStorage.getBusiness(businessId);
        if (!base)
          return res
            .status(404)
            .json({ success: false, message: "Business not found" });
        const tenantStorage = new (baseStorage as any).constructor({
          tenant: base.databaseSchema,
          businessId,
        });
        const drivers = await tenantStorage.getDrivers();
        res.json({ success: true, drivers });
      } catch (error) {
        log("error", "Failed to fetch tenant drivers", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch tenant drivers",
        });
      }
    }
  );

  app.get(
    "/api/admin/tenants/:id/pickup-requests",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const businessId = parseInt(req.params.id);
        if (Number.isNaN(businessId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid businessId" });
        }
        const baseStorage = getStorage(req);
        const base = await baseStorage.getBusiness(businessId);
        if (!base)
          return res
            .status(404)
            .json({ success: false, message: "Business not found" });
        const tenantStorage = new (baseStorage as any).constructor({
          tenant: base.databaseSchema,
          businessId,
        });
        const requests = await tenantStorage.getPickupRequests();
        res.json({ success: true, requests });
      } catch (error) {
        log("error", "Failed to fetch tenant pickup requests", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch tenant pickup requests",
        });
      }
    }
  );

  app.put(
    "/api/admin/businesses/:id/status",
    authenticateToken,
    requirePermission("admin:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businessId = parseInt(req.params.id);
        const { status } = req.body;

        if (!["pending", "active", "suspended", "canceled"].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "Invalid status value",
          });
        }

        const business = await storage.updateBusinessStatus(businessId, status);

        res.json({
          success: true,
          business,
          message: `Business status updated to ${status}`,
        });
      } catch (error) {
        log("error", "Failed to update business status", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to update business status",
        });
      }
    }
  );

  app.put(
    "/api/admin/businesses/:id/subscription",
    authenticateToken,
    requirePermission("admin:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businessId = parseInt(req.params.id);
        const { subscriptionPlan, subscriptionStatus } = req.body;

        const business = await storage.updateBusinessSubscription(
          businessId,
          subscriptionPlan,
          subscriptionStatus
        );

        res.json({
          success: true,
          business,
          message: "Business subscription updated successfully",
        });
      } catch (error) {
        log("error", "Failed to update business subscription", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to update business subscription",
        });
      }
    }
  );

  // Route management routes
  app.get(
    "/api/admin/routes",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const routes = await storage.getRoutes();
        res.json({ success: true, routes });
      } catch (error) {
        log("error", "Failed to fetch routes", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch routes",
        });
      }
    }
  );

  app.post(
    "/api/admin/routes/optimize",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const { pickupIds, driverId } = optimizeRouteSchema.parse(req.body);
        const route = await routeOptimizer.createOptimizedRoute(
          pickupIds,
          driverId
        );
        res.json({ success: true, route });
      } catch (error) {
        log("error", "Error optimizing route", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to optimize route" });
      }
    }
  );

  // Email management routes
  app.get(
    "/api/admin/email-templates",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const templates = await storage.getEmailTemplates();
        res.json({ success: true, templates });
      } catch (error) {
        log("error", "Failed to fetch email templates", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch email templates",
        });
      }
    }
  );

  app.get(
    "/api/admin/email-logs",
    authenticateToken,
    requirePermission("admin:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const logs = await storage.getEmailLogs();
        res.json({ success: true, logs });
      } catch (error) {
        log("error", "Failed to fetch email logs", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch email logs",
        });
      }
    }
  );
}
