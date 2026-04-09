"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { InlineTestAgent } from "@/components/agent/inline-test-agent";
import { cn } from "@/lib/utils";

interface TestCallCardProps {
  agentId: string;
  agentName: string;
}

export function TestCallCard({ agentId, agentName }: TestCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-2 border-[#F5A623]/50 bg-gradient-to-r from-[#F5A623]/5 to-transparent overflow-hidden">
      <CardContent className="p-0">
        {/* Header section - always visible */}
        <div className="flex items-center justify-between p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/15 flex items-center justify-center">
                <Phone className="h-7 w-7 text-[#F5A623]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0A1628] flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0A1628] font-heading">
                Try a Test Call
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Call your AI agent right now to hear how it sounds. No phone
                needed — it works right in your browser.
              </p>
            </div>
          </div>
          <Button
            variant="gold"
            size="lg"
            className="gap-2 shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">
              {expanded ? "Close" : "Test Your Agent"}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 sm:ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:ml-1" />
            )}
          </Button>
        </div>

        {/* Expanded inline test area */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="border-t border-[#F5A623]/20 px-5 sm:px-6 py-5 bg-white/50">
            <InlineTestAgent agentId={agentId} agentName={agentName} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
