import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface ElevenLabsTranscriptEntry {
  role: string;
  message: string;
  timestamp?: number;
}

interface ElevenLabsWebhookPayload {
  type: string;
  conversation_id?: string;
  agent_id?: string;
  transcript?: ElevenLabsTranscriptEntry[];
  summary?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

const APPOINTMENT_KEYWORDS = [
  "appointment",
  "schedule",
  "booking",
  "booked",
  "confirmed",
  "reserved",
  "set up a time",
  "meet",
  "meeting",
  "calendar",
];

function checkForAppointment(transcript: ElevenLabsTranscriptEntry[]): boolean {
  const fullText = transcript
    .map((entry) => entry.message)
    .join(" ")
    .toLowerCase();

  return APPOINTMENT_KEYWORDS.some((keyword) => fullText.includes(keyword));
}

function extractLeadData(
  transcript: ElevenLabsTranscriptEntry[],
  metadata?: Record<string, unknown>
): Record<string, unknown> | null {
  const lead: Record<string, unknown> = {};

  // Check metadata for structured lead data
  if (metadata) {
    if (metadata.name) lead.name = metadata.name;
    if (metadata.email) lead.email = metadata.email;
    if (metadata.phone) lead.phone = metadata.phone;
    if (metadata.company) lead.company = metadata.company;
  }

  // Simple extraction from transcript text
  const fullText = transcript
    .map((entry) => (entry.role === "user" ? entry.message : ""))
    .join(" ");

  // Look for email patterns
  const emailMatch = fullText.match(
    /[\w.-]+@[\w.-]+\.\w+/
  );
  if (emailMatch && !lead.email) {
    lead.email = emailMatch[0];
  }

  return Object.keys(lead).length > 0 ? lead : null;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ElevenLabsWebhookPayload = await request.json();

    if (!payload.type) {
      return NextResponse.json(
        { error: "Missing event type" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    switch (payload.type) {
      case "conversation.started": {
        const { conversation_id, agent_id } = payload;

        if (!conversation_id || !agent_id) {
          return NextResponse.json(
            { error: "Missing conversation_id or agent_id" },
            { status: 400 }
          );
        }

        // Update call record with conversation_id if we can match by agent
        // The call may already exist from the Twilio webhook
        const { error } = await supabase
          .from("calls")
          .update({ elevenlabs_conversation_id: conversation_id, status: "in_progress" })
          .eq("status", "ringing")
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Failed to update call with conversation_id:", error);
        }

        break;
      }

      case "conversation.completed": {
        const { conversation_id, transcript, summary, metadata } = payload;

        if (!conversation_id) {
          return NextResponse.json(
            { error: "Missing conversation_id" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {
          elevenlabs_conversation_id: conversation_id,
          status: "completed",
        };

        if (transcript && transcript.length > 0) {
          updateData.transcript = transcript;

          // Check for appointment booking
          const appointmentBooked = checkForAppointment(transcript);
          updateData.appointment_booked = appointmentBooked;

          // Extract lead data
          const leadData = extractLeadData(transcript, metadata);
          if (leadData) {
            updateData.lead_data = leadData;
          }
        }

        if (summary) {
          updateData.summary = summary;
        }

        const { error } = await supabase
          .from("calls")
          .update(updateData)
          .eq("elevenlabs_conversation_id", conversation_id);

        if (error) {
          console.error("Failed to update call on conversation.completed:", error);
        }

        break;
      }

      default: {
        // Acknowledge unknown event types gracefully
        console.log(`Unhandled ElevenLabs event type: ${payload.type}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("ElevenLabs webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
