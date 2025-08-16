import express, { type Express } from "express";
import morgan from "morgan";
import cors, { type CorsOptions } from "cors";
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

  // Ensure Express correctly identifies client IPs behind a proxy (e.g., Render, Nginx)
  // This also satisfies express-rate-limit's requirement when X-Forwarded-For is present
  const trustProxyEnv = (process.env.TRUST_PROXY || "").trim().toLowerCase();
  const trustProxySetting: boolean | number | string =
    trustProxyEnv === "true" || trustProxyEnv === "1"
      ? 1
      : trustProxyEnv === "false" || trustProxyEnv === "0"
        ? false
        : /^\d+$/.test(trustProxyEnv)
          ? parseInt(trustProxyEnv, 10)
          : trustProxyEnv ||
            (process.env.NODE_ENV === "production" ? 1 : false);
  app.set("trust proxy", trustProxySetting);

  // Security middleware
  app.use(securityHeaders);

  // CORS: allow localhost dev ports and any subdomain under BASE_DOMAIN
  const baseDomain = (process.env.BASE_DOMAIN || "localhost").toLowerCase();
  const frontendDomain = (
    process.env.FRONTEND_DOMAIN || "localhost"
  ).toLowerCase();
  const devOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ];
  // Optionally extend via env: comma-separated list
  const envAllowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const corsOrigin: CorsOptions["origin"] = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      const host = url.host.toLowerCase();
      const allowed =
        devOrigins.includes(origin) ||
        envAllowed.includes(origin) ||
        host === baseDomain ||
        host.endsWith(`.${baseDomain}`) ||
        host.endsWith(`.${frontendDomain}`) ||
        host.includes(frontendDomain);
      return callback(null, !!allowed);
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
        origin: corsOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Tenant-Subdomain",
          "X-Customer-Token",
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
  type ListenArgs = Parameters<Express["listen"]>;
  type ListenReturn = ReturnType<Express["listen"]>;
  (app as Express).listen = ((...args: ListenArgs): ListenReturn => {
    const server = originalListen(...args);
    setupWebSocketServer(server);
    return server;
  }) as Express["listen"];

  return app;
};
