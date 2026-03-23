import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, agentId, contacts, scriptContext, scheduleTime, maxConcurrent } = body;

    if (!name || !agentId) {
      return NextResponse.json({ error: "name and agentId required" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      organization_id: orgId,
      agent_id: agentId,
      name,
      type: type || "custom",
      contacts: contacts || [],
      script_context: scriptContext || null,
      schedule_time: scheduleTime || null,
      max_concurrent: maxConcurrent || 1,
      status: "draft",
    };

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Create campaign error:", error);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
