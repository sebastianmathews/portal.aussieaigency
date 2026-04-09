"use client";

import Link from "next/link";
import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialBannerProps {
  trialEndsAt: string;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const urgent = daysLeft <= 3;

  return (
    <div
      className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
        urgent
          ? "bg-red-50 border-red-200"
          : "bg-gradient-to-r from-[#F5A623]/[0.08] to-[#FFCA5F]/[0.04] border-[#F5A623]/20"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            urgent ? "bg-red-100" : "bg-[#F5A623]/15"
          }`}
        >
          <Clock
            className={`h-5 w-5 ${urgent ? "text-red-600" : "text-[#F5A623]"}`}
          />
        </div>
        <div>
          <p
            className={`font-semibold text-sm ${
              urgent ? "text-red-800" : "text-[#0A1628]"
            }`}
          >
            {daysLeft === 0
              ? "Your free trial expires today!"
              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial`}
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">
            You&apos;re on the {plan.charAt(0).toUpperCase() + plan.slice(1)}{" "}
            plan trial. Upgrade to keep your AI receptionist running.
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Plus 30-day money-back guarantee after you upgrade
          </p>
        </div>
      </div>
      <Link href="/dashboard/billing">
        <Button
          size="sm"
          className={`gap-1.5 whitespace-nowrap ${
            urgent
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628]"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade Now
        </Button>
      </Link>
    </div>
  );
}
