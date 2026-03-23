import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Map Stripe status to our DB status enum
  function mapStatus(stripeStatus: string): "trialing" | "active" | "past_due" | "canceled" {
    switch (stripeStatus) {
      case "trialing": return "trialing";
      case "active": return "active";
      case "past_due": return "past_due";
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
        return "canceled";
      default: return "active";
    }
  }

  // Map Stripe price ID to plan using environment variables
  function mapPlan(priceId: string): { plan: string; minutes: number } {
    const priceMap: Record<string, { plan: string; minutes: number }> = {
      [process.env.STRIPE_PRICE_ESSENTIAL ?? ""]: { plan: "essential", minutes: 0 },
      [process.env.STRIPE_PRICE_COMPLETE ?? ""]: { plan: "complete", minutes: 0 },
      [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: { plan: "enterprise", minutes: 0 },
    };

    return priceMap[priceId] ?? { plan: "essential", minutes: 0 };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) {
          break;
        }

        const organizationId = session.metadata?.organizationId;
        if (!organizationId) {
          console.error("No organizationId in checkout session metadata");
          break;
        }

        const subscription = await stripe().subscriptions.retrieve(
          session.subscription as string
        );

        const subItem = subscription.items.data[0];
        const priceId = subItem?.price.id ?? "";
        const { plan, minutes } = mapPlan(priceId);
        const periodStart = subItem?.current_period_start;
        const periodEnd = subItem?.current_period_end;

        const upsertData = {
          organization_id: organizationId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan: plan as "essential" | "complete" | "enterprise",
          minutes_included: minutes,
          status: mapStatus(subscription.status),
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        };

        const { error } = await supabase
          .from("subscriptions")
          .upsert(upsertData, { onConflict: "organization_id" });

        if (error) {
          console.error("Failed to create subscription record:", error);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const updSubItem = subscription.items.data[0];
        const updPriceId = updSubItem?.price.id ?? "";
        const updPlan = mapPlan(updPriceId);
        const updPeriodStart = updSubItem?.current_period_start;
        const updPeriodEnd = updSubItem?.current_period_end;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: updPlan.plan as "essential" | "complete" | "enterprise",
            minutes_included: updPlan.minutes,
            status: mapStatus(subscription.status),
            current_period_start: updPeriodStart
              ? new Date(updPeriodStart * 1000).toISOString()
              : null,
            current_period_end: updPeriodEnd
              ? new Date(updPeriodEnd * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Failed to update subscription:", error);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Failed to cancel subscription:", error);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubId =
          (invoice.parent?.subscription_details as Record<string, unknown> | undefined | null)?.subscription as string | undefined;

        if (!invoiceSubId) {
          break;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoiceSubId);

        if (error) {
          console.error("Failed to update subscription to past_due:", error);
        }

        break;
      }

      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
