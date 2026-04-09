import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeCall } from "@/lib/call-analysis";
import { sendCallSMS } from "@/lib/notifications";

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
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-elevenlabs-signature")
        ?? request.headers.get("x-webhook-signature");
      const { timingSafeEqual } = await import("crypto");
      const sigOk = signature
        && signature.length === webhookSecret.length
        && timingSafeEqual(Buffer.from(signature), Buffer.from(webhookSecret));
      if (!sigOk) {
        console.error("Invalid ElevenLabs webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    }

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

        // Update call record with conversation_id
        // Match by agent's organization to avoid cross-org contamination
        const { data: agentOrg } = await supabase
          .from("agents")
          .select("organization_id")
          .eq("elevenlabs_agent_id", agent_id)
          .single();

        // Two-step: SELECT the most recent ringing call, then UPDATE by ID
        const { data: ringCall } = await supabase
          .from("calls")
          .select("id")
          .eq("status", "ringing")
          .eq("organization_id", agentOrg?.organization_id ?? "")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ringCall) {
          await supabase
            .from("calls")
            .update({ elevenlabs_conversation_id: conversation_id, status: "in_progress" } as never)
            .eq("id", ringCall.id);
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

        // Save recording URL if provided
        if (metadata?.recording_url) {
          updateData.recording_url = metadata.recording_url;
        } else if (payload.data?.recording_url) {
          updateData.recording_url = payload.data.recording_url;
        }

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

        // Try to update existing call record
        let updatedCall = null;
        const { error, data } = await supabase
          .from("calls")
          .update(updateData)
          .eq("elevenlabs_conversation_id", conversation_id)
          .select("organization_id, caller_number, created_at")
          .maybeSingle();

        updatedCall = data;

        if (error) {
          console.error("Failed to update call on conversation.completed:", error);
        }

        // If no call was found by conversation_id, create a new record
        // This handles cases where conversation.started didn't match
        if (!updatedCall && payload.agent_id) {
          const { data: agentData } = await supabase
            .from("agents")
            .select("id, organization_id")
            .eq("elevenlabs_agent_id", payload.agent_id)
            .maybeSingle();

          if (agentData) {
            const insertData: Record<string, unknown> = {
              ...updateData,
              organization_id: agentData.organization_id,
              agent_id: agentData.id,
              twilio_call_sid: `el_${conversation_id}`,
              caller_number: (metadata?.caller_number as string) || "Unknown",
            };

            const { data: newCall } = await supabase
              .from("calls")
              .insert(insertData as never)
              .select("organization_id, caller_number, created_at")
              .maybeSingle();

            updatedCall = newCall;
          }
        }

        // AI-powered call analysis (lead scoring, sentiment, intent)
        if (transcript && transcript.length > 0) {
          try {
            const analysis = await analyzeCall(transcript);
            if (analysis) {
              await supabase
                .from("calls")
                .update({
                  lead_score: analysis.lead_score,
                  intent: analysis.intent,
                  sentiment: analysis.sentiment,
                  follow_up_required: analysis.follow_up_required,
                  ai_summary: analysis.ai_summary,
                  suggested_action: analysis.suggested_action,
                } as never)
                .eq("elevenlabs_conversation_id", conversation_id);
            }
          } catch (analysisErr) {
            console.error("Call analysis failed:", analysisErr);
          }
        }

        // Auto-email transcript to organization owner
        if (updatedCall?.organization_id && transcript && transcript.length > 0) {
          try {
            // Get org owner email
            const { data: orgProfile } = await supabase
              .from("profiles")
              .select("email")
              .eq("organization_id", updatedCall.organization_id)
              .limit(1)
              .single();

            if (orgProfile?.email) {
              const sgMail = (await import("@sendgrid/mail")).default;
              sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

              const callerNum = updatedCall.caller_number ?? "Unknown";
              const callDate = new Date(updatedCall.created_at ?? Date.now())
                .toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

              const transcriptHtml = transcript
                .map((t: ElevenLabsTranscriptEntry) => {
                  const isAi = t.role === "assistant" || t.role === "agent";
                  const label = isAi ? "AI Agent" : "Caller";
                  const bg = isAi ? "#f0f4f8" : "#0A1628";
                  const color = isAi ? "#0A1628" : "#ffffff";
                  const escaped = t.message
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                  return `<div style="margin-bottom:8px;"><span style="font-size:11px;font-weight:600;color:#9BA4B5;">${label}</span><div style="background:${bg};color:${color};padding:8px 12px;border-radius:8px;font-size:14px;max-width:80%;display:inline-block;">${escaped}</div></div>`;
                })
                .join("");

              await sgMail.send({
                from: process.env.SENDGRID_FROM_EMAIL ?? "Aussie AI Agency <info@aussieaiagency.com.au>",
                to: orgProfile.email,
                subject: `New Call — ${callerNum} — ${callDate}`,
                html: `
                  <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;">
                    <div style="background:#0A1628;padding:20px 24px;border-radius:12px 12px 0 0;">
                      <h2 style="color:#F5A623;margin:0;font-size:18px;">New Call Completed</h2>
                    </div>
                    <div style="background:#ffffff;border:1px solid #E8ECF2;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
                      <table style="width:100%;font-size:14px;margin-bottom:20px;">
                        <tr><td style="color:#9BA4B5;padding:4px 0;">Caller</td><td style="font-weight:600;">${callerNum}</td></tr>
                        <tr><td style="color:#9BA4B5;padding:4px 0;">Date</td><td>${callDate}</td></tr>
                        ${summary ? `<tr><td style="color:#9BA4B5;padding:4px 0;">Summary</td><td>${summary.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
                      </table>
                      <h3 style="color:#0A1628;font-size:14px;margin-bottom:12px;">Full Transcript</h3>
                      ${transcriptHtml}
                      <hr style="border:none;border-top:1px solid #E8ECF2;margin:20px 0;" />
                      <p style="color:#9BA4B5;font-size:11px;text-align:center;">Aussie AI Agency — Your AI receptionist</p>
                    </div>
                  </div>
                `,
              });
            }
          } catch (emailErr) {
            console.error("Failed to send auto transcript email:", emailErr);
            // Non-blocking — don't fail the webhook
          }
        }

        // SMS notification to business owner
        if (updatedCall?.organization_id) {
          try {
            const { data: orgRaw } = await supabase
              .from("organizations")
              .select("*")
              .eq("id", updatedCall.organization_id)
              .single();
            const org = orgRaw as Record<string, unknown> | null;

            if (org?.sms_notifications_enabled && org?.notification_phone) {
              // Get agent name
              const { data: agentRow } = await supabase
                .from("agents")
                .select("name")
                .eq("organization_id", updatedCall.organization_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              await sendCallSMS({
                ownerPhone: org.notification_phone as string,
                callerNumber: updatedCall.caller_number ?? "Unknown",
                duration: 0, // duration not available in webhook payload
                summary: summary ?? null,
                status: "completed",
                agentName: agentRow?.name ?? "Your AI Agent",
              });
            }
          } catch (smsErr) {
            console.error("SMS notification failed:", smsErr);
            // Non-blocking — don't fail the webhook
          }
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
