"use client";

import Link from "next/link";
import { Bot, Phone, BookOpen, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
}

interface OnboardingProps {
  userName: string;
  hasAgent: boolean;
  hasPhone: boolean;
  hasKnowledge: boolean;
}

export function Onboarding({
  userName,
  hasAgent,
  hasPhone,
  hasKnowledge,
}: OnboardingProps) {
  const steps: OnboardingStep[] = [
    {
      label: "Create your AI agent",
      description: "Pick a voice, set your greeting, and define how your agent behaves.",
      href: "/dashboard/agent",
      icon: Bot,
      done: hasAgent,
    },
    {
      label: "Get a phone number",
      description: "Choose an Australian phone number for your AI to answer.",
      href: "/dashboard/settings",
      icon: Phone,
      done: hasPhone,
    },
    {
      label: "Train your knowledge base",
      description: "Add FAQs, upload docs, or scrape your website so the AI knows your business.",
      href: "/dashboard/knowledge-base",
      icon: BookOpen,
      done: hasKnowledge,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (allDone) return null;

  return (
    <div className="rounded-2xl border border-[#F5A623]/20 bg-gradient-to-br from-[#F5A623]/[0.04] to-transparent p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#0A1628] font-heading">
            Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}! Let&apos;s get you set up.
          </h2>
          <p className="text-[#6B7280] text-sm mt-1">
            Complete these steps to get your AI receptionist live.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-[#0A1628]">
            {completedCount}/{steps.length}
          </div>
          <div className="w-24 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F5A623] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className={cn(
              "group flex flex-col rounded-xl border p-5 transition-all",
              step.done
                ? "bg-green-50/50 border-green-200"
                : "bg-white border-gray-200 hover:border-[#F5A623]/40 hover:shadow-md"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  step.done ? "bg-green-100" : "bg-[#F5A623]/10"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <step.icon className="h-5 w-5 text-[#F5A623]" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    step.done ? "text-green-600" : "text-gray-400"
                  )}
                >
                  Step {i + 1}
                </span>
              </div>
            </div>
            <h3
              className={cn(
                "font-semibold text-sm mb-1",
                step.done ? "text-green-700" : "text-[#0A1628]"
              )}
            >
              {step.label}
            </h3>
            <p className="text-xs text-[#6B7280] flex-1">{step.description}</p>
            {!step.done && (
              <div className="flex items-center gap-1 mt-3 text-[#F5A623] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Get started <ArrowRight className="h-3 w-3" />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
