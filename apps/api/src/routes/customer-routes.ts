import type { Express } from "express";
import { z } from "zod";
import { log } from "@repo/logger";
import { getStorage } from "../storage";
import { insertCustomerSchema, insertQuoteRequestSchema } from "@repo/schema";

export function registerCustomerRoutes(
  app: Express,
  broadcastToDrivers: (message: unknown) => void
) {
  // Submit pickup request with customer token
  app.post("/api/pickup-request", async (req, res) => {
    try {
      const storage = getStorage(req);
      const { token, ...customerData } = req.body;

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

      const pickupRequestData = {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        businessName: customer.businessName,
        address: customer.address,
        roNumber: customerData.roNumber || null,
        customerNotes: customerData.customerNotes || null,
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
}
