"use client";

import { Lock, Phone, Flag } from "lucide-react";

interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className }: TrustBadgesProps) {
  const badges = [
    {
      icon: Lock,
      text: "30-Day Money-Back Guarantee",
    },
    {
      icon: Phone,
      text: "Cancel Anytime \u2014 No Lock-in Contracts",
    },
    {
      icon: Flag,
      text: "Australian-owned & Operated",
    },
  ];

  return (
    <div
      className={`rounded-xl bg-gray-50 border border-gray-100 px-6 py-4 ${className ?? ""}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {badges.map((badge) => (
          <div
            key={badge.text}
            className="flex items-center gap-3 justify-center sm:justify-start"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <badge.icon className="h-4 w-4 text-[#6B7280]" />
            </div>
            <span className="text-sm text-[#6B7280] font-medium">
              {badge.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
