import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security";

/**
 * Public API: GET /api/v1/calls
 * Returns calls for the authenticated organization.
 * Auth: Bearer token (API key = org ID for now)
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Bearer YOUR_API_KEY" },
      { status: 401 }
    );
  }

  // Rate limit: 60 requests per minute per API key
  const rl = checkRateLimit(`api:${apiKey}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = createAdminClient();

  // API key = organization ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", apiKey)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("calls")
    .select("id, caller_number, status, duration, created_at, summary, lead_score, sentiment, intent, ai_summary, suggested_action, recording_url", { count: "exact" })
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["ringing", "in_progress", "completed", "failed", "transferred"].includes(status)) {
    query = query.eq("status", status as "completed");
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { total: count, limit, offset },
  });
}
