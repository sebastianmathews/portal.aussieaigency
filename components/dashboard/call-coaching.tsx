"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CallData {
  status: string;
  summary: string | null;
  transcript: unknown;
}

interface CallCoachingProps {
  calls: CallData[];
}

interface CoachingSuggestion {
  topic: string;
  source: string;
}

const GAP_PATTERNS = [
  "couldn't answer",
  "didn't know",
  "transferred",
  "unable to help",
  "not sure",
  "don't have that information",
  "can't help with",
  "no information about",
  "I'm not able to",
  "outside my knowledge",
];

function extractGaps(calls: CallData[]): CoachingSuggestion[] {
  const suggestions: CoachingSuggestion[] = [];
  const seenTopics = new Set<string>();

  for (const call of calls) {
    const isFailedOrTransferred =
      call.status === "failed" || call.status === "transferred";

    const summary = call.summary ?? "";
    const summaryLower = summary.toLowerCase();

    const hasGapInSummary = GAP_PATTERNS.some((pattern) =>
      summaryLower.includes(pattern)
    );

    if (!isFailedOrTransferred && !hasGapInSummary) continue;

    // Try to extract the topic from the summary
    let topic = "";

    // Look for patterns like "asked about X" or "question about X"
    const aboutMatch = summary.match(
      /(?:asked about|question about|wanted to know about|inquired about|regarding)\s+(.+?)(?:\.|,|$)/i
    );
    if (aboutMatch) {
      topic = aboutMatch[1].trim();
    }

    // If no match from pattern, use a truncated version of the summary
    if (!topic && summary) {
      topic = summary.length > 80 ? summary.slice(0, 77) + "..." : summary;
    }

    if (!topic) {
      topic = isFailedOrTransferred
        ? `Call was ${call.status}`
        : "Unknown topic";
    }

    const topicKey = topic.toLowerCase().slice(0, 40);
    if (seenTopics.has(topicKey)) continue;
    seenTopics.add(topicKey);

    suggestions.push({
      topic,
      source: isFailedOrTransferred
        ? `Call ${call.status}`
        : "Gap detected in summary",
    });
  }

  return suggestions.slice(0, 5);
}

export function CallCoaching({ calls }: CallCoachingProps) {
  const suggestions = extractGaps(calls);

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{"\u{1F393}"}</span> Improve Your Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <span className="text-xl">{"\u2705"}</span>
            <p className="text-sm text-green-800">
              Your agent is handling calls well! No issues detected this week.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{"\u{1F393}"}</span> Improve Your Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border p-4 bg-white"
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{"\u26A0\uFE0F"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#0A1628]">
                Your agent was asked about{" "}
                <span className="font-medium">&ldquo;{suggestion.topic}&rdquo;</span>{" "}
                but couldn&apos;t answer. Add this to your FAQs?
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Link
                  href={`/dashboard/agent?add_faq=${encodeURIComponent(suggestion.topic)}`}
                >
                  <Button
                    size="sm"
                    variant="gold"
                    className="h-7 text-xs px-3"
                  >
                    Add to FAQs
                  </Button>
                </Link>
                <Badge variant="secondary" className="text-[10px]">
                  {suggestion.source}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
