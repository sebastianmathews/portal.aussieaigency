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
  starter: {
    id: "starter",
    name: "Starter",
    price: 297,
    minutes: 500,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "",
    features: [
      "1 AI Voice Agent",
      "500 minutes/month",
      "Business hours (8am-6pm AEST)",
      "Call transcripts",
      "Calendar integration",
      "Email notifications",
      "Basic analytics",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 497,
    minutes: 1000,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? "",
    features: [
      "2 AI Voice Agents",
      "1,000 minutes/month",
      "24/7 coverage",
      "Call recordings & transcripts",
      "CRM integration",
      "SMS notifications",
      "Advanced analytics",
      "Priority support",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    price: 997,
    minutes: null,
    stripePriceId: process.env.STRIPE_PRICE_SCALE ?? "",
    features: [
      "5 AI Voice Agents",
      "Unlimited minutes",
      "24/7 coverage",
      "Everything in Growth",
      "Custom voice training",
      "Dedicated account manager",
      "White-label option",
      "API access",
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
