import { Request, Response, NextFunction } from "express";
import { log } from "@repo/logger";
import rateLimitMiddleware from "express-rate-limit";

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimitMiddleware({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function inputSanitization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Basic input sanitization - in production you'd want more robust sanitization
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
}

export function requestLogging(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const tenant = (req as any).tenant as string | undefined;
    const businessId = (req as any).businessId as number | undefined;
    log("info", "HTTP request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      host: req.headers.host,
      tenant,
      businessId,
    });
  });

  next();
}
