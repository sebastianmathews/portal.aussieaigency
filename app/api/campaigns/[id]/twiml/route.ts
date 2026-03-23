import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateTwilioSignature, formDataToObject } from "@/lib/security";

export async function POST(request: NextRequest) {
  // Verify Twilio signature
  const formData = await request.formData();
  const signature = request.headers.get("x-twilio-signature");
  const url = request.nextUrl.toString();
  const params = formDataToObject(formData);

  if (!validateTwilioSignature(url, params, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const agentId = request.nextUrl.searchParams.get("agentId");
  const contactName = request.nextUrl.searchParams.get("contactName") || "";
  const context = request.nextUrl.searchParams.get("context") || "";

  const twiml = new twilio.twiml.VoiceResponse();

  if (!agentId) {
    twiml.say("Sorry, this campaign is not configured properly.");
    twiml.hangup();
  } else {
    // Connect to ElevenLabs with context for outbound
    const contextParam = JSON.stringify({
      contact_name: contactName,
      call_type: "outbound",
      campaign_context: context,
    });

    const connect = twiml.connect();
    connect.stream({
      url: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}&context=${encodeURIComponent(contextParam)}`,
    });
  }

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
