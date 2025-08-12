import type { PickupRequest, QuoteRequest } from "@repo/schema";

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
