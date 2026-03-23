import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Re-export as a lazy getter so the Stripe client is not instantiated at import time
// (which would fail during next build when env vars are unavailable).
export { getStripe as stripe };

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export interface Plan {
  id: string;
  name: string;
  price: number;
  minutes: number | null; // null = unlimited
  stripePriceId: string;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  essential: {
    id: "essential",
    name: "Essential",
    price: 297,
    minutes: null, // unlimited inbound
    stripePriceId: process.env.STRIPE_PRICE_ESSENTIAL ?? "",
    features: [
      "Unlimited inbound calls",
      "24/7 AI receptionist",
      "Australian voice",
      "Appointment booking",
      "Google Calendar sync",
      "SMS & email notifications",
      "Call transcripts & recordings",
      "1 phone number",
    ],
  },
  complete: {
    id: "complete",
    name: "Complete",
    price: 497,
    minutes: null, // unlimited
    stripePriceId: process.env.STRIPE_PRICE_COMPLETE ?? "",
    features: [
      "Everything in Essential",
      "AI Chatbot for website",
      "Lead capture via chat",
      "CRM integration",
      "Advanced analytics",
      "Priority support",
      "Monthly performance review",
      "2 phone numbers",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 997,
    minutes: null,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
    features: [
      "Everything in Complete",
      "Multiple locations",
      "Outbound campaigns",
      "Custom integrations & API",
      "Dedicated account manager",
      "Custom voice training",
      "White-label options",
      "SLA guarantee",
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutSessionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  userId: string;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.customerEmail }),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      organizationId: params.organizationId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        organizationId: params.organizationId,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Customer Portal
// ---------------------------------------------------------------------------

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
