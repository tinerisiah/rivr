import { json, urlencoded } from "body-parser";
import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupWebSocketServer } from "./routes/websocket-routes";
import { registerAuthRoutes } from "./auth-routes";
import {
  rateLimit,
  securityHeaders,
  inputSanitization,
  requestLogging,
} from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { tenantMiddleware } from "./middleware/tenant";

export const createServer = async (): Promise<Express> => {
  const app = express();

  // Security middleware
  app.use(securityHeaders);

  // CORS: allow localhost dev ports and any subdomain under BASE_DOMAIN
  const baseDomain = (process.env.BASE_DOMAIN || "localhost").toLowerCase();
  const devOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ];
  const corsOrigin = (origin: string | undefined, callback: Function) => {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const host = url.host.toLowerCase();
      const allowed =
        devOrigins.includes(origin) ||
        host === baseDomain ||
        host.endsWith(`.${baseDomain}`);
      return callback(null, allowed);
    } catch {
      return callback(null, false);
    }
  };

  // Apply CORS BEFORE any tenant or route guards so preflight requests succeed
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(
      cors({
        origin: corsOrigin as any,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Tenant-Subdomain",
        ],
      })
    );

  // Tenant resolution must run early (before auth/routes)
  app.use(tenantMiddleware);

  // Rate limiting
  app.use(
    "/api",
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
      message: "Too many requests from this IP, please try again later.",
    })
  );

  // Body parsing with security limits
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf) => {
        // Allow empty bodies for GET requests and specific POST endpoints that don't require body data
        const allowedEmptyBodyPaths = [
          "/api/auth/logout",
          "/api/auth/health",
          "/api/auth/profile",
        ];

        // Allow empty bodies for GET requests (they typically don't have bodies)
        const isGetRequest = req.method === "GET";
        const isAllowedEmptyBodyPath = allowedEmptyBodyPaths.includes(
          req.url || ""
        );

        if (
          buf &&
          buf.length === 0 &&
          !isGetRequest &&
          !isAllowedEmptyBodyPath
        ) {
          throw new Error("Empty body not allowed");
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  // Cookie parsing for authentication
  app.use(cookieParser());

  // Input sanitization
  app.use(inputSanitization);

  // Request logging
  app.use(requestLogging);

  // x-powered-by already disabled above with CORS block

  // Register authentication routes
  registerAuthRoutes(app);

  // Register all routes (HTTP only)
  registerRoutes(app);

  // 404 handler for unmatched API routes
  app.use("/api/*", notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  // Attach WebSocket server to the actual HTTP server after the caller calls listen
  // We monkey-patch app.listen to ensure WS attaches to the created server
  const originalListen = app.listen.bind(app);
  (app as any).listen = (...args: any[]) => {
    const server = originalListen(...args);
    setupWebSocketServer(server);
    return server;
  };

  return app;
};
