"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

interface ROICalculatorProps {
  totalCalls: number;
  totalMinutes: number;
  planPrice: number;
}

export function ROICalculator({
  totalCalls,
  totalMinutes,
  planPrice,
}: ROICalculatorProps) {
  const [receptionistCost, setReceptionistCost] = useState(55000);

  const HUMAN_COST_PER_MINUTE = 0.75;
  const AVG_CALL_DURATION_MIN = 3.5;

  const hasCalls = totalCalls > 0;

  // Actual data calculations
  const avgDuration = hasCalls ? totalMinutes / totalCalls : AVG_CALL_DURATION_MIN;
  const humanCostThisMonth = hasCalls
    ? totalCalls * avgDuration * HUMAN_COST_PER_MINUTE
    : 0;
  const savingsThisMonth = hasCalls
    ? Math.max(0, humanCostThisMonth - planPrice)
    : 0;

  // Projected annual savings
  const projectedAnnualSavings = Math.max(
    0,
    receptionistCost - planPrice * 12
  );

  const savingsPercentage =
    receptionistCost > 0
      ? Math.round(((receptionistCost - planPrice * 12) / receptionistCost) * 100)
      : 0;

  // Bar chart widths
  const maxCost = Math.max(receptionistCost, planPrice * 12);
  const humanBarWidth = maxCost > 0 ? (receptionistCost / maxCost) * 100 : 0;
  const aiBarWidth = maxCost > 0 ? ((planPrice * 12) / maxCost) * 100 : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          ROI Calculator
        </CardTitle>
        <CardDescription>
          See how much you save compared to a human receptionist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Savings highlight */}
        <div className="rounded-xl bg-green-50 border border-green-100 p-5 text-center">
          {hasCalls ? (
            <>
              <p className="text-sm text-green-700 font-medium mb-1">
                Savings this month
              </p>
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(savingsThisMonth)}
              </p>
              <p className="text-sm text-green-600/80 mt-2">
                Your AI receptionist has saved you{" "}
                {formatCurrency(savingsThisMonth)} compared to hiring a
                full-time receptionist
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-green-700 font-medium mb-1">
                Projected annual savings
              </p>
              <p className="text-4xl font-bold text-green-600">
                {formatCurrency(projectedAnnualSavings)}
              </p>
              <p className="text-sm text-green-600/80 mt-2">
                Based on the average Australian small business receiving 150
                calls/month, you could save {formatCurrency(projectedAnnualSavings)}
                /year
              </p>
            </>
          )}
        </div>

        {/* Actual stats (if calls exist) */}
        {hasCalls && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#0A1628]">{totalCalls}</p>
              <p className="text-xs text-muted-foreground">Calls handled</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0A1628]">
                {avgDuration.toFixed(1)}m
              </p>
              <p className="text-xs text-muted-foreground">Avg duration</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0A1628]">
                {formatCurrency(humanCostThisMonth)}
              </p>
              <p className="text-xs text-muted-foreground">
                Human equivalent cost
              </p>
            </div>
          </div>
        )}

        {/* Comparison bar chart */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#0A1628]">
            Annual cost comparison
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                Human
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-red-400 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${Math.max(humanBarWidth, 10)}%` }}
                >
                  <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                    {formatCurrency(receptionistCost)}
                  </span>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-red-400 shrink-0" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                AI Agent
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${Math.max(aiBarWidth, 10)}%` }}
                >
                  <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                    {formatCurrency(planPrice * 12)}
                  </span>
                </div>
              </div>
              <TrendingDown className="h-4 w-4 text-green-500 shrink-0" />
            </div>
          </div>
          {savingsPercentage > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              You save {savingsPercentage}% annually with your AI receptionist
            </p>
          )}
        </div>

        {/* Editable receptionist cost */}
        <div className="space-y-1.5 pt-2 border-t">
          <Label
            htmlFor="receptionist-cost"
            className="text-xs text-muted-foreground"
          >
            What would a receptionist cost you? (per year)
          </Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              id="receptionist-cost"
              type="number"
              value={receptionistCost}
              onChange={(e) =>
                setReceptionistCost(parseInt(e.target.value, 10) || 0)
              }
              className="pl-7"
              min={0}
              step={1000}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Australian average: $55,000/year for a full-time receptionist
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
