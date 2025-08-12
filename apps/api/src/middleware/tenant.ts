import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { businesses } from "@repo/schema";
import { eq, or } from "drizzle-orm";
import { log } from "@repo/logger";

function getHostWithoutPort(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;
  return hostHeader.split(":")[0]?.toLowerCase() || null;
}

function extractSubdomain(host: string, baseDomain?: string): string | null {
  // If BASE_DOMAIN is provided, consider subdomain as the left part of host before BASE_DOMAIN
  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    const withoutBase = host.slice(0, -`.${baseDomain}`.length);
    return withoutBase || null;
  }
  // Local/dev fallback: treat first label as subdomain if host contains dots and isn't the base domain
  const parts = host.split(".");
  if (parts.length > 2) return parts[0];
  return null;
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Allow CORS preflight to pass through without tenant resolution
    if (req.method === "OPTIONS") {
      return next();
    }
    // Public endpoints that do not require tenant context
    const publicPaths = new Set<string>([
      "/api/auth/health",
      "/api/auth/admin/login", // Allow admin login without tenant resolution
      "/api/auth/profile",
    ]);
    if (publicPaths.has(req.path)) {
      return next();
    }

    const baseDomain = process.env.BASE_DOMAIN?.toLowerCase();
    const execSubdomain = (process.env.EXEC_SUBDOMAIN || "exec").toLowerCase();

    const host = getHostWithoutPort(req.headers.host);
    if (!host) {
      return res
        .status(400)
        .json({ success: false, message: "Missing host header" });
    }

    // Allow explicit override for local development via header or query
    const overrideSub = (
      req.headers["x-tenant-subdomain"] as string | undefined
    )?.toLowerCase();
    const subdomain = overrideSub || extractSubdomain(host, baseDomain) || null;

    // Exec portal bypass
    if (subdomain && subdomain === execSubdomain) {
      (req as any).tenant = "rivr_exec";
      (req as any).businessId = undefined;
      return next();
    }

    // If host equals base domain (marketing/root) and no override, proceed without tenant
    if (baseDomain && host === baseDomain && !overrideSub) {
      (req as any).tenant = undefined;
      (req as any).businessId = undefined;
      return next();
    }

    // Resolve business either by custom domain full host or by subdomain
    let business = null as { id: number; databaseSchema: string } | null;

    // Try custom domain match first
    const byCustom = await db
      .select({ id: businesses.id, databaseSchema: businesses.databaseSchema })
      .from(businesses)
      .where(eq(businesses.customDomain, host))
      .limit(1);
    if (byCustom.length > 0) {
      business = byCustom[0];
    }

    // Fallback to subdomain match
    if (!business && subdomain) {
      const bySub = await db
        .select({
          id: businesses.id,
          databaseSchema: businesses.databaseSchema,
        })
        .from(businesses)
        .where(eq(businesses.subdomain, subdomain))
        .limit(1);
      if (bySub.length > 0) {
        business = bySub[0];
      }
    }

    if (!business) {
      log("warn", "Tenant resolution failed", { host, subdomain });
      return res
        .status(404)
        .json({ success: false, message: "Unknown tenant" });
    }

    (req as any).tenant = business.databaseSchema;
    (req as any).businessId = business.id;

    return next();
  } catch (error) {
    log("error", "Tenant middleware error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res
      .status(500)
      .json({ success: false, message: "Tenant resolution error" });
  }
}

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: string;
      businessId?: number;
    }
  }
}
