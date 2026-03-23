"use client";

import { useEffect, useState } from "react";
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
    id: "starter",
    name: "Starter",
    price: 297,
    minutesIncluded: 500,
    features: [
      "1 AI Voice Agent",
      "500 minutes/month",
      "Call recording & transcripts",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 497,
    minutesIncluded: 1000,
    features: [
      "3 AI Voice Agents",
      "1,000 minutes/month",
      "Call recording & transcripts",
      "Advanced analytics",
      "Priority support",
      "Custom voice cloning",
    ],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: 997,
    minutesIncluded: 0,
    features: [
      "Unlimited AI Voice Agents",
      "Unlimited minutes",
      "Call recording & transcripts",
      "Full analytics suite",
      "Dedicated account manager",
      "Custom voice cloning",
      "API access",
      "White-label option",
    ],
  },
];

export default function BillingPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesIncluded, setMinutesIncluded] = useState(500);

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
        setMinutesIncluded(sub.minutes_included ?? 500);
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
  }, [supabase]);

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
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
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
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
              {minutesUsed} of {minutesIncluded} minutes used this cycle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={minutesUsed} max={minutesIncluded} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {Math.max(0, minutesIncluded - minutesUsed)} minutes remaining
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
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.minutesIncluded > 0
                      ? `${plan.minutesIncluded} minutes included`
                      : "Unlimited minutes"}
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
