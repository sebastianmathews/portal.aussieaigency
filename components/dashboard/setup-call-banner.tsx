"use client";

import { useState, useEffect } from "react";
import { Headphones, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "setup-call-banner-dismissed";

export function SetupCallBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "true") {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative rounded-xl border border-[#F5A623]/20 bg-gradient-to-r from-[#F5A623]/[0.06] to-transparent p-5">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
            <Headphones className="h-5 w-5 text-[#F5A623]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#0A1628]">
              Stuck? We&apos;ll set it up for you &mdash; free!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Book a 15-minute call and our team will configure your AI receptionist while you watch.
            </p>
          </div>
        </div>
        <a
          href="https://calendly.com/aussieaiagency/setup"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            size="sm"
            className="whitespace-nowrap bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] font-semibold"
          >
            Book Free Setup Call
          </Button>
        </a>
      </div>
    </div>
  );
}
