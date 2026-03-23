import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
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
