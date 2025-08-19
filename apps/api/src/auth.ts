import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { businesses, rivrAdmins, users, refreshTokens } from "@repo/schema";
import { and, eq } from "drizzle-orm";
import { log } from "@repo/logger";
import crypto from "crypto";

// JWT configuration
const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerBusinessSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  ownerFirstName: z.string().min(2, "First name must be at least 2 characters"),
  ownerLastName: z.string().min(2, "Last name must be at least 2 characters"),
  ownerEmail: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Subdomain can only contain lowercase letters, numbers, and hyphens"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Token types
export interface JWTPayload {
  userId: number;
  email: string;
  role: "business_owner" | "rivr_admin" | "driver" | "employee_viewer";
  tenantId?: number;
  businessName?: string;
  subdomain?: string;
  driverId?: number;
  iat?: number;
  exp?: number;
  name?: string;
}

export interface RefreshTokenPayload {
  userId: number;
  email: string;
  role: string;
  tokenId: string;
  tenantId?: number;
  iat?: number;
  exp?: number;
}

// MFA types
export interface MfaSetup {
  secret: string; // base32
  otpauthUrl: string;
}

// Basic TOTP generator/validator (RFC 6238) without external deps
function base32ToBuffer(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of base32.replace(/=+$/g, "")) {
    const val = alphabet.indexOf(c.toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(
  secretBase32: string,
  timeStepSeconds = 30,
  digits = 6,
  t?: number
): string {
  const time = Math.floor((t ?? Date.now()) / 1000);
  const counter = Math.floor(time / timeStepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);
  const key = base32ToBuffer(secretBase32);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

export function generateMfaSecretForUser(
  email: string,
  issuer = "RIVR"
): MfaSetup {
  const random = crypto.randomBytes(20);
  const base32 = random
    .toString("base64")
    .replace(/[^A-Z2-7]/gi, "")
    .substring(0, 32)
    .toUpperCase();
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${base32}&issuer=${encodeURIComponent(issuer)}`;
  return { secret: base32, otpauthUrl };
}

export function verifyMfaToken(
  secretBase32: string,
  token: string,
  window = 1
): boolean {
  const now = Date.now();
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const t = now + errorWindow * 30_000;
    const code = generateTotpCode(secretBase32, 30, 6, t);
    if (code === token) return true;
  }
  return false;
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token utilities
export const generateAccessToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (
  payload: Omit<RefreshTokenPayload, "iat" | "exp">
): string => {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN as any };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
  } catch (error) {
    return null;
  }
};

async function recordRefreshToken(params: {
  tokenId: string;
  userId: number;
  role: string;
  tenantId?: number;
  userAgent?: string;
  createdByIp?: string;
  expiresAt?: Date;
}) {
  const { tokenId, userId, role, tenantId, userAgent, createdByIp, expiresAt } =
    params;
  try {
    await db
      .insert(refreshTokens)
      .values({
        tokenId,
        userId,
        role,
        tenantId,
        userAgent,
        createdByIp,
        expiresAt,
      })
      .returning();
  } catch (error) {
    // Best-effort; do not block auth on logging issues
    log("error", "Failed to record refresh token", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function rotateRefreshToken(oldTokenId: string, newTokenId: string) {
  try {
    await db
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
        replacedByTokenId: newTokenId,
      })
      .where(eq(refreshTokens.tokenId, oldTokenId));
  } catch (error) {
    log("error", "Failed to rotate refresh token", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function revokeAllUserTokens(
  userId: number,
  role: string,
  tenantId?: number
) {
  try {
    const condition = tenantId
      ? and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.role, role),
          eq(refreshTokens.tenantId, tenantId)
        )
      : and(eq(refreshTokens.userId, userId), eq(refreshTokens.role, role));
    await db
      .update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date() })
      .where(condition as any);
  } catch (error) {
    log("error", "Failed to revoke user tokens", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Authentication middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: Function
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // If tenant context is enforced, ensure token tenant matches request tenant
    if (process.env.ENFORCE_TENANT === "true") {
      const reqTenantId = req.businessId;
      if (
        typeof reqTenantId === "number" &&
        typeof payload.tenantId === "number" &&
        reqTenantId !== payload.tenantId
      ) {
        return res.status(403).json({
          success: false,
          message: "Token does not belong to this tenant",
        });
      }
    }

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    log("error", "Token authentication failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Business owner authentication
export const authenticateBusinessOwner = async (
  email: string,
  password: string
) => {
  try {
    // First, check if the business exists
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerEmail, email))
      .limit(1);

    if (business.length === 0) {
      return { success: false, message: "Invalid credentials" };
    }

    const businessData = business[0];

    // Check if business is active
    if (businessData.status !== "active") {
      return {
        success: false,
        message: "Business account is not active. Please contact support.",
      };
    }

    // Check subscription status
    if (
      businessData.subscriptionStatus === "canceled" ||
      businessData.subscriptionStatus === "suspended"
    ) {
      return {
        success: false,
        message: "Subscription is not active. Please renew your subscription.",
      };
    }

    // Now check the user credentials in the users table
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, email))
      .limit(1);

    if (user.length === 0) {
      return { success: false, message: "Invalid credentials" };
    }

    const userData = user[0];

    // Verify password
    const isValidPassword = await comparePassword(password, userData.password);

    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials" };
    }

    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: businessData.id,
      email: businessData.ownerEmail,
      role: "business_owner",
      tenantId: businessData.id,
      businessName: businessData.businessName,
      subdomain: businessData.subdomain,
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenId = `bo_${businessData.id}_${Date.now()}`;
    const refreshToken = generateRefreshToken({
      userId: businessData.id,
      email: businessData.ownerEmail,
      role: "business_owner",
      tokenId: refreshTokenId,
      tenantId: businessData.id,
    });
    // Best-effort session record
    await recordRefreshToken({
      tokenId: refreshTokenId,
      userId: businessData.id,
      role: "business_owner",
      tenantId: businessData.id,
    });

    return {
      success: true,
      user: {
        id: businessData.id,
        email: businessData.ownerEmail,
        firstName: businessData.ownerFirstName,
        lastName: businessData.ownerLastName,
        businessName: businessData.businessName,
        subdomain: businessData.subdomain,
        role: "business_owner",
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    log("error", "Business owner authentication failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: "Authentication failed" };
  }
};

// RIVR Admin authentication
export const authenticateRivrAdmin = async (
  email: string,
  password: string
) => {
  try {
    const admin = await db
      .select()
      .from(rivrAdmins)
      .where(eq(rivrAdmins.email, email))
      .limit(1);

    if (admin.length === 0) {
      return { success: false, message: "Invalid credentials" };
    }

    const adminData = admin[0];

    if (!adminData.isActive) {
      return {
        success: false,
        message: "Account is deactivated. Please contact support.",
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(password, adminData.password);

    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials" };
    }

    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: adminData.id,
      email: adminData.email,
      role: "rivr_admin",
    };

    const accessToken = generateAccessToken(payload);
    const refreshTokenId = `adm_${adminData.id}_${Date.now()}`;
    const refreshToken = generateRefreshToken({
      userId: adminData.id,
      email: adminData.email,
      role: "rivr_admin",
      tokenId: refreshTokenId,
    });
    await recordRefreshToken({
      tokenId: refreshTokenId,
      userId: adminData.id,
      role: "rivr_admin",
    });

    // Update last login
    await db
      .update(rivrAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(rivrAdmins.id, adminData.id));

    return {
      success: true,
      user: {
        id: adminData.id,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    log("error", "RIVR admin authentication failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: "Authentication failed" };
  }
};

// Business employee (viewer) authentication
export const authenticateBusinessEmployee = async (
  email: string,
  password: string,
  businessId: number | undefined
) => {
  try {
    if (!businessId) {
      return { success: false, message: "Unknown tenant for employee login" };
    }

    // Find employee in shared schema scoped by businessId
    const { businessEmployees } = await import("@repo/schema");

    const [employee] = await db
      .select()
      .from(businessEmployees)
      .where(
        and(
          eq(businessEmployees.businessId, businessId),
          eq(businessEmployees.email, email)
        )
      )
      .limit(1);

    if (!employee) {
      return { success: false, message: "Invalid credentials" };
    }

    if (!employee.isActive) {
      return { success: false, message: "Employee account is inactive" };
    }

    const isValidPassword = await comparePassword(
      password,
      (employee as any).password || ""
    );
    if (!isValidPassword) {
      return { success: false, message: "Invalid credentials" };
    }

    const accessToken = generateAccessToken({
      userId: employee.id,
      email: employee.email,
      role: "employee_viewer",
      tenantId: businessId,
      name: employee.name as any,
    });

    const refreshTokenId = `emp_${employee.id}_${Date.now()}`;
    const refreshToken = generateRefreshToken({
      userId: employee.id,
      email: employee.email,
      role: "employee_viewer",
      tokenId: refreshTokenId,
      tenantId: businessId,
    });

    // Best-effort session record
    await recordRefreshToken({
      tokenId: refreshTokenId,
      userId: employee.id,
      role: "employee_viewer",
      tenantId: businessId,
    });

    const nameParts = String((employee as any).name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      success: true,
      user: {
        id: employee.id,
        email: employee.email,
        firstName,
        lastName,
        role: "employee_viewer",
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    log("error", "Business employee authentication failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: "Authentication failed" };
  }
};

// Business registration
export const registerBusiness = async (
  data: z.infer<typeof registerBusinessSchema>
) => {
  try {
    // Reserved subdomains
    const reserved = new Set([
      "admin",
      "api",
      "www",
      "mail",
      "test",
      (process.env.EXEC_SUBDOMAIN || "exec").toLowerCase(),
    ]);
    if (reserved.has(data.subdomain.toLowerCase())) {
      return { success: false, message: "Subdomain is reserved" };
    }

    // Check if email already exists
    const existingBusiness = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerEmail, data.ownerEmail))
      .limit(1);

    if (existingBusiness.length > 0) {
      return { success: false, message: "Email already registered" };
    }

    // Check if subdomain already exists
    const existingSubdomain = await db
      .select()
      .from(businesses)
      .where(eq(businesses.subdomain, data.subdomain))
      .limit(1);

    if (existingSubdomain.length > 0) {
      return { success: false, message: "Subdomain already taken" };
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create business account
    const [newBusiness] = await db
      .insert(businesses)
      .values({
        businessName: data.businessName,
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        ownerEmail: data.ownerEmail,
        phone: data.phone,
        address: data.address,
        subdomain: data.subdomain,
        databaseSchema: `tenant_${data.subdomain}`,
        status: "pending", // Requires approval
        subscriptionPlan: "starter",
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      })
      .returning();

    // Create user account for the business owner
    await db.insert(users).values({
      username: data.ownerEmail,
      password: hashedPassword,
    });

    log("info", "Business registered successfully", {
      businessId: newBusiness.id,
      businessName: newBusiness.businessName,
      subdomain: newBusiness.subdomain,
    });

    return {
      success: true,
      message:
        "Business registered successfully. Your account is pending approval.",
      business: {
        id: newBusiness.id,
        businessName: newBusiness.businessName,
        subdomain: newBusiness.subdomain,
        status: newBusiness.status,
      },
    };
  } catch (error) {
    log("error", "Business registration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: "Registration failed" };
  }
};

// Token refresh
export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { success: false, message: "Invalid refresh token" };
    }

    // Ensure token is active (not revoked/rotated)
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenId, payload.tokenId))
      .limit(1);
    if (!stored || stored.revoked) {
      return { success: false, message: "Refresh token revoked" };
    }

    // Generate new access token
    const newPayload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as "business_owner" | "rivr_admin" | "driver",
      tenantId: payload.tenantId,
    };

    const accessToken = generateAccessToken(newPayload);

    // Rotate refresh token (issue a new one and revoke current)
    const newRefreshTokenId = `${payload.role}_${payload.userId}_${Date.now()}`;
    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenId: newRefreshTokenId,
      tenantId: payload.tenantId,
    });
    await rotateRefreshToken(payload.tokenId, newRefreshTokenId);
    await recordRefreshToken({
      tokenId: newRefreshTokenId,
      userId: payload.userId,
      role: payload.role,
      tenantId: payload.tenantId,
    });

    return {
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    log("error", "Token refresh failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: "Token refresh failed" };
  }
};

// Logout (client-side token removal)
export const logout = async (req: Request, res: Response) => {
  try {
    // In a more sophisticated system, you might want to blacklist the refresh token
    // For now, we'll just return success and let the client remove tokens

    log("info", "User logged out", {
      userId: req.user?.userId || "unknown",
      email: req.user?.email || "unknown",
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    log("error", "Logout failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
