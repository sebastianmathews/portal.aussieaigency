"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InsightsProps {
  totalCalls: number;
  prevWeekCalls: number;
  avgDuration: number;
  faqCount: number;
  kbCount: number;
  leadsCount: number;
  busiestDay: string | null;
  callsByDay: Record<string, number>;
}

interface Insight {
  icon: string;
  text: string;
  actionLabel?: string;
  actionHref?: string;
  priority: number;
}

function generateInsights(props: InsightsProps): Insight[] {
  const {
    totalCalls,
    prevWeekCalls,
    avgDuration,
    faqCount,
    kbCount,
    leadsCount,
    busiestDay,
    callsByDay,
  } = props;

  const insights: Insight[] = [];

  // 1. Calls increased >20% vs prior week
  if (prevWeekCalls > 0 && totalCalls > 0) {
    const pctChange = Math.round(
      ((totalCalls - prevWeekCalls) / prevWeekCalls) * 100
    );
    if (pctChange > 20) {
      insights.push({
        icon: "\u{1F4C8}",
        text: `Your calls are up ${pctChange}% this week \u2014 great momentum!`,
        priority: 3,
      });
    }
  }

  // 2. Busiest day has 2x more calls than others
  if (busiestDay && Object.keys(callsByDay).length > 1) {
    const values = Object.values(callsByDay);
    const maxCalls = Math.max(...values);
    const otherDays = values.filter((v) => v !== maxCalls);
    const avgOther =
      otherDays.length > 0
        ? otherDays.reduce((a, b) => a + b, 0) / otherDays.length
        : 0;
    if (avgOther > 0 && maxCalls >= avgOther * 2) {
      insights.push({
        icon: "\u{1F4C5}",
        text: `${busiestDay} is your busiest day. Consider extending hours.`,
        priority: 4,
      });
    }
  }

  // 3. Agent has <5 FAQs
  if (faqCount < 5) {
    insights.push({
      icon: "\u{1F4DD}",
      text: "Add more FAQs to improve your agent's accuracy. Agents with 10+ FAQs resolve 40% more calls.",
      actionLabel: "Add FAQs",
      actionHref: "/dashboard/agent",
      priority: 7,
    });
  }

  // 4. No knowledge base items
  if (kbCount === 0) {
    insights.push({
      icon: "\u{1F4DA}",
      text: "Upload your services document or website URL to train your agent.",
      actionLabel: "Add Knowledge",
      actionHref: "/dashboard/agent",
      priority: 8,
    });
  }

  // 5. Calls but 0 leads captured
  if (totalCalls > 0 && leadsCount === 0) {
    insights.push({
      icon: "\u{1F3AF}",
      text: "Your agent hasn't captured any leads yet. Make sure lead capture is enabled in your agent settings.",
      actionLabel: "Agent Settings",
      actionHref: "/dashboard/agent",
      priority: 6,
    });
  }

  // 6. Avg call duration >5 min
  if (avgDuration > 300 && totalCalls > 0) {
    const avgMin = Math.round(avgDuration / 60);
    insights.push({
      icon: "\u23F1\uFE0F",
      text: `Your average call is ${avgMin} minutes \u2014 consider adding more FAQs to help your agent answer faster.`,
      actionLabel: "Add FAQs",
      actionHref: "/dashboard/agent",
      priority: 5,
    });
  }

  // 7. No calls in 7 days
  if (totalCalls === 0) {
    insights.push({
      icon: "\u{1F4DE}",
      text: "No calls this week. Make sure your phone number is forwarded to your AI agent.",
      actionLabel: "Check Settings",
      actionHref: "/dashboard/settings",
      priority: 9,
    });
  }

  // Sort by priority (higher number = more relevant/urgent)
  insights.sort((a, b) => b.priority - a.priority);

  // Return max 3
  return insights.slice(0, 3);
}

export function Insights(props: InsightsProps) {
  const insights = generateInsights(props);

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{"\u{1F4A1}"}</span> Insights & Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-l-4 border-l-[#F5A623] p-4 bg-white"
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#0A1628]">{insight.text}</p>
              {insight.actionLabel && insight.actionHref && (
                <Link href={insight.actionHref}>
                  <Button
                    variant="link"
                    className="h-auto p-0 mt-1 text-[#F5A623] hover:text-[#d48d0f] text-xs font-semibold"
                  >
                    {insight.actionLabel} &rarr;
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
