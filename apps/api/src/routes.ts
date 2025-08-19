import type { Express } from "express";
import type { Server as HttpServer } from "http";
import { db } from "./db";
import { businesses, businessSettings } from "@repo/schema";
import { eq } from "drizzle-orm";
import { log } from "@repo/logger";
import {
  registerCustomerRoutes,
  registerAdminRoutes,
  registerDriverRoutes,
  setupWebSocketServer,
  registerAnalyticsRoutes,
} from "./routes/index";
import { broadcastToDrivers } from "./routes/websocket-routes";

export function registerRoutes(app: Express): HttpServer {
  // Register all route modules
  registerCustomerRoutes(app, (message: unknown) =>
    broadcastToDrivers(undefined, message)
  );
  registerAdminRoutes(app);
  registerDriverRoutes(app);
  registerAnalyticsRoutes(app);

  // Public endpoint to get business settings by subdomain
  app.get("/api/public/business-settings/:subdomain", async (req, res) => {
    try {
      const { subdomain } = req.params;

      if (!subdomain) {
        return res.status(400).json({
          success: false,
          message: "Subdomain is required",
        });
      }

      // Get business by subdomain
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.subdomain, subdomain))
        .limit(1);

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business not found",
        });
      }

      // Get business settings
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.businessId, business.id))
        .limit(1);

      // Return public business info and settings
      res.json({
        success: true,
        business: {
          id: business.id,
          businessName: business.businessName,
          subdomain: business.subdomain,
          status: business.status,
        },
        settings: settings
          ? {
              customLogo: settings.customLogo,
              customBranding: settings.customBranding,
            }
          : null,
      });
    } catch (error) {
      log("error", "Failed to fetch public business settings", {
        error: error instanceof Error ? error.message : String(error),
        subdomain: req.params.subdomain,
      });
      res.status(500).json({
        success: false,
        message: "Failed to fetch business settings",
      });
    }
  });

  // Setup WebSocket server and return HTTP server
  // The caller should provide the actual HTTP server so WS attaches to it
  // Here we return a placeholder; the caller will pass the real server to setup
  // For current structure, we will call setup in createServer after listen wraps app
  // Returning a dummy object to satisfy types is not ideal; instead change caller usage.
  // We keep function returning HttpServer for compatibility.
  // This file no longer creates its own HTTP server.
  // The actual setup happens in server.ts now.
  return null as unknown as HttpServer;
}
