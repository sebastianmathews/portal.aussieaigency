"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  minutesIncluded: number;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "essential",
    name: "Essential",
    price: 297,
    minutesIncluded: 0, // unlimited
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
  {
    id: "complete",
    name: "Complete",
    price: 497,
    minutesIncluded: 0, // unlimited
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
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    minutesIncluded: 0,
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
];

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const supabase = createClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Show success/canceled toast from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Subscription activated!",
        description: "Your plan is now active. Welcome aboard!",
      });
      window.history.replaceState({}, "", "/dashboard/billing");
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your subscription.",
      });
      window.history.replaceState({}, "", "/dashboard/billing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesIncluded, setMinutesIncluded] = useState(0);

  useEffect(() => {
    async function loadBilling() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      const orgId = membership.organization_id;
      if (!orgId) { setLoading(false); return; }

      // Get subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, minutes_included")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .single();

      if (sub) {
        setCurrentPlan(sub.plan);
        setSubscriptionStatus(sub.status);
        setMinutesIncluded(sub.minutes_included ?? 0);
      }

      // Get usage
      const { data: calls } = await supabase
        .from("calls")
        .select("duration")
        .eq("organization_id", orgId);

      const totalMins = Math.round(
        (calls ?? []).reduce((s, c) => s + (c.duration ?? 0), 0) / 60
      );
      setMinutesUsed(totalMins);

      setLoading(false);
    }

    loadBilling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/stripe/create-portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current plan & usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Plan</CardTitle>
              {subscriptionStatus && (
                <Badge variant={subscriptionStatus === "active" ? "success" : "warning"}>
                  {subscriptionStatus}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentPlan ? (
              <div>
                <p className="text-3xl font-bold capitalize">{currentPlan}</p>
                <p className="text-muted-foreground mt-1">
                  {minutesIncluded} minutes included per month
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-muted-foreground">
                  No active subscription
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a plan below to get started
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Manage Billing
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minutes Usage</CardTitle>
            <CardDescription>
              {minutesIncluded > 0
                ? `${minutesUsed} of ${minutesIncluded} minutes used this cycle`
                : `${minutesUsed} minutes used this cycle (unlimited plan)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {minutesIncluded > 0 ? (
              <Progress value={minutesUsed} max={minutesIncluded} />
            ) : (
              <div className="h-2 rounded-full bg-green-100" />
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {minutesIncluded > 0
                  ? `${Math.max(0, minutesIncluded - minutesUsed)} minutes remaining`
                  : "Unlimited minutes"}
              </span>
              <span className="font-medium">
                {minutesIncluded > 0
                  ? Math.round((minutesUsed / minutesIncluded) * 100)
                  : 0}
                % used
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Plan comparison */}
      <div>
        <h2 className="text-xl font-bold text-navy-500 mb-6">
          Choose Your Plan
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative",
                  plan.highlighted &&
                    "border-gold-500 shadow-lg shadow-gold-500/10"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gold-500 text-navy-500 hover:bg-gold-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    {plan.price > 0 ? (
                      <>
                        <span className="text-4xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">Custom</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {plan.id === "enterprise"
                      ? "Tailored to your requirements"
                      : "Unlimited inbound calls"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-0">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === "enterprise" ? (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        window.location.href =
                          (process.env.NEXT_PUBLIC_SITE_URL || "https://aussieaiagency.com.au") +
                          "/contact?plan=enterprise";
                      }}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlighted ? "gold" : "default"}
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {currentPlan ? "Switch to " : "Get Started with "}
                      {plan.name}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
