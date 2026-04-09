import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/org/pause
 *
 * Pause or resume the organization's AI receptionist service.
 * Body: { paused: boolean }
 *
 * When paused:  sets service_paused = true and all agents is_active = false
 * When resumed: sets service_paused = false and all agents is_active = true
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const paused = !!body.paused;

    // Update organization service_paused flag
    const { error: orgError } = await supabase
      .from("organizations")
      .update({ service_paused: paused } as Record<string, unknown>)
      .eq("id", orgId);

    if (orgError) {
      console.error("Failed to update org service_paused:", orgError);
      return NextResponse.json(
        { error: "Failed to update service status" },
        { status: 500 }
      );
    }

    // Update all agents' is_active status
    const { error: agentError } = await supabase
      .from("agents")
      .update({ is_active: !paused })
      .eq("organization_id", orgId);

    if (agentError) {
      console.error("Failed to update agents is_active:", agentError);
      return NextResponse.json(
        { error: "Failed to update agent status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paused,
      message: paused
        ? "Service paused. Your AI receptionist will not answer calls."
        : "Service resumed. Your AI receptionist is now active.",
    });
  } catch (error) {
    console.error("Pause/resume error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
