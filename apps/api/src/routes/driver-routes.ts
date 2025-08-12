import type { Express } from "express";
import { z } from "zod";
import { log } from "@repo/logger";
import { getStorage } from "../storage";
import { broadcastToDrivers, sendToDriver } from "./websocket-routes";
import { authenticateToken } from "../auth";
import { requirePermission, requireTenantMatch } from "../auth/rbac";

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

        // Update pickup to "in_process" status
        await storage.updatePickupRequestProductionStatus(
          pickupId,
          "in_process"
        );

        // Update pickup with completion data including RO# and photo
        await storage.updatePickupCompletion(pickupId, {
          completionNotes: completionData.notes,
          roNumber: completionData.roNumber || undefined,
          completionPhoto: completionData.completionPhoto || undefined,
          isCompleted: true,
          completedAt: new Date(),
        });

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
        const { photo, notes } = req.body;

        // Update delivery to "ready_to_bill" status
        await storage.updatePickupRequestProductionStatus(
          deliveryId,
          "ready_to_bill"
        );

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
