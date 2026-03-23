import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const rl = checkRateLimit(`api:${apiKey}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", apiKey)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("agents")
    .select("id, name, is_active, voice_id, language, greeting, created_at, updated_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
