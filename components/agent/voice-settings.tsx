"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export interface VoiceSettingsData {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettingsData = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  speed: 1.0,
  useSpeakerBoost: true,
};

interface VoiceSettingsProps {
  value: VoiceSettingsData;
  onChange: (settings: VoiceSettingsData) => void;
}

function SliderWithLabel({
  label,
  tooltip,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  leftLabel,
  rightLabel,
  displayValue,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel: string;
  rightLabel: string;
  displayValue?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[250px]">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {displayValue ?? Math.round(value * 100) + "%"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#F5A623] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F5A623] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export function VoiceSettings({ value, onChange }: VoiceSettingsProps) {
  const update = (key: keyof VoiceSettingsData, val: number | boolean) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="space-y-6">
      <SliderWithLabel
        label="Stability"
        tooltip="Controls how consistent the voice sounds. Lower = more emotional and expressive. Higher = more stable and predictable. Recommended: 0.3-0.7 for conversational agents."
        value={value.stability}
        onChange={(v) => update("stability", v)}
        leftLabel="More expressive"
        rightLabel="More stable"
      />

      <SliderWithLabel
        label="Clarity + Similarity"
        tooltip="Boosts clarity and how closely the voice matches the original speaker. Higher values sound clearer but may introduce artifacts at extremes. Recommended: 0.5-0.85."
        value={value.similarityBoost}
        onChange={(v) => update("similarityBoost", v)}
        leftLabel="More natural"
        rightLabel="More clarity"
      />

      <SliderWithLabel
        label="Style Exaggeration"
        tooltip="Amplifies the style and personality of the voice. Keep at 0 for neutral delivery. Increase for more dramatic, characterful speech. Higher values use more compute and add latency."
        value={value.style}
        onChange={(v) => update("style", v)}
        leftLabel="Neutral"
        rightLabel="More expressive"
      />

      <SliderWithLabel
        label="Speaking Speed"
        tooltip="Controls how fast the agent speaks. 0.9-1.1x is most natural for conversation. Slower for complex topics, faster for routine information."
        value={value.speed}
        onChange={(v) => update("speed", v)}
        min={0.5}
        max={2.0}
        step={0.05}
        leftLabel="Slower"
        rightLabel="Faster"
        displayValue={value.speed.toFixed(2) + "x"}
      />

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Label className="font-medium">Speaker Boost</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[250px]">
                  <p className="text-xs">
                    Enhances the speaker&apos;s voice characteristics for
                    clearer, more defined output. Recommended to keep enabled.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            Enhances voice clarity and definition
          </p>
        </div>
        <Switch
          checked={value.useSpeakerBoost}
          onCheckedChange={(v) => update("useSpeakerBoost", v)}
        />
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Quick Presets</Label>
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Professional",
              settings: {
                stability: 0.7,
                similarityBoost: 0.75,
                style: 0,
                speed: 1.0,
                useSpeakerBoost: true,
              },
            },
            {
              label: "Warm & Friendly",
              settings: {
                stability: 0.45,
                similarityBoost: 0.8,
                style: 0.15,
                speed: 0.95,
                useSpeakerBoost: true,
              },
            },
            {
              label: "Energetic",
              settings: {
                stability: 0.35,
                similarityBoost: 0.7,
                style: 0.3,
                speed: 1.1,
                useSpeakerBoost: true,
              },
            },
            {
              label: "Calm & Soothing",
              settings: {
                stability: 0.8,
                similarityBoost: 0.85,
                style: 0.05,
                speed: 0.9,
                useSpeakerBoost: true,
              },
            },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.settings)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white hover:border-[#F5A623]/50 hover:bg-[#F5A623]/5 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
