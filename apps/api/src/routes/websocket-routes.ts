import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
// import type { Express } from "express";
import { log } from "@repo/logger";
import { verifyToken } from "../auth";

type ConnectionMeta = {
  tenantId?: number;
  userId: number;
  role: string;
  driverId?: number;
};

const connectionMeta = new WeakMap<WebSocket, ConnectionMeta>();

const tenantRooms = new Map<number, Set<WebSocket>>();
const driverRooms = new Map<string, Set<WebSocket>>(); // key: `${tenantId}:${driverId}`

export function broadcastToDrivers(
  tenantId: number | undefined,
  message: unknown
) {
  const messageStr = JSON.stringify(message);
  if (tenantId && tenantRooms.has(tenantId)) {
    tenantRooms.get(tenantId)!.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(messageStr);
    });
  } else {
    wsServer?.clients.forEach((ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(messageStr);
    });
  }
}

let wsServer: WebSocketServer | null = null;

export function setupWebSocketServer(httpServer: HttpServer) {
  if (wsServer) return wsServer;
  wsServer = new WebSocketServer({ server: httpServer, path: "/ws" });

  wsServer.on("connection", (ws: WebSocket, req) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        ws.close(1008, "Token required");
        return;
      }
      const payload = verifyToken(token);
      if (!payload) {
        ws.close(1008, "Invalid token");
        return;
      }
      const meta: ConnectionMeta = {
        tenantId: payload.tenantId,
        userId: payload.userId,
        role: payload.role,
        driverId: (payload as { driverId?: number }).driverId,
      };
      connectionMeta.set(ws, meta);

      // Add to tenant room
      if (typeof meta.tenantId === "number") {
        const set = tenantRooms.get(meta.tenantId) || new Set<WebSocket>();
        set.add(ws);
        tenantRooms.set(meta.tenantId, set);
      }
      // Add to driver room if driver
      if (
        typeof meta.tenantId === "number" &&
        typeof meta.driverId === "number"
      ) {
        const key = `${meta.tenantId}:${meta.driverId}`;
        const set = driverRooms.get(key) || new Set<WebSocket>();
        set.add(ws);
        driverRooms.set(key, set);
      }
      log("info", "WebSocket connected", {
        tenantId: payload.tenantId,
        role: payload.role,
        userId: payload.userId,
      });

      ws.on("message", (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(String(data));
          if (msg?.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.on("close", () => {
        const meta = connectionMeta.get(ws);
        connectionMeta.delete(ws);
        if (meta?.tenantId) {
          const set = tenantRooms.get(meta.tenantId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) tenantRooms.delete(meta.tenantId);
          }
        }
        if (meta?.tenantId && meta?.driverId) {
          const key = `${meta.tenantId}:${meta.driverId}`;
          const set = driverRooms.get(key);
          if (set) {
            set.delete(ws);
            if (set.size === 0) driverRooms.delete(key);
          }
        }
      });

      ws.on("error", (error) => {
        log("error", "WebSocket error", { error });
        connectionMeta.delete(ws);
      });
    } catch (error: unknown) {
      log("error", "WebSocket connection error", {
        error: error instanceof Error ? error.message : String(error),
      });
      ws.close(1011, "Internal error");
    }
  });

  return wsServer;
}

export function sendToDriver(
  tenantId: number | undefined,
  driverId: number,
  message: unknown
) {
  if (!tenantId) return;
  const key = `${tenantId}:${driverId}`;
  const set = driverRooms.get(key);
  if (!set) return;
  const str = JSON.stringify(message);
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  });
}

// Basic WebSocket health/metrics for health checks
export function getWebSocketMetrics() {
  return {
    isRunning: !!wsServer,
    totalClients: wsServer ? wsServer.clients.size : 0,
    byTenant: Array.from(tenantRooms.entries()).map(([tenantId, set]) => ({
      tenantId,
      clients: set.size,
    })),
  };
}
