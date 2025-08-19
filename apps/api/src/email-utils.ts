/* eslint-disable turbo/no-undeclared-env-vars */
import { log } from "@repo/logger";
import type { PickupRequest, QuoteRequest } from "@repo/schema";
import { MailtrapClient } from "mailtrap";

const MAILTRAP_TOKEN = process.env.MAILTRAP_TOKEN || "";
const mailtrapClient = MAILTRAP_TOKEN
  ? new MailtrapClient({ token: MAILTRAP_TOKEN })
  : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!mailtrapClient) {
      // In dev or when not configured, no-op but report success to unblock flow
      return { success: true };
    }
    const fromEmail =
      params.fromEmail ||
      process.env.MAILTRAP_FROM_EMAIL ||
      "no-reply@rivr.app";
    const fromName =
      params.fromName || process.env.MAILTRAP_FROM_NAME || "RIVR";

    await mailtrapClient.send({
      from: { email: fromEmail, name: fromName },
      to: [{ email: params.to }],
      subject: params.subject,
      html: params.html,
    });
    return { success: true };
  } catch (error) {
    log("error", "Error sending email", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function renderEmailBodyTemplate(
  bodyTemplate: string,
  variables: Record<string, string | number | undefined | null>
): string {
  // Simple variable interpolation: {{variable}}
  return bodyTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function createQuoteReplyEmail(quote: QuoteRequest): string {
  const subject = encodeURIComponent(
    `Re: Quote Request - ${quote.businessName}`
  );
  const body = encodeURIComponent(`
Dear ${quote.firstName} ${quote.lastName},

Thank you for your quote request for ${quote.businessName}.

We have reviewed your requirements and would be happy to provide you with a detailed quote.

Please let us know if you have any questions or need additional information.

Best regards,
RIVR Team
  `);

  return `mailto:${quote.email}?subject=${subject}&body=${body}`;
}

export function createPickupCompletionEmail(pickup: PickupRequest): string {
  const subject = encodeURIComponent(
    `Pickup Completed - ${pickup.businessName}`
  );
  const body = encodeURIComponent(`
Dear ${pickup.firstName} ${pickup.lastName},

Your pickup request for ${pickup.businessName} has been completed successfully.

Pickup Details:
- Business: ${pickup.businessName}
- Address: ${pickup.address}
- Completed: ${pickup.completedAt ? new Date(pickup.completedAt).toLocaleDateString() : "N/A"}
${pickup.completionNotes ? `- Notes: ${pickup.completionNotes}` : ""}

Thank you for choosing RIVR!

Best regards,
RIVR Team
  `);

  return `mailto:${pickup.email}?subject=${subject}&body=${body}`;
}

export function createDeliveryCompletionEmail(pickup: PickupRequest): string {
  const subject = encodeURIComponent(
    `Delivery Completed - ${pickup.businessName}`
  );
  const body = encodeURIComponent(`
Dear ${pickup.firstName} ${pickup.lastName},

Your delivery for ${pickup.businessName} has been completed successfully.

Delivery Details:
- Business: ${pickup.businessName}
- Address: ${pickup.address}
- Delivered: ${pickup.deliveredAt ? new Date(pickup.deliveredAt).toLocaleDateString() : "N/A"}
${pickup.deliveryNotes ? `- Notes: ${pickup.deliveryNotes}` : ""}

Thank you for choosing RIVR!

Best regards,
RIVR Team
  `);

  return `mailto:${pickup.email}?subject=${subject}&body=${body}`;
}

export function createBusinessVerificationEmail(params: {
  email: string;
  businessName: string;
  subdomain: string;
}): string {
  const subject = encodeURIComponent(
    `Verify your business: ${params.businessName}`
  );
  const body = encodeURIComponent(`
Dear ${params.businessName} owner,

Welcome to RIVR! Please verify your email and complete onboarding.

Your chosen subdomain: ${params.subdomain}

Click the link below to continue (or paste into browser):
http://app.rivr.com/onboarding?subdomain=${params.subdomain}

Best,
RIVR Team
  `);
  return `mailto:${params.email}?subject=${subject}&body=${body}`;
}

export function buildPasswordResetEmail(params: {
  toEmail: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const subject = `Reset your password`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0a0a0a;">
      <h2>Reset your password</h2>
      <p>You recently requested to reset your password. Click the button below to continue. This link will expire in 1 hour.</p>
      <p style="margin: 24px 0;">
        <a href="${params.resetUrl}" style="background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a>
      </p>
      <p>If the button above does not work, copy and paste this URL into your browser:</p>
      <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
  return { subject, html };
}
