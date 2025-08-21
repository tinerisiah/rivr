import type { Express } from "express";
import { z } from "zod";
import { log } from "@repo/logger";
import { getStorage } from "../storage";
import { broadcastToDrivers, sendToDriver } from "./websocket-routes";
import { authenticateToken } from "../auth";
import { requirePermission, requireTenantMatch } from "../auth/rbac";
import { insertPickupRequestSchema } from "@repo/schema";

export function registerDriverRoutes(app: Express) {
  // PIN-based authentication removed. Drivers should authenticate via credentials.

  // Driver route management endpoints
  app.get(
    "/api/driver/:driverId/routes",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:self"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const driverId = parseInt(req.params.driverId);
        const driver = await storage.getDriver(driverId);

        if (!driver) {
          return res
            .status(404)
            .json({ success: false, message: "Driver not found" });
        }

        const routes = await storage.getRoutes();
        const driverRoutes = routes.filter(
          (route) => route.driverId === driverId
        );

        res.json({
          success: true,
          driver,
          routes: driverRoutes,
        });
      } catch (error) {
        log("error", "Error fetching driver routes", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch driver routes" });
      }
    }
  );

  app.get(
    "/api/driver/route/:routeId/pickups",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const routeId = parseInt(req.params.routeId);
        const pickups = await storage.getPickupsByRoute(routeId);
        res.json({ success: true, pickups });
      } catch (error) {
        log("error", "Error fetching route pickups", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch route pickups" });
      }
    }
  );

  // Driver task management endpoints
  app.get(
    "/api/driver/pickups/ready-for-pickup",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const pickups = await storage.getPickupRequests();
        const readyForPickup = pickups.filter(
          (p) =>
            !p.isCompleted &&
            (p.productionStatus === "pending" || !p.productionStatus)
        );
        res.json(readyForPickup);
      } catch (error) {
        log("error", "Error fetching ready-for-pickup requests", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch pickup requests" });
      }
    }
  );

  app.get(
    "/api/driver/deliveries/ready-for-delivery",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const pickups = await storage.getPickupRequests();
        const readyForDelivery = pickups.filter(
          (p) => p.productionStatus === "ready_for_delivery" && !p.isDelivered
        );
        res.json(readyForDelivery);
      } catch (error) {
        log("error", "Error fetching ready-for-delivery requests", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to fetch delivery requests",
        });
      }
    }
  );

  // List business customers for driver's tenant
  app.get(
    "/api/driver/customers",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:read"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const customers = await storage.getCustomers();
        // Minimal fields for dropdown
        const list = customers.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          businessName: c.businessName,
        }));
        res.json({ success: true, customers: list });
      } catch (error) {
        log("error", "Error fetching driver customers", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch customers" });
      }
    }
  );

  // Create a pickup/service request on behalf of a selected customer
  app.post(
    "/api/driver/pickup-requests",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:create"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const schema = z.object({
          customerId: z.number().int().positive(),
          roNumber: z.string().optional(),
          customerNotes: z.string().optional(),
          address: z.string().optional(),
        });
        const payload = schema.parse(req.body || {});

        const customer = await storage.getCustomerById(payload.customerId);
        if (!customer) {
          return res
            .status(404)
            .json({ success: false, message: "Customer not found" });
        }

        const pickupRequestData: any = {
          customerId: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          businessName: customer.businessName,
          address: payload.address || customer.address,
          roNumber:
            payload.roNumber && payload.roNumber.trim().length > 0
              ? payload.roNumber.trim()
              : null,
          customerNotes:
            payload.customerNotes && payload.customerNotes.trim().length > 0
              ? payload.customerNotes.trim()
              : null,
        };

        // Validate shape against insert schema
        const validated = insertPickupRequestSchema
          .partial({
            wheelCount: true,
            latitude: true,
            longitude: true,
            isCompleted: true,
            completedAt: true,
            completionPhoto: true,
            completionLocation: true,
            completionNotes: true,
            employeeName: true,
            inProcessAt: true,
            readyForDeliveryAt: true,
            readyToBillAt: true,
            deliveryPhoto: true,
            wheelQrCodes: true,
            isDelivered: true,
            deliveredAt: true,
            deliveryNotes: true,
            deliveryQrCodes: true,
            isArchived: true,
            archivedAt: true,
            routeId: true,
            routeOrder: true,
            priority: true,
            estimatedPickupTime: true,
            productionStatus: true,
            billedAt: true,
            billedAmount: true,
            invoiceNumber: true,
          })
          .parse(pickupRequestData);

        const created = await storage.createPickupRequest(validated as any);

        res.json({
          success: true,
          message: "Pickup request created",
          requestId: created.id,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            message: "Invalid request data",
            errors: error.errors,
          });
        }
        log("error", "Error creating pickup request by driver", {
          error: error instanceof Error ? error.message : String(error),
        });
        return res
          .status(500)
          .json({ success: false, message: "Failed to create request" });
      }
    }
  );

  // Driver task completion endpoints
  app.post(
    "/api/driver/pickups/:id/complete",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:update_status"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const pickupId = parseInt(req.params.id);

        // Validate request body
        const driverPickupCompletionSchema = z.object({
          roNumber: z.string().min(1, "RO Number is required"),
          completionPhoto: z.string().optional(),
          notes: z.string().optional(),
          signature: z.string().min(1, "Signature is required"),
        });

        const completionData = driverPickupCompletionSchema.parse(req.body);

        // Update pickup with completion data including RO# and photo and set status
        await storage.updatePickupCompletion(pickupId, {
          completionNotes: completionData.notes,
          roNumber: completionData.roNumber || undefined,
          completionPhoto: completionData.completionPhoto || undefined,
          isCompleted: true,
          completedAt: new Date(),
        });

        // Mark timeline in_process
        const updated = await storage.updatePickupRequestProductionStatus(
          pickupId,
          "in_process",
          completionData.completionPhoto
        );
        // Send email on transition to in_process if template exists
        try {
          if (updated) {
            const template = await storage.getEmailTemplateByType("in_process");
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
                templateType: "in_process",
                recipientEmail: updated.email,
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

        // Broadcast production status update to tenant room (admins/drivers)
        const tenantId = (req as any).businessId as number | undefined;
        if (tenantId) {
          broadcastToDrivers(tenantId, {
            type: "PRODUCTION_STATUS_UPDATED",
            data: { id: pickupId, productionStatus: "in_process" },
          });
        }

        res.json({
          success: true,
          message: "Pickup completed successfully",
          status: "in_process",
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
          res
            .status(500)
            .json({ success: false, message: "Failed to complete pickup" });
        }
      }
    }
  );

  app.post(
    "/api/driver/deliveries/:id/complete",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("pickup:update_status"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const deliveryId = parseInt(req.params.id);
        const { photo, notes } = req.body as { photo?: string; notes?: string };

        // Persist delivery photo/notes and mark deliveredAt
        const delivered = await storage.deliverPickupRequest(deliveryId, {
          deliveryNotes: notes,
          deliveryQrCodes: [],
          deliveryPhoto: photo,
        });

        // Update delivery to "ready_to_bill" status and timeline
        const updated = await storage.updatePickupRequestProductionStatus(
          deliveryId,
          "ready_to_bill",
          photo
        );

        // Email on ready_to_bill
        try {
          const record = updated || delivered;
          if (record) {
            const template =
              await storage.getEmailTemplateByType("ready_to_bill");
            if (template && record.email) {
              const { renderEmailBodyTemplate, sendEmail } = await import(
                "../email-utils"
              );
              const html = renderEmailBodyTemplate(template.bodyTemplate, {
                firstName: record.firstName,
                lastName: record.lastName,
                businessName: record.businessName,
                address: record.address,
                roNumber: (record as any).roNumber,
                productionStatus: "ready_to_bill",
              });
              const subject = template.subject;
              const sentBy = req.user?.email || "system@rivr.app";
              const sendResult = await sendEmail({
                to: record.email,
                subject,
                html,
              });
              await storage.createEmailLog({
                customerId: record.customerId,
                pickupRequestId: record.id,
                templateType: "ready_to_bill",
                recipientEmail: record.email,
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

        // Broadcast production status update to tenant room (admins/drivers)
        const tenantId = (req as any).businessId as number | undefined;
        if (tenantId) {
          broadcastToDrivers(tenantId, {
            type: "PRODUCTION_STATUS_UPDATED",
            data: { id: deliveryId, productionStatus: "ready_to_bill" },
          });
        }

        res.json({
          success: true,
          message: "Delivery completed successfully",
          status: "ready_to_bill",
        });
      } catch (error) {
        log("error", "Error completing delivery", {
          error: error instanceof Error ? error.message : String(error),
        });
        res
          .status(500)
          .json({ success: false, message: "Failed to complete delivery" });
      }
    }
  );

  // Driver communication endpoints
  app.get(
    "/api/driver/messages",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:self"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const driverIdParam = req.query.driverId
          ? parseInt(String(req.query.driverId))
          : undefined;
        const driverId =
          driverIdParam ||
          (req.user?.driverId as number | undefined) ||
          (req.user?.userId as number | undefined);

        if (!driverId) {
          return res.status(400).json({ error: "driverId is required" });
        }

        const messages = await storage.getDriverMessages(driverId);
        res.json(messages);
      } catch (error) {
        log("error", "Failed to get messages", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  );

  app.post(
    "/api/driver/messages",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:self"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const messageData = req.body;
        const message = await storage.createDriverMessage(messageData);
        const tenantId = (req as any).businessId as number | undefined;
        if (tenantId && message?.toDriverId) {
          sendToDriver(tenantId, message.toDriverId, {
            type: "DRIVER_MESSAGE",
            data: message,
          });
        } else if (tenantId) {
          broadcastToDrivers(tenantId, {
            type: "DRIVER_MESSAGE",
            data: message,
          });
        }
        res.json(message);
      } catch (error) {
        log("error", "Failed to send message", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  app.post(
    "/api/driver/status",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:self"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const statusData = req.body;
        const update = await storage.updateDriverStatus(statusData);
        const tenantId = (req as any).businessId as number | undefined;
        if (tenantId && statusData?.driverId) {
          broadcastToDrivers(tenantId, { type: "DRIVER_STATUS", data: update });
        }
        res.json(update);
      } catch (error) {
        log("error", "Failed to update driver status", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to update status" });
      }
    }
  );

  app.get(
    "/api/driver/status-updates",
    authenticateToken,
    requireTenantMatch(),
    requirePermission("driver:self"),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const updates = await storage.getDriverStatusUpdates();
        res.json(updates);
      } catch (error) {
        log("error", "Failed to get status updates", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to fetch status updates" });
      }
    }
  );

  // Message delivery/read receipts
  app.post(
    "/api/driver/messages/:id/delivered",
    authenticateToken,
    requireTenantMatch(),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const id = parseInt(req.params.id);
        const updated = await storage.updateDriverMessage(id, {
          deliveredAt: new Date(),
        } as any);
        res.json({ success: true, message: updated });
      } catch (error) {
        log("error", "Failed to mark message delivered", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to update message status" });
      }
    }
  );

  app.post(
    "/api/driver/messages/:id/read",
    authenticateToken,
    requireTenantMatch(),
    async (req, res) => {
      try {
        const storage = getStorage(req);
        const id = parseInt(req.params.id);
        const updated = await storage.updateDriverMessage(id, {
          isRead: true,
          readAt: new Date(),
        } as any);
        res.json({ success: true, message: updated });
      } catch (error) {
        log("error", "Failed to mark message read", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Failed to update message status" });
      }
    }
  );
}
