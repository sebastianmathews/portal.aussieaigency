"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";

export interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

export interface BusinessHoursData {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  afterHoursMessage: string;
}

const DAYS: { key: keyof Omit<BusinessHoursData, "afterHoursMessage">; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const minutes = m.toString().padStart(2, "0");
      slots.push(`${hour12}:${minutes} ${ampm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export const DEFAULT_BUSINESS_HOURS: BusinessHoursData = {
  monday: { enabled: true, open: "9:00 AM", close: "5:00 PM" },
  tuesday: { enabled: true, open: "9:00 AM", close: "5:00 PM" },
  wednesday: { enabled: true, open: "9:00 AM", close: "5:00 PM" },
  thursday: { enabled: true, open: "9:00 AM", close: "5:00 PM" },
  friday: { enabled: true, open: "9:00 AM", close: "5:00 PM" },
  saturday: { enabled: false, open: "9:00 AM", close: "1:00 PM" },
  sunday: { enabled: false, open: "9:00 AM", close: "1:00 PM" },
  afterHoursMessage:
    "Thank you for calling. Our office is currently closed. Please call back during our regular business hours, or leave a message and we'll get back to you as soon as possible.",
};

interface BusinessHoursProps {
  value: BusinessHoursData;
  onChange: (value: BusinessHoursData) => void;
}

export function BusinessHours({ value, onChange }: BusinessHoursProps) {
  const updateDay = (
    day: keyof Omit<BusinessHoursData, "afterHoursMessage">,
    field: keyof DaySchedule,
    fieldValue: boolean | string
  ) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: fieldValue,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Schedule grid */}
      <div className="space-y-1">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[140px_60px_1fr_1fr] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Day</span>
          <span>Open</span>
          <span>Start</span>
          <span>End</span>
        </div>

        {/* Day rows */}
        {DAYS.map(({ key, label }) => {
          const day = value[key];
          return (
            <div
              key={key}
              className={`grid grid-cols-1 sm:grid-cols-[140px_60px_1fr_1fr] gap-3 items-center rounded-lg px-3 py-3 transition-colors ${
                day.enabled
                  ? "bg-white border border-gray-100"
                  : "bg-gray-50/50"
              }`}
            >
              {/* Day label */}
              <span
                className={`text-sm font-medium ${
                  day.enabled ? "text-[#0A1628]" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>

              {/* Enabled toggle */}
              <div className="flex items-center">
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(checked) =>
                    updateDay(key, "enabled", checked)
                  }
                />
              </div>

              {/* Time selectors */}
              {day.enabled ? (
                <>
                  <Select
                    value={day.open}
                    onValueChange={(v) => updateDay(key, "open", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={`${key}-open-${slot}`} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={day.close}
                    onValueChange={(v) => updateDay(key, "close", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={`${key}-close-${slot}`} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Closed</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* After-hours message */}
      <div className="space-y-2 pt-4 border-t">
        <Label htmlFor="after-hours" className="text-sm font-medium">
          After-Hours Message
        </Label>
        <p className="text-xs text-muted-foreground">
          This message will be spoken when callers reach your agent outside of
          business hours.
        </p>
        <Textarea
          id="after-hours"
          value={value.afterHoursMessage}
          onChange={(e) =>
            onChange({ ...value, afterHoursMessage: e.target.value })
          }
          rows={3}
          className="resize-none"
          placeholder="Enter the message your agent will say after hours..."
        />
      </div>
    </div>
  );
}
