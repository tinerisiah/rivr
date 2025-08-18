import { Express } from "express";
import { z } from "zod";
import {
  loginSchema,
  registerBusinessSchema,
  changePasswordSchema,
  authenticateBusinessOwner,
  authenticateRivrAdmin,
  registerBusiness,
  refreshAccessToken,
  logout,
  authenticateToken,
  requireRole,
  generateAccessToken,
  generateRefreshToken,
  comparePassword,
  verifyToken,
  authenticateBusinessEmployee,
} from "./auth";
import { generateMfaSecretForUser, verifyMfaToken } from "./auth";
import { log } from "@repo/logger";
import { getStorage } from "./storage";
import {
  provisionTenantSchema,
  withTenantDb,
  getTenantContextFromRequest,
} from "./lib/tenant-db";
import { db } from "./db";
import {
  refreshTokens,
  rivrAdmins,
  users,
  drivers,
  businessEmployees,
  businesses,
  passwordResetRequests,
} from "@repo/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./auth";
import {
  createBusinessVerificationEmail,
  sendEmail,
  buildPasswordResetEmail,
} from "./email-utils";
import crypto from "crypto";

export function registerAuthRoutes(app: Express) {
  // Business owner login
  app.post("/api/auth/business/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const result = await authenticateBusinessOwner(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message,
        });
      }

      // Set secure HTTP-only cookie for refresh token
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful",
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      log("error", "Business login failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  });

  // RIVR Admin login
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const result = await authenticateRivrAdmin(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message,
        });
      }

      // Set secure HTTP-only cookie for refresh token
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful",
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      log("error", "Admin login failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  });

  // Employee (view-only) login
  app.post("/api/auth/employee/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const businessId = (req as any).businessId as number | undefined;
      const result = await authenticateBusinessEmployee(
        email,
        password,
        businessId
      );

      if (!result.success) {
        const status =
          result.message === "Unknown tenant for employee login" ? 400 : 401;
        return res.status(status).json({
          success: false,
          message: result.message,
        });
      }

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: "Login successful",
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }
      log("error", "Employee login failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  });

  // Subdomain availability check
  app.get("/api/auth/subdomain-available", async (req, res) => {
    try {
      const sub = String(req.query.sub || "").toLowerCase();
      if (!sub || sub.length < 3 || !/^[a-z0-9-]+$/.test(sub)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subdomain" });
      }
      // Disallow reserved words
      const reserved = new Set([
        "admin",
        "api",
        "www",
        "mail",
        "test",
        (process.env.EXEC_SUBDOMAIN || "exec").toLowerCase(),
      ]);
      if (reserved.has(sub)) {
        return res.json({ success: true, available: false });
      }
      const { db } = await import("./db");
      const { businesses } = await import("@repo/schema");
      const { eq } = await import("drizzle-orm");
      const existing = await db
        .select()
        .from(businesses)
        .where(eq(businesses.subdomain, sub))
        .limit(1);
      res.json({ success: true, available: existing.length === 0 });
    } catch (error) {
      log("error", "Subdomain check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res
        .status(500)
        .json({ success: false, message: "Failed to check subdomain" });
    }
  });

  // Business registration
  app.post("/api/auth/business/register", async (req, res) => {
    try {
      const data = registerBusinessSchema.parse(req.body);

      const result = await registerBusiness(data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      // Automatically provision tenant schema for the new business
      try {
        await provisionTenantSchema(`tenant_${data.subdomain}`);
      } catch (e) {
        log("error", "Tenant schema provisioning failed", {
          error: e instanceof Error ? e.message : String(e),
          subdomain: data.subdomain,
        });
      }

      // Send verification email link (development: mailto URL response)
      const verifyLink = createBusinessVerificationEmail({
        email: data.ownerEmail,
        businessName: data.businessName,
        subdomain: data.subdomain,
      } as any);

      res.status(201).json({
        success: true,
        message: result.message,
        business: result.business,
        verifyLink,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      log("error", "Business registration failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Registration failed",
      });
    }
  });

  // Token refresh
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token required",
        });
      }

      const result = await refreshAccessToken(refreshToken);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message,
        });
      }

      // If rotation issued a new refresh token, set it
      if (result.refreshToken) {
        res.cookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      log("error", "Token refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Token refresh failed",
      });
    }
  });

  // Forgot password (request reset link)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        role: z
          .enum(["business_owner", "rivr_admin", "driver", "employee_viewer"])
          .optional(),
      });
      const { email, role } = schema.parse(req.body);

      // Attempt to resolve tenant context from header for public route
      // so driver/employee flows can work without the tenant middleware.
      const headerSub = (
        req.headers["x-tenant-subdomain"] as string | undefined
      )
        ?.toLowerCase()
        .trim();
      if (headerSub) {
        const [bizCtx] = await db
          .select({ id: businesses.id, schema: businesses.databaseSchema })
          .from(businesses)
          .where(eq(businesses.subdomain, headerSub))
          .limit(1);
        if (bizCtx) {
          (req as any).tenant = bizCtx.schema;
          (req as any).businessId = bizCtx.id;
        }
      }

      let resolvedRole:
        | "business_owner"
        | "rivr_admin"
        | "driver"
        | "employee_viewer"
        | null = role || null;
      let userId: number | undefined;
      let tenantId: number | undefined;

      if (!resolvedRole || resolvedRole === "rivr_admin") {
        const [admin] = await db
          .select()
          .from(rivrAdmins)
          .where(eq(rivrAdmins.email, email))
          .limit(1);
        if (admin) {
          resolvedRole = "rivr_admin";
          userId = admin.id;
        }
      }

      if (!resolvedRole || resolvedRole === "business_owner") {
        const [biz] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.ownerEmail, email))
          .limit(1);
        if (biz) {
          resolvedRole = "business_owner";
          userId = biz.id;
        }
      }

      if (
        (!resolvedRole || resolvedRole === "driver") &&
        (req as any).businessId
      ) {
        const driverRow = await withTenantDb(req as any, async (tx) => {
          const rows = await tx
            .select()
            .from(drivers)
            .where(eq(drivers.email, email))
            .limit(1);
          return rows[0];
        });
        if (driverRow) {
          resolvedRole = "driver";
          userId = driverRow.id;
          tenantId = (req as any).businessId as number;
        }
      }

      if (
        (!resolvedRole || resolvedRole === "employee_viewer") &&
        (req as any).businessId
      ) {
        const [emp] = await db
          .select()
          .from(businessEmployees)
          .where(
            and(
              eq(businessEmployees.email, email),
              eq(
                businessEmployees.businessId,
                (req as any).businessId as number
              )
            )
          )
          .limit(1);
        if (emp) {
          resolvedRole = "employee_viewer";
          userId = emp.id;
          tenantId = (req as any).businessId as number;
        }
      }

      log("resolvedRole", { resolvedRole, userId, tenantId });

      // Do not issue employee/driver reset tokens without a tenant context
      if (
        (resolvedRole === "driver" || resolvedRole === "employee_viewer") &&
        !tenantId
      ) {
        return res.json({
          success: true,
          message: "If an account exists, a reset email has been sent.",
        });
      }

      if (!resolvedRole) {
        return res.json({
          success: true,
          message: "If an account exists, a reset email has been sent.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db
        .insert(passwordResetRequests)
        .values({
          email,
          role: resolvedRole,
          tenantId,
          userId,
          token,
          expiresAt,
        })
        .returning();

      const appBase =
        process.env.APP_BASE_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
      const resetUrl = `${appBase}/auth/reset?token=${encodeURIComponent(token)}${tenantId ? `&tenant=${tenantId}` : ""}`;

      const { subject, html } = buildPasswordResetEmail({
        toEmail: email,
        resetUrl,
      });
      await sendEmail({ to: email, subject, html });

      res.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }
      log("error", "Forgot password failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res
        .status(500)
        .json({ success: false, message: "Failed to process request" });
    }
  });

  // Reset password (consume token)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const schema = z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8),
      });
      const { token, newPassword } = schema.parse(req.body);

      const [reset] = await db
        .select()
        .from(passwordResetRequests)
        .where(eq(passwordResetRequests.token, token))
        .limit(1);

      if (
        !reset ||
        reset.used ||
        (reset.expiresAt &&
          new Date(reset.expiresAt as any).getTime() < Date.now())
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired token" });
      }

      const role = reset.role as
        | "business_owner"
        | "rivr_admin"
        | "driver"
        | "employee_viewer";

      if (role === "rivr_admin") {
        const [admin] = await db
          .select()
          .from(rivrAdmins)
          .where(eq(rivrAdmins.email, reset.email))
          .limit(1);
        if (admin) {
          const hashed = await hashPassword(newPassword);
          await db
            .update(rivrAdmins)
            .set({ password: hashed })
            .where(eq(rivrAdmins.id, admin.id));
          const { revokeAllUserTokens } = await import("./auth");
          await revokeAllUserTokens(admin.id, "rivr_admin");
        }
      } else if (role === "business_owner") {
        const [biz] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.ownerEmail, reset.email))
          .limit(1);
        if (biz) {
          const [u] = await db
            .select()
            .from(users)
            .where(eq(users.username, biz.ownerEmail))
            .limit(1);
          if (u) {
            const hashed = await hashPassword(newPassword);
            await db
              .update(users)
              .set({ password: hashed })
              .where(eq(users.id, u.id));
            const { revokeAllUserTokens } = await import("./auth");
            await revokeAllUserTokens(biz.id, "business_owner");
          }
        }
      } else if (role === "driver") {
        if (!reset.tenantId) {
          return res.status(400).json({
            success: false,
            message: "Missing tenant for driver reset",
          });
        }
        const [bizSchema] = await db
          .select({ schema: businesses.databaseSchema })
          .from(businesses)
          .where(eq(businesses.id, reset.tenantId as any))
          .limit(1);
        if (!bizSchema?.schema) {
          return res
            .status(400)
            .json({ success: false, message: "Unknown tenant" });
        }
        const hashed = await hashPassword(newPassword);
        let updatedDriver: { id: number } | null = null;
        try {
          await db.transaction(async (tx) => {
            await tx.execute(`SET LOCAL search_path TO ${bizSchema.schema}`);
            const rows = await (tx as any)
              .select()
              .from(drivers)
              .where(eq(drivers.email, reset.email))
              .limit(1);
            const driver = rows[0] as any;
            if (driver) {
              await (tx as any)
                .update(drivers)
                .set({ password: hashed })
                .where(eq(drivers.id, driver.id));
              updatedDriver = { id: driver.id };
            }
          });
        } catch (e) {
          await db.execute(`SET search_path TO ${bizSchema.schema}`);
          const rows = await db
            .select()
            .from(drivers)
            .where(eq(drivers.email, reset.email))
            .limit(1);
          const driver = rows[0] as any;
          if (driver) {
            await db
              .update(drivers)
              .set({ password: hashed })
              .where(eq(drivers.id, driver.id));
            updatedDriver = { id: driver.id };
          }
        }
        if (updatedDriver) {
          const { revokeAllUserTokens } = await import("./auth");
          await revokeAllUserTokens(
            updatedDriver.id,
            "driver",
            reset.tenantId || undefined
          );
        }
      } else if (role === "employee_viewer") {
        if (!reset.tenantId) {
          return res.status(400).json({
            success: false,
            message: "Missing tenant for employee reset",
          });
        }
        const [emp] = await db
          .select()
          .from(businessEmployees)
          .where(
            and(
              eq(businessEmployees.email, reset.email),
              eq(businessEmployees.businessId, reset.tenantId as any)
            )
          )
          .limit(1);
        if (emp) {
          const hashed = await hashPassword(newPassword);
          await db
            .update(businessEmployees)
            .set({ password: hashed })
            .where(eq(businessEmployees.id, emp.id));
          const { revokeAllUserTokens } = await import("./auth");
          await revokeAllUserTokens(
            emp.id,
            "employee_viewer",
            reset.tenantId || undefined
          );
        }
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported role" });
      }

      await db
        .update(passwordResetRequests)
        .set({ used: true, usedAt: new Date() })
        .where(eq(passwordResetRequests.id, reset.id));

      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Password has been reset. Please sign in again.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }
      log("error", "Reset password failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res
        .status(500)
        .json({ success: false, message: "Failed to reset password" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      // Revoke refresh token if provided
      const tokenFromCookie = req.cookies?.refreshToken;
      if (tokenFromCookie) {
        try {
          // Verify as refresh token to access tokenId
          const { verifyRefreshToken } = await import("./auth");
          const payload = verifyRefreshToken(tokenFromCookie as string);
          if (payload && payload.tokenId) {
            await db
              .update(refreshTokens)
              .set({ revoked: true, revokedAt: new Date() })
              .where(eq(refreshTokens.tokenId, payload.tokenId));
          }
        } catch {}
      }

      const result = await logout(req, res);
      return result;
    } catch (error) {
      log("error", "Logout failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  });

  // Get current user profile
  app.get("/api/auth/profile", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      res.json({
        success: true,
        user: {
          id: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          tenantId: req.user.tenantId,
          businessName: req.user.businessName,
          subdomain: req.user.subdomain,
          name: req.user.name,
        },
      });
    } catch (error) {
      log("error", "Get profile failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Failed to get profile",
      });
    }
  });

  // Change password (authenticated users only)
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(
        req.body
      );

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Determine user type and verify current password, then update
      const role = req.user.role;
      let valid = false;

      if (role === "business_owner") {
        // users table stores hashed password keyed by username (owner email)
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.username, req.user.email))
          .limit(1);
        if (!u) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        valid = await comparePassword(currentPassword, u.password);
        if (!valid) {
          return res
            .status(401)
            .json({ success: false, message: "Current password incorrect" });
        }
        const hashed = await (await import("./auth")).hashPassword(newPassword);
        await db
          .update(users)
          .set({ password: hashed })
          .where(eq(users.id, u.id));
      } else if (role === "rivr_admin") {
        const [admin] = await db
          .select()
          .from(rivrAdmins)
          .where(eq(rivrAdmins.email, req.user.email))
          .limit(1);
        if (!admin) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        valid = await comparePassword(currentPassword, admin.password);
        if (!valid) {
          return res
            .status(401)
            .json({ success: false, message: "Current password incorrect" });
        }
        const hashed = await (await import("./auth")).hashPassword(newPassword);
        await db
          .update(rivrAdmins)
          .set({ password: hashed })
          .where(eq(rivrAdmins.id, admin.id));
      } else if (role === "driver") {
        const storage = getStorage(req);
        const driver = await storage.getDriverByEmail(req?.user?.email);
        if (!driver) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }
        valid = await comparePassword(currentPassword, driver.password || "");
        if (!valid) {
          return res
            .status(401)
            .json({ success: false, message: "Current password incorrect" });
        }
        const hashed = await (await import("./auth")).hashPassword(newPassword);
        await storage.updateDriver(driver.id, { password: hashed });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported role" });
      }

      // Invalidate existing sessions for this user
      // We import revokeAllUserTokens from auth via dynamic import to avoid circular deps
      const { revokeAllUserTokens } = await import("./auth");
      await revokeAllUserTokens(req.user.userId, role, req.user.tenantId);

      // Clear cookie to force re-login
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      log("error", "Change password failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  });

  // Protected route example - Business owner only
  app.get(
    "/api/business/dashboard",
    authenticateToken,
    requireRole(["business_owner"]),
    async (req, res) => {
      try {
        // This route is only accessible to business owners
        res.json({
          success: true,
          message: "Business dashboard data",
          tenantId: req.user?.tenantId,
          businessName: req.user?.businessName,
        });
      } catch (error) {
        log("error", "Business dashboard failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        res.status(500).json({
          success: false,
          message: "Failed to load dashboard",
        });
      }
    }
  );

  // Protected route example - RIVR Admin only
  app.get(
    "/api/admin/dashboard",
    authenticateToken,
    requireRole(["rivr_admin"]),
    async (req, res) => {
      try {
        // This route is only accessible to RIVR admins
        res.json({
          success: true,
          message: "Admin dashboard data",
          userId: req.user?.userId,
        });
      } catch (error) {
        log("error", "Admin dashboard failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        res.status(500).json({
          success: false,
          message: "Failed to load dashboard",
        });
      }
    }
  );

  // Driver authentication
  app.post("/api/auth/driver/register", async (req, res) => {
    try {
      const { tenant, businessId } = getTenantContextFromRequest(req as any);
      if (!tenant || !businessId) {
        return res
          .status(400)
          .json({ success: false, message: "Unknown tenant for registration" });
      }

      const driverRegisterSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
      });

      const payload = driverRegisterSchema.parse(req.body);

      // Ensure unique email per tenant
      const existing = await withTenantDb(req as any, async (tx) => {
        const rows = await tx
          .select()
          .from(drivers)
          .where(eq(drivers.email, payload.email))
          .limit(1);
        return rows[0];
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Driver with this email already exists",
        });
      }

      const hashed = await hashPassword(payload.password);

      const created = await withTenantDb(req as any, async (tx) => {
        const [row] = await tx
          .insert(drivers)
          .values({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            licenseNumber: payload.licenseNumber,
            password: hashed,
            status: "available",
            isActive: true,
          } as any)
          .returning();
        return row;
      });

      // Auto-login newly registered driver
      const accessToken = generateAccessToken({
        userId: created.id,
        email: created.email,
        role: "driver",
        driverId: created.id,
        tenantId: businessId,
        name: created.name,
      });
      const refreshTokenId = `drv_${created.id}_${Date.now()}`;
      const refreshToken = generateRefreshToken({
        userId: created.id,
        email: created.email,
        role: "driver",
        tokenId: refreshTokenId,
        tenantId: businessId,
      });

      await db
        .insert(refreshTokens)
        .values({
          tokenId: refreshTokenId,
          userId: created.id,
          role: "driver",
          tenantId: businessId,
        })
        .returning();

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const nameParts = String(created.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      return res.status(201).json({
        success: true,
        message: "Driver registered successfully",
        user: {
          id: created.id,
          email: created.email,
          firstName,
          lastName,
          role: "driver",
        },
        accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid registration data",
          errors: error.errors,
        });
      }
      log("error", "Driver registration failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res
        .status(500)
        .json({ success: false, message: "Registration failed" });
    }
  });

  app.post("/api/auth/driver/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Look up driver within the resolved tenant context (schema search_path)
      const driver = await withTenantDb(req, async (tx) => {
        const rows = await tx
          .select()
          .from(drivers)
          .where(eq(drivers.email, email))
          .limit(1);
        return rows[0];
      });

      if (!driver) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (!driver.isActive) {
        return res.status(401).json({
          success: false,
          message: "Driver account is inactive",
        });
      }

      // Verify password (assuming drivers have hashed passwords)
      const isValidPassword = await comparePassword(
        password,
        driver.password || ""
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate access token for driver
      const accessToken = generateAccessToken({
        userId: driver.id,
        email: driver.email,
        role: "driver",
        driverId: driver.id,
        tenantId: (req as any).businessId,
        name: driver.name,
      });

      // Generate refresh token
      const refreshTokenId = `drv_${driver.id}_${Date.now()}`;
      const refreshToken = generateRefreshToken({
        userId: driver.id,
        email: driver.email,
        role: "driver",
        tokenId: refreshTokenId,
        tenantId: (req as any).businessId,
      });
      // Record session
      await db
        .insert(refreshTokens)
        .values({
          tokenId: refreshTokenId,
          userId: driver.id,
          role: "driver",
          tenantId: (req as any).businessId,
        })
        .returning();

      // Set secure HTTP-only cookie for refresh token
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Parse name into first and last name
      const nameParts = driver.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      res.json({
        success: true,
        message: "Driver authenticated successfully",
        user: {
          id: driver.id,
          email: driver.email,
          firstName,
          lastName,
          role: "driver",
        },
        accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      log("error", "Driver authentication failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Authentication failed",
      });
    }
  });

  // Health check endpoint
  app.get("/api/auth/health", (req, res) => {
    res.json({
      success: true,
      message: "Authentication service is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // Minimal MFA scaffolding (stateless demo; persist secret in DB when wiring fully)
  app.post("/api/auth/mfa/setup", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }
      const setup = generateMfaSecretForUser(req.user.email);
      // In production, store setup.secret encrypted and mark user as mfa_pending
      res.json({ success: true, mfa: setup });
    } catch (error) {
      log("error", "MFA setup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, message: "Failed to setup MFA" });
    }
  });

  app.post("/api/auth/mfa/verify", authenticateToken, async (req, res) => {
    try {
      const { secret, token } = req.body as { secret: string; token: string };
      if (!secret || !token) {
        return res
          .status(400)
          .json({ success: false, message: "Missing secret or token" });
      }
      const ok = verifyMfaToken(secret, token);
      if (!ok)
        return res
          .status(401)
          .json({ success: false, message: "Invalid MFA token" });
      // In production, persist that MFA is enabled for user and store secret securely
      res.json({ success: true, message: "MFA verified" });
    } catch (error) {
      log("error", "MFA verify failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, message: "Failed to verify MFA" });
    }
  });
}
