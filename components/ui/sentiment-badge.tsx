import { cn } from "@/lib/utils";

const SENTIMENT_CONFIG: Record<
  string,
  { emoji: string; label: string; className: string }
> = {
  positive: {
    emoji: "\uD83D\uDE0A",
    label: "Positive",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  neutral: {
    emoji: "\uD83D\uDE10",
    label: "Neutral",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  negative: {
    emoji: "\uD83D\uDE24",
    label: "Frustrated",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface SentimentBadgeProps {
  sentiment: string | null | undefined;
  className?: string;
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  if (!sentiment) return null;

  const config = SENTIMENT_CONFIG[sentiment.toLowerCase()];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}
