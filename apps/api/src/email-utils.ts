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

export function buildTenantUrl(subdomain: string, path: string = ""): string {
  const baseDomain =
    process.env.BASE_DOMAIN ||
    process.env.NEXT_PUBLIC_BASE_DOMAIN ||
    "localhost";
  const isLocal =
    baseDomain === "localhost" || baseDomain.endsWith(".localhost");
  const protocol =
    process.env.NODE_ENV === "production" && !isLocal ? "https" : "http";
  const port = isLocal ? ":3000" : "";
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  if (isLocal) {
    return `${protocol}://${subdomain}.localhost${port}${normalizedPath}`;
  }
  return `${protocol}://${subdomain}.${baseDomain}${normalizedPath}`;
}

export function buildBusinessWelcomeEmail(params: {
  businessName: string;
  subdomain: string;
}): { subject: string; html: string } {
  const portalUrl = buildTenantUrl(params.subdomain, "/auth");
  const onboardingUrl = buildTenantUrl(params.subdomain, "/onboarding");
  const subject = `Welcome to RIVR – Your business space is ready`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0a0a0a;">
      <h2>Welcome, ${params.businessName}!</h2>
      <p>Your personal subdomain has been set up:</p>
      <p style="font-size:16px; font-weight:600;">${params.subdomain}</p>
      <p>You can access your portal here:</p>
      <p><a href="${portalUrl}">${portalUrl}</a></p>
      <p>To continue onboarding, visit:</p>
      <p><a href="${onboardingUrl}">${onboardingUrl}</a></p>
      <p style="margin-top:24px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return { subject, html };
}

export function buildBusinessActivationEmail(params: {
  businessName: string;
  subdomain: string;
}): { subject: string; html: string } {
  const portalUrl = buildTenantUrl(params.subdomain, "/auth");
  const subject = `Your RIVR account is active – Sign in to get started`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0a0a0a;">
      <h2>${params.businessName} is now active</h2>
      <p>Your personal subdomain:</p>
      <p style="font-size:16px; font-weight:600;">${params.subdomain}</p>
      <p>Sign in to your portal:</p>
      <p><a href="${portalUrl}">${portalUrl}</a></p>
      <p style="margin-top:24px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return { subject, html };
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

export function buildAdminSetPasswordEmail(params: {
  toEmail: string;
  role: "business_owner" | "rivr_admin" | "driver" | "employee_viewer";
  newPassword: string;
  loginUrl?: string;
}): { subject: string; html: string } {
  const subject = `Your password has been reset by an administrator`;
  const loginLine = params.loginUrl
    ? `<p>Sign in here: <a href="${params.loginUrl}">${params.loginUrl}</a></p>`
    : "";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0a0a0a;">
      <h2>Password reset</h2>
      <p>An administrator has updated your password for your ${params.role.replace("_", " ")} account.</p>
      <p><strong>New password:</strong> ${params.newPassword}</p>
      ${loginLine}
      <p style="margin-top:16px; font-size:12px; color:#6b7280;">For your security, please sign in and change this password immediately.</p>
    </div>
  `;
  return { subject, html };
}
