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
} from "./auth";
import { generateMfaSecretForUser, verifyMfaToken } from "./auth";
import { log } from "@repo/logger";
import { getStorage } from "./storage";
import { provisionTenantSchema } from "./lib/tenant-db";
import { db } from "./db";
import { refreshTokens, rivrAdmins, users } from "@repo/schema";
import { eq } from "drizzle-orm";
import { createBusinessVerificationEmail } from "./email-utils";

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
  app.post("/api/auth/driver/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Tenant-scoped driver lookup
      const storage = getStorage(req);
      const driver = await storage.getDriverByEmail(email);

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
