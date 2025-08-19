import type { Express, Request } from "express";
import { z } from "zod";
import { log } from "@repo/logger";
import { getStorage } from "../storage";
import {
  insertCustomerSchema,
  insertQuoteRequestSchema,
  type InsertCustomer,
  type Customer,
} from "@repo/schema";
import { db } from "../db";
import { businesses } from "@repo/schema";
import { asc } from "drizzle-orm";
import { comparePassword, hashPassword } from "../auth";

export function registerCustomerRoutes(
  app: Express,
  broadcastToDrivers: (message: unknown) => void
) {
  // Helper to extract a customer token from various places for flexibility
  const getCustomerToken = (
    req: Request & {
      cookies?: Record<string, string>;
      headers?: Record<string, unknown>;
      query?: Record<string, unknown>;
    }
  ): string | undefined => {
    const cookieToken =
      (req.cookies?.["customer_token"] as string | undefined) || undefined;
    const headerToken =
      (req.headers?.["x-customer-token"] as string | undefined) || undefined;
    const authHeader =
      (req.headers?.authorization as string | undefined) || undefined;
    const bearer =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;
    const queryToken = (req.query?.token as string | undefined) || undefined;
    return cookieToken || headerToken || bearer || queryToken;
  };
  // Public endpoint to list businesses for selection (name + subdomain)
  app.get("/api/public/businesses", async (_req, res) => {
    try {
      const rows = await db
        .select({
          id: businesses.id,
          businessName: businesses.businessName,
          subdomain: businesses.subdomain,
          status: businesses.status,
        })
        .from(businesses)
        .orderBy(asc(businesses.businessName));
      // Return only active or trial businesses
      const list = rows.filter(
        (b) => b.status !== "canceled" && b.status !== "suspended"
      );
      res.json({ success: true, businesses: list });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Failed to load businesses" });
    }
  });
  // Submit pickup request with customer token (from body or cookie)
  app.post("/api/pickup-request", async (req, res) => {
    try {
      const storage = getStorage(req);
      const bodyToken = (req.body?.token as string | undefined) || undefined;
      const token = bodyToken || getCustomerToken(req);
      const customerData: Record<string, unknown> = {
        ...(req.body || {}),
      } as Record<string, unknown>;
      if ("token" in customerData) delete customerData.token;

      let customer;
      if (token) {
        customer = await storage.getCustomerByToken(token);
        if (!customer) {
          return res.status(404).json({
            success: false,
            message: "Invalid customer token",
          });
        }
      } else {
        const customerInfo = insertCustomerSchema.parse(customerData);
        const existingCustomer = await storage.getCustomerByEmail(
          customerInfo.email
        );

        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          customer = await storage.createCustomer(customerInfo);
        }
      }

      const roRaw = customerData.roNumber;
      const notesRaw = customerData.customerNotes;
      const roNumber =
        typeof roRaw === "string" && roRaw.trim().length > 0
          ? roRaw.trim()
          : null;
      const customerNotes =
        typeof notesRaw === "string" && notesRaw.trim().length > 0
          ? notesRaw.trim()
          : null;

      const pickupRequestData = {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        businessName: customer.businessName,
        address: customer.address,
        roNumber,
        customerNotes,
      };

      const pickupRequest =
        await storage.createPickupRequest(pickupRequestData);

      broadcastToDrivers({
        type: "NEW_PICKUP_REQUEST",
        data: {
          id: pickupRequest.id,
          businessName: pickupRequest.businessName,
          customerName: `${pickupRequest.firstName} ${pickupRequest.lastName}`,
          address: pickupRequest.address,
          timestamp: new Date().toISOString(),
        },
      });

      // Ensure customer session cookie is set for subsequent visits
      // Cookie is HTTP-only and secure in production
      const isProdEnv =
        (process.env.NODE_ENV || "development") === "production";
      res.cookie("customer_token", customer.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProdEnv,
        maxAge: 1000 * 60 * 60 * 24 * 180, // 180 days
        path: "/",
      });

      res.json({
        success: true,
        message: "Pickup request submitted successfully",
        requestId: pickupRequest.id,
        customerToken: customer.accessToken,
        customerName: `${customer.firstName} ${customer.lastName}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      } else {
        log("error", "Pickup request creation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to submit pickup request",
        });
      }
    }
  });

  // Customer registration (optional account for future logins)
  app.post("/api/auth/customer/register", async (req, res) => {
    try {
      const storage = getStorage(req);
      const schema = insertCustomerSchema.extend({
        password: z.string().min(6),
      });
      const payload = schema.parse(req.body || {});

      const existing = await storage.getCustomerByEmail(payload.email);
      const existingWithPassword = existing as unknown as {
        password?: string | null;
      };
      if (existing && existingWithPassword.password) {
        return res
          .status(409)
          .json({ success: false, message: "Email already registered" });
      }

      const values: InsertCustomer = { ...(payload as InsertCustomer) };
      (values as unknown as { password?: string }).password =
        await hashPassword(payload.password);
      const created = existing
        ? await storage.updateCustomer(existing.id, values)
        : await storage.createCustomer(values);

      if (!created) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create customer" });
      }

      // Persist cookie customer_token for prefill/session
      const isProdEnv =
        (process.env.NODE_ENV || "development") === "production";
      res.cookie("customer_token", created.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProdEnv,
        maxAge: 1000 * 60 * 60 * 24 * 180,
        path: "/",
      });

      return res.status(201).json({
        success: true,
        message: "Customer registered successfully",
        customerToken: created.accessToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid registration data",
          errors: error.errors,
        });
      }
      log("error", "Customer registration failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res
        .status(500)
        .json({ success: false, message: "Registration failed" });
    }
  });

  // Customer login
  app.post("/api/auth/customer/login", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });
      const { email, password } = schema.parse(req.body || {});
      const storage = getStorage(req);
      const existing = (await storage.getCustomerByEmail(
        email
      )) as Customer | null;
      const existingWithPassword = existing as unknown as {
        password?: string | null;
      };
      if (!existing || !existingWithPassword.password) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }
      const ok = await comparePassword(
        password,
        existingWithPassword.password || ""
      );
      if (!ok) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }
      const isProdEnv =
        (process.env.NODE_ENV || "development") === "production";
      res.cookie("customer_token", existing.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProdEnv,
        maxAge: 1000 * 60 * 60 * 24 * 180,
        path: "/",
      });
      return res.json({ success: true, customerToken: existing.accessToken });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid login data",
          errors: error.errors,
        });
      }
      log("error", "Customer login failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res
        .status(500)
        .json({ success: false, message: "Authentication failed" });
    }
  });

  // Get current customer profile (by token header/cookie/query)
  app.get("/api/customer/profile", async (req, res) => {
    try {
      const storage = getStorage(req);
      const token = getCustomerToken(req);
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "No customer session" });
      }
      const customer = await storage.getCustomerByToken(token);
      if (!customer) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }
      return res.json({
        success: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          businessName: customer.businessName,
          address: customer.address,
        },
      });
    } catch (error) {
      log("error", "Fetch customer profile failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch profile" });
    }
  });

  // Submit quote request
  app.post("/api/quote-request", async (req, res) => {
    try {
      const storage = getStorage(req);
      const quoteData = insertQuoteRequestSchema.parse(req.body);
      const quoteRequest = await storage.createQuoteRequest(quoteData);

      res.json({
        success: true,
        message: "Quote request submitted successfully",
        requestId: quoteRequest.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors,
        });
      } else {
        log("error", "Quote request creation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
          success: false,
          message: "Failed to submit quote request",
        });
      }
    }
  });

  // Fetch current customer's pickup requests (from session cookie)
  app.get("/api/customer/requests", async (req, res) => {
    try {
      const storage = getStorage(req);
      const token = getCustomerToken(req);
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "No customer session" });
      }
      const customer = await storage.getCustomerByToken(token);
      if (!customer) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }
      const requests = await storage.getPickupRequestsByCustomerId(customer.id);
      res.json({ success: true, requests });
    } catch (error) {
      log("error", "Failed to fetch customer requests", {
        error: error instanceof Error ? error.message : String(error),
      });
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch requests" });
    }
  });

  // Edit a customer's pickup request (RO number, notes, optionally address) if not completed/archived
  app.patch("/api/customer/requests/:id", async (req, res) => {
    try {
      const storage = getStorage(req);
      const token = getCustomerToken(req);
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "No customer session" });
      }
      const customer = await storage.getCustomerByToken(token);
      if (!customer) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid request id" });
      }

      const editableSchema = z.object({
        roNumber: z
          .string()
          .max(64)
          .optional()
          .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
        customerNotes: z
          .string()
          .max(2000)
          .optional()
          .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
        address: z.string().optional(),
      });

      const updates = editableSchema.parse(req.body || {});
      const updated = await storage.updatePickupRequestByCustomer(
        id,
        customer.id,
        updates
      );
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Request not found or not editable",
        });
      }
      res.json({ success: true, request: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          errors: error.errors,
        });
      }
      log("error", "Failed to update customer request", {
        error: error instanceof Error ? error.message : String(error),
      });
      res
        .status(500)
        .json({ success: false, message: "Failed to update request" });
    }
  });
}
