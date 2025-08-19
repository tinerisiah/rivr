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
import { db } from "../db";
import { businesses, insertBusinessEmployeeSchema } from "@repo/schema";
import {
  provisionTenantSchema,
  deriveTenantSchemaFromSubdomain,
} from "../lib/tenant-db";

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
        const isExec =
          (req as any).tenant === "rivr_exec" ||
          req.user?.role === "rivr_admin";

        if (isExec) {
          const bizList = await db.select().from(businesses);
          const all: any[] = [];
          for (const b of bizList as any[]) {
            try {
              const tenantStorage = new (storage as any).constructor({
                tenant: b.databaseSchema,
                businessId: b.id,
              });
              const list = await tenantStorage.getCustomers();
              all.push(...list);
            } catch (e) {
              log("warn", "Skipping tenant while aggregating customers", {
                businessId: (b as any).id,
              });
            }
          }
          return res.json({ success: true, customers: all });
        }

        const customers = await storage.getCustomers();
        return res.json({ success: true, customers });
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
        const isExec =
          (req as any).tenant === "rivr_exec" ||
          req.user?.role === "rivr_admin";

        if (isExec) {
          const bizList = await db.select().from(businesses);
          const all: any[] = [];
          for (const b of bizList as any[]) {
            try {
              const tenantStorage = new (storage as any).constructor({
                tenant: b.databaseSchema,
                businessId: b.id,
              });
              const list = await tenantStorage.getPickupRequests();
              all.push(...list);
            } catch (e) {
              log("warn", "Skipping tenant while aggregating pickup requests", {
                businessId: (b as any).id,
              });
            }
          }
          return res.json({ success: true, requests: all });
        }

        const requests = await storage.getPickupRequests();
        return res.json({ success: true, requests });
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

  app.put(
    "/api/admin/pickup-requests/:id/production-status",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const pickupId = parseInt(req.params.id);
        if (Number.isNaN(pickupId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid pickup request id" });
        }

        const bodySchema = z.object({
          productionStatus: z.string().min(1, "productionStatus is required"),
        });
        const { productionStatus } = bodySchema.parse(req.body);

        const updated = await storage.updatePickupRequestProductionStatus(
          pickupId,
          productionStatus
        );

        if (!updated) {
          return res
            .status(404)
            .json({ success: false, message: "Pickup request not found" });
        }

        // Send email based on template for this production status
        try {
          const template =
            await storage.getEmailTemplateByType(productionStatus);
          if (template && updated.email) {
            const { renderEmailBodyTemplate, sendEmail } = await import(
              "../email-utils"
            );
            const html = renderEmailBodyTemplate(template.bodyTemplate, {
              firstName: updated.firstName,
              lastName: updated.lastName,
              businessName: updated.businessName,
              address: updated.address,
              roNumber: (updated as any).roNumber,
              productionStatus: updated.productionStatus,
            });
            const subject = template.subject;
            const sentBy = req.user?.email || "system@rivr.app";
            const sendResult = await sendEmail({
              to: updated.email,
              subject,
              html,
            });
            await storage.createEmailLog({
              customerId: updated.customerId,
              pickupRequestId: updated.id,
              templateType: productionStatus,
              recipientEmail: updated.email,
              subject,
              sentBy,
              status: sendResult.success ? "sent" : "failed",
              errorMessage: sendResult.success ? undefined : sendResult.error,
            } as any);
          }
        } catch (e) {
          // Non-blocking: log but continue response
          log("error", "Failed to process status change email", {
            error: e instanceof Error ? e.message : String(e),
          });
        }

        // Broadcast production status update to tenant room (admins/drivers)
        const tenantId = (req as any).businessId as number | undefined;
        if (tenantId) {
          const { broadcastToDrivers } = await import("./websocket-routes");
          broadcastToDrivers(tenantId, {
            type: "PRODUCTION_STATUS_UPDATED",
            data: { id: pickupId, productionStatus },
          });
        }

        res.json({
          success: true,
          request: updated,
          message: "Production status updated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid request body",
            errors: error.errors,
          });
        }
        log("error", "Failed to update production status", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to update production status",
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
        const isExec =
          (req as any).tenant === "rivr_exec" ||
          req.user?.role === "rivr_admin";

        if (isExec) {
          const bizList = await db.select().from(businesses);
          const all: any[] = [];
          for (const b of bizList as any[]) {
            try {
              const tenantStorage = new (storage as any).constructor({
                tenant: b.databaseSchema,
                businessId: b.id,
              });
              const list = await tenantStorage.getQuoteRequests();
              all.push(...list);
            } catch (e) {
              log("warn", "Skipping tenant while aggregating quote requests", {
                businessId: (b as any).id,
              });
            }
          }
          return res.json({ success: true, requests: all });
        }

        const requests = await storage.getQuoteRequests();
        return res.json({ success: true, requests });
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

  app.get(
    "/api/admin/quote-reply/:id",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid quote id" });
        }
        const quote = await storage.getQuoteRequest(id);
        if (!quote) {
          return res
            .status(404)
            .json({ success: false, message: "Quote request not found" });
        }
        const { createQuoteReplyEmail } = await import("../email-utils");
        const emailLink = createQuoteReplyEmail(quote);
        res.json({ success: true, emailLink });
      } catch (error) {
        log("error", "Failed to build quote reply link", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to build reply link" });
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

        // Optionally trigger email if a template for in_process exists
        try {
          if (updatedRequest) {
            const template = await storage.getEmailTemplateByType("in_process");
            if (template && updatedRequest.email) {
              const { renderEmailBodyTemplate, sendEmail } = await import(
                "../email-utils"
              );
              const html = renderEmailBodyTemplate(template.bodyTemplate, {
                firstName: updatedRequest.firstName,
                lastName: updatedRequest.lastName,
                businessName: updatedRequest.businessName,
                address: updatedRequest.address,
                roNumber: (updatedRequest as any).roNumber,
                productionStatus: updatedRequest.productionStatus,
              });
              const subject = template.subject;
              const sentBy = req.user?.email || "system@rivr.app";
              const sendResult = await sendEmail({
                to: updatedRequest.email,
                subject,
                html,
              });
              await storage.createEmailLog({
                customerId: updatedRequest.customerId,
                pickupRequestId: updatedRequest.id,
                templateType: "in_process",
                recipientEmail: updatedRequest.email,
                subject,
                sentBy,
                status: sendResult.success ? "sent" : "failed",
                errorMessage: sendResult.success ? undefined : sendResult.error,
              } as any);
            }
          }
        } catch (e) {
          // Non-blocking
        }

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
        const isExec =
          (req as any).tenant === "rivr_exec" ||
          req.user?.role === "rivr_admin";

        if (isExec) {
          const bizList = await db.select().from(businesses);
          const all: any[] = [];
          for (const b of bizList as any[]) {
            try {
              const tenantStorage = new (storage as any).constructor({
                tenant: b.databaseSchema,
                businessId: b.id,
              });
              const list = await tenantStorage.getDrivers();
              all.push(...list);
            } catch (e) {
              log("warn", "Skipping tenant while aggregating drivers", {
                businessId: (b as any).id,
              });
            }
          }
          return res.json({ success: true, drivers: all });
        }

        const drivers = await storage.getDrivers();
        return res.json({ success: true, drivers });
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

  // Business info for the current tenant (business admin scope)
  app.get(
    "/api/admin/business-info",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const businessId = (req as any).businessId as number | undefined;
        if (!businessId) {
          return res
            .status(400)
            .json({ success: false, message: "Business ID is required" });
        }
        const storage = getStorage(req);
        const business = await storage.getBusiness(businessId);
        if (!business) {
          return res
            .status(404)
            .json({ success: false, message: "Business not found" });
        }
        return res.json({ success: true, business });
      } catch (error) {
        log("error", "Failed to fetch business info", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch business info" });
      }
    }
  );

  app.put(
    "/api/admin/business-info",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const businessId = (req as any).businessId as number | undefined;
        if (!businessId) {
          return res
            .status(400)
            .json({ success: false, message: "Business ID is required" });
        }

        const updateSchema = z
          .object({
            businessName: z.string().min(2).optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            customDomain: z
              .string()
              .regex(/^[^.]+\.[^.]+(\.[^.]+)*$/)
              .optional(),
          })
          .refine((v) => Object.keys(v).length > 0, {
            message: "At least one field is required",
          });
        const updates = updateSchema.parse(req.body);

        const storage = getStorage(req);
        const updated = await storage.updateBusinessInfo(businessId, updates);
        if (!updated) {
          return res
            .status(404)
            .json({ success: false, message: "Business not found" });
        }
        return res.json({
          success: true,
          business: updated,
          message: "Business information updated successfully",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid business info",
            errors: error.errors,
          });
        }
        log("error", "Failed to update business info", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to update business info" });
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
        // Allow callers to omit databaseSchema; derive from subdomain when absent
        const incoming = req.body as any;
        const payload = {
          ...incoming,
          databaseSchema:
            typeof incoming?.databaseSchema === "string" &&
            incoming.databaseSchema.trim().length > 0
              ? incoming.databaseSchema
              : deriveTenantSchemaFromSubdomain(incoming?.subdomain ?? ""),
        };
        const businessData = insertBusinessSchema.parse(payload);
        const business = await storage.createBusiness(businessData);

        // Provision tenant schema immediately for the newly created business
        try {
          await provisionTenantSchema(business.databaseSchema);
        } catch (e) {
          log("warn", "Tenant schema provisioning failed after admin create", {
            error: e instanceof Error ? e.message : String(e),
            schema: (business as any).databaseSchema,
            businessId: (business as any).id,
          });
        }

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
        const isExec =
          (req as any).tenant === "rivr_exec" ||
          req.user?.role === "rivr_admin";

        if (isExec) {
          const bizList = await db.select().from(businesses);
          const all: any[] = [];
          for (const b of bizList as any[]) {
            try {
              const tenantStorage = new (storage as any).constructor({
                tenant: b.databaseSchema,
                businessId: b.id,
              });
              const list = await tenantStorage.getRoutes();
              all.push(...list);
            } catch (e) {
              log("warn", "Skipping tenant while aggregating routes", {
                businessId: (b as any).id,
              });
            }
          }
          return res.json({ success: true, routes: all });
        }

        const routes = await storage.getRoutes();
        return res.json({ success: true, routes });
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
    requirePermission("business:read"),
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

  // Business employee (view-only) management
  app.get(
    "/api/admin/employees",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const businessId = (req as any).businessId as number | undefined;
        if (!businessId) {
          return res
            .status(400)
            .json({ success: false, message: "Business ID is required" });
        }
        const storage = getStorage(req);
        const employees = await storage.getBusinessEmployees(businessId);
        res.json({ success: true, employees });
      } catch (error) {
        log("error", "Failed to fetch employees", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch employees" });
      }
    }
  );

  app.post(
    "/api/admin/employees",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const businessId = (req as any).businessId as number | undefined;
        if (!businessId) {
          return res
            .status(400)
            .json({ success: false, message: "Business ID is required" });
        }
        const payload = insertBusinessEmployeeSchema
          .extend({ password: z.string().min(8) })
          .parse({ ...req.body, businessId });
        const storage = getStorage(req);
        const hashed = await (
          await import("../auth")
        ).hashPassword(payload.password);
        const employee = await storage.createBusinessEmployee({
          businessId,
          name: payload.name,
          email: payload.email,
          password: hashed,
          isActive: true,
        } as any);
        res.json({ success: true, employee });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid employee data",
            errors: error.errors,
          });
        }
        log("error", "Failed to create employee", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to create employee" });
      }
    }
  );

  app.delete(
    "/api/admin/employees/:id",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid employee id" });
        }
        const storage = getStorage(req);
        await storage.deleteBusinessEmployee(id);
        res.json({ success: true, message: "Employee deleted" });
      } catch (error) {
        log("error", "Failed to delete employee", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to delete employee" });
      }
    }
  );

  app.post(
    "/api/admin/email-templates",
    authenticateToken,
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const { insertEmailTemplateSchema } = await import("@repo/schema");
        const templateData = insertEmailTemplateSchema.parse(req.body);
        const template = await storage.createEmailTemplate(templateData);
        res.json({
          success: true,
          template,
          message: "Email template created",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid template data",
            errors: error.errors,
          });
        }
        log("error", "Failed to create email template", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to create email template",
        });
      }
    }
  );

  app.put(
    "/api/admin/email-templates/:id",
    authenticateToken,
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid template id" });
        }
        const updateSchema = z
          .object({
            subject: z.string().min(1).optional(),
            bodyTemplate: z.string().min(1).optional(),
            isActive: z.boolean().optional(),
            templateType: z.string().optional(),
          })
          .refine((v) => Object.keys(v).length > 0, {
            message: "At least one field is required",
          });
        const updates = updateSchema.parse(req.body);
        const storage = getStorage(req);
        const template = await storage.updateEmailTemplate(id, updates as any);
        if (!template) {
          return res
            .status(404)
            .json({ success: false, message: "Template not found" });
        }
        res.json({ success: true, template, message: "Template updated" });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid template update",
            errors: error.errors,
          });
        }
        log("error", "Failed to update email template", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to update email template",
        });
      }
    }
  );

  app.get(
    "/api/admin/email-logs",
    authenticateToken,
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const customerId = req.query.customerId
          ? Number(req.query.customerId)
          : undefined;
        const pickupRequestId = req.query.pickupRequestId
          ? Number(req.query.pickupRequestId)
          : undefined;
        const logs = await storage.getEmailLogs(customerId, pickupRequestId);
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

  // Business settings routes
  app.get(
    "/api/admin/business-settings",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businessId = (req as any).businessId;

        if (!businessId) {
          return res.status(400).json({
            success: false,
            message: "Business ID is required",
          });
        }

        const settings = await storage.getBusinessSettings(businessId);
        return res.json({ success: true, settings });
      } catch (error) {
        log("error", "Failed to fetch business settings", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch business settings",
        });
      }
    }
  );

  app.put(
    "/api/admin/business-settings",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("business:write"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const businessId = (req as any).businessId;

        if (!businessId) {
          return res.status(400).json({
            success: false,
            message: "Business ID is required",
          });
        }

        const {
          customLogo,
          customBranding,
          emailSettings,
          notificationSettings,
        } = req.body;

        const settings = await storage.upsertBusinessSettings(businessId, {
          customLogo,
          customBranding,
          emailSettings,
          notificationSettings,
        });

        res.json({
          success: true,
          settings,
          message: "Business settings updated successfully",
        });
      } catch (error) {
        log("error", "Failed to update business settings", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to update business settings",
        });
      }
    }
  );
}
