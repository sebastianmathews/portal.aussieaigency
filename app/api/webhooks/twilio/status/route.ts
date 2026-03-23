import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_MAP: Record<string, string> = {
  completed: "completed",
  failed: "failed",
  busy: "busy",
  "no-answer": "no-answer",
  canceled: "canceled",
  ringing: "ringing",
  "in-progress": "in-progress",
  queued: "queued",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string | null;
    const callStatus = formData.get("CallStatus") as string | null;
    const callDuration = formData.get("CallDuration") as string | null;

    if (!callSid || !callStatus) {
      return NextResponse.json(
        { error: "Missing required fields: CallSid, CallStatus" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const mappedStatus = STATUS_MAP[callStatus] || callStatus;

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    };

    if (callDuration) {
      updateData.duration = parseInt(callDuration, 10);
    }

    // Mark end time for terminal statuses
    if (["completed", "failed", "busy", "no-answer", "canceled"].includes(mappedStatus)) {
      updateData.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("calls")
      .update(updateData)
      .eq("call_sid", callSid);

    if (error) {
      console.error("Failed to update call status:", error);
      return NextResponse.json(
        { error: "Failed to update call status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Twilio status webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
