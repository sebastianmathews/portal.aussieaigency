import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioSignature, formDataToObject } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Verify Twilio signature
    const signature = request.headers.get("x-twilio-signature");
    const url = request.nextUrl.toString();
    const params = formDataToObject(formData);

    if (!validateTwilioSignature(url, params, signature)) {
      console.error("Invalid Twilio signature on incoming webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const called = formData.get("Called") as string | null;
    const from = formData.get("From") as string | null;
    const callSid = formData.get("CallSid") as string | null;

    if (!called || !from || !callSid) {
      return NextResponse.json(
        { error: "Missing required fields: Called, From, CallSid" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find organization by twilio_number
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, elevenlabs_agent_id")
      .eq("twilio_number", called)
      .single();

    if (orgError || !org) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("Sorry, this number is not configured. Goodbye.");
      twiml.hangup();

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Look up actual agent UUID for FK
    const { data: agentRecord } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create call record (only if agent exists with valid UUID)
    if (agentRecord?.id) {
      const { error: callError } = await supabase.from("calls").insert({
        twilio_call_sid: callSid,
        organization_id: org.id,
        caller_number: from,
        agent_id: agentRecord.id,
        status: "ringing",
      });

      if (callError) {
        console.error("Failed to create call record:", callError);
      }
    } else {
      console.error("No agent found for org:", org.id);
    }

    const twiml = new twilio.twiml.VoiceResponse();

    const agentId = org.elevenlabs_agent_id;

    if (agentId) {
      // Connect to ElevenLabs via WebSocket stream
      const connect = twiml.connect();
      connect.stream({
        url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
      });
    } else {
      twiml.say(
        "Sorry, no AI agent has been configured for this number. Please contact support."
      );
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio incoming webhook error:", error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("An error occurred. Please try again later.");
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
