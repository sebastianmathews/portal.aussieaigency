import twilio from "twilio";

// ---------------------------------------------------------------------------
// Twilio Webhook Signature Verification
// ---------------------------------------------------------------------------

/**
 * Validates that a request genuinely came from Twilio by checking
 * the X-Twilio-Signature header against the request URL and params.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("Missing TWILIO_AUTH_TOKEN — cannot verify webhook");
    return false;
  }

  if (!signature) return false;

  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Extracts form data as a plain object for Twilio signature validation.
 */
export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    obj[key] = String(value);
  });
  return obj;
}

// ---------------------------------------------------------------------------
// HTML Escaping (for email templates)
// ---------------------------------------------------------------------------

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] || char);
}

// ---------------------------------------------------------------------------
// SSRF Protection
// ---------------------------------------------------------------------------

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254", // AWS/GCP metadata
  "metadata",
];

/**
 * Checks if a URL targets a private/internal resource (SSRF protection).
 * Returns true if the URL is safe, false if it should be blocked.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block known internal hostnames
    if (BLOCKED_HOSTNAMES.some((h) => hostname === h || hostname.endsWith("." + h))) {
      return false;
    }

    // Block private IP ranges
    if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return false;
    }

    // Block non-http(s) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory, per-IP)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * Returns { allowed: true } if under limit, or { allowed: false, retryAfter } if exceeded.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Extract client IP from request for rate limiting.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
