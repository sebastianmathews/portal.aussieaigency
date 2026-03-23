import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a phone number string into a human-readable format.
 * Handles E.164 numbers like +61412345678 or +14155551234.
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";

  // Strip everything except digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Australian numbers: +61 4XX XXX XXX
  if (cleaned.startsWith("+61") && cleaned.length === 12) {
    return `+61 ${cleaned.slice(3, 4)}${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // US/CA numbers: +1 (XXX) XXX-XXXX
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  // Fallback: return with spaces every 3 digits after country code
  return cleaned;
}

/**
 * Format a duration in seconds into MM:SS or HH:MM:SS.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Format a date into a locale-friendly string.
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/**
 * Extract initials from a name (up to 2 characters).
 */
export function getInitials(name: string): string {
  if (!name) return "";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
