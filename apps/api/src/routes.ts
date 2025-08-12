import type { Express } from "express";
import type { Server as HttpServer } from "http";
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
