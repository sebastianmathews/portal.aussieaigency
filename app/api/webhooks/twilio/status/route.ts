import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioSignature, formDataToObject } from "@/lib/security";

const STATUS_MAP: Record<string, string> = {
  completed: "completed",
  failed: "failed",
  busy: "failed",
  "no-answer": "failed",
  canceled: "failed",
  ringing: "ringing",
  "in-progress": "in_progress",
  queued: "ringing",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Verify Twilio signature
    const signature = request.headers.get("x-twilio-signature");
    const url = request.nextUrl.toString();
    const params = formDataToObject(formData);

    if (!validateTwilioSignature(url, params, signature)) {
      console.error("Invalid Twilio signature on status webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

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

    const mappedStatus = STATUS_MAP[callStatus] || "completed";

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    };

    if (callDuration) {
      const duration = parseInt(callDuration, 10);
      if (!isNaN(duration) && duration >= 0) {
        updateData.duration = duration;
      }
    }

    // Fixed: use correct column name "twilio_call_sid" (was "call_sid")
    const { error } = await supabase
      .from("calls")
      .update(updateData)
      .eq("twilio_call_sid", callSid);

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
