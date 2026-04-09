"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PauseCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PausedBannerProps {
  onResumed?: () => void;
}

export function PausedBanner({ onResumed }: PausedBannerProps) {
  const [resuming, setResuming] = useState(false);
  const { toast } = useToast();

  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await fetch("/api/org/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: false }),
      });

      if (!res.ok) throw new Error("Failed to resume service");

      toast({
        title: "Service Resumed",
        description: "Your AI receptionist is now active and answering calls.",
      });

      onResumed?.();
      // Reload page to reflect new state
      window.location.reload();
    } catch {
      toast({
        title: "Error",
        description: "Failed to resume service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <PauseCircle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-sm text-amber-800">
            {"\u23F8\uFE0F"} Your AI receptionist is paused &mdash; calls are not being answered
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Resume your service to start answering calls again.
          </p>
        </div>
      </div>
      <Button
        onClick={handleResume}
        disabled={resuming}
        className="bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] font-semibold gap-2 whitespace-nowrap"
        size="sm"
      >
        {resuming ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : null}
        Resume Service
      </Button>
    </div>
  );
}
