"use client";

import Link from "next/link";
import { Bot, Phone, BookOpen, CheckCircle2, ArrowRight, Clock, HelpCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface OnboardingStep {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
  time: string;
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
      label: "Create Your AI Receptionist",
      description:
        "Choose a friendly voice, write a greeting, and tell your AI how to handle calls.",
      href: "/dashboard/agent",
      icon: Bot,
      done: hasAgent,
      time: "~3 minutes",
    },
    {
      label: "Teach It About Your Business",
      description:
        "Add common questions, upload a price list, or paste your website so it knows what to say.",
      href: "/dashboard/knowledge-base",
      icon: BookOpen,
      done: hasKnowledge,
      time: "~3 minutes",
    },
    {
      label: "Get a Phone Number",
      description:
        "Upgrade your plan and pick an Australian number for your AI to answer real calls.",
      href: "/dashboard/billing",
      icon: Phone,
      done: hasPhone,
      time: "~2 minutes",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const firstName = userName ? userName.split(" ")[0] : "";

  /* ---------- All steps complete ---------- */
  if (allDone) {
    return (
      <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100/40 p-8 lg:p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <PartyPopper className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#0A1628] font-heading mb-2">
          You&apos;re all set!
        </h2>
        <p className="text-[#6B7280] text-base max-w-md mx-auto">
          Your AI receptionist is ready to take calls. Sit back and let it handle
          your phone while you focus on what matters.
        </p>
      </div>
    );
  }

  /* ---------- Onboarding in progress ---------- */
  return (
    <div className="rounded-2xl border border-[#F5A623]/30 bg-gradient-to-br from-[#F5A623]/[0.05] to-transparent p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-[#0A1628] font-heading leading-tight">
          Welcome{firstName ? `, ${firstName}` : ""}!{" "}
          <span className="block sm:inline">
            Let&apos;s get your AI receptionist live in 3 easy steps
          </span>
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <Progress
            value={progress}
            className="h-3 flex-1 max-w-xs bg-gray-200 [&>div]:bg-[#F5A623]"
          />
          <span className="text-sm font-semibold text-[#0A1628] whitespace-nowrap">
            {completedCount} of 3 complete
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <Link
              key={i}
              href={step.href}
              className={cn(
                "group relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300",
                step.done
                  ? "bg-green-50 border-green-300"
                  : "bg-white border-gray-200 hover:border-[#F5A623] hover:shadow-lg"
              )}
            >
              {/* Step number badge */}
              <div
                className={cn(
                  "absolute -top-3 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                  step.done
                    ? "bg-green-500 text-white"
                    : "bg-[#F5A623] text-white"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  i + 1
                )}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-2",
                  step.done ? "bg-green-100" : "bg-[#F5A623]/10"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <StepIcon className="h-6 w-6 text-[#F5A623]" />
                )}
              </div>

              {/* Title */}
              <h3
                className={cn(
                  "font-bold text-base mb-1",
                  step.done ? "text-green-700" : "text-[#0A1628]"
                )}
              >
                {step.label}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#6B7280] flex-1 leading-relaxed">
                {step.description}
              </p>

              {/* Time estimate */}
              <div className="flex items-center gap-1.5 mt-3 text-xs text-[#6B7280]">
                <Clock className="h-3.5 w-3.5" />
                {step.time}
              </div>

              {/* CTA button area */}
              {step.done ? (
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </div>
              ) : (
                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F5A623] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-[#e0951e] group-hover:shadow-md">
                  {i === 0 || steps.slice(0, i).every((s) => s.done)
                    ? "Start"
                    : "Continue"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Help link */}
      <div className="mt-8 text-center">
        <a
          href="https://aussieaiagency.com.au/book-setup-call"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#F5A623] transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need help? Book a free 15-minute setup call with our team
        </a>
      </div>
    </div>
  );
}
