import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCalendarEvent } from "@/lib/google";

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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get Google refresh token
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    const refreshToken = (org as Record<string, unknown>)?.google_refresh_token as string | null;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Go to Settings to connect." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { summary, description, startTime, endTime, attendeeEmail, timezone } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json(
        { error: "summary, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const event = await createCalendarEvent(refreshToken, {
      summary,
      description,
      startTime,
      endTime,
      attendeeEmail,
      timezone: timezone || (org as Record<string, unknown>)?.timezone as string || "Australia/Sydney",
    });

    return NextResponse.json(
      { success: true, eventId: event.id, htmlLink: event.htmlLink },
      { status: 200 }
    );
  } catch (error) {
    console.error("Create calendar event error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
