import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentConversations, getConversation } from "@/lib/elevenlabs";
import { sendCallSMS, isUnresolvedCall, sendUnresolvedCallAlert } from "@/lib/notifications";

/**
 * Cron job to sync calls from ElevenLabs for ALL organizations.
 * Runs every 15 minutes via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, elevenlabs_agent_id, organization_id, name")
      .not("elevenlabs_agent_id", "is", null);

    let totalSynced = 0;

    for (const agent of agents ?? []) {
      if (!agent.elevenlabs_agent_id) continue;

      try {
        const conversations = await getAgentConversations(agent.elevenlabs_agent_id);

        for (const conv of conversations) {
          // Check if already synced
          const { data: existing } = await supabase
            .from("calls")
            .select("id")
            .eq("elevenlabs_conversation_id", conv.conversation_id)
            .maybeSingle();

          if (existing) continue;

          try {
            const fullConv = await getConversation(conv.conversation_id);

            const duration =
              conv.end_time && conv.start_time
                ? Math.round(
                    (new Date(conv.end_time).getTime() -
                      new Date(conv.start_time).getTime()) /
                      1000
                  )
                : 0;

            const insertData: Record<string, unknown> = {
              organization_id: agent.organization_id,
              agent_id: agent.id,
              twilio_call_sid: `el_${conv.conversation_id}`,
              elevenlabs_conversation_id: conv.conversation_id,
              caller_number:
                typeof fullConv.metadata?.caller_number === "string"
                  ? fullConv.metadata.caller_number
                  : "Unknown",
              status: "completed",
              duration,
              transcript: fullConv.transcript ?? [],
              summary:
                typeof fullConv.metadata?.summary === "string"
                  ? fullConv.metadata.summary
                  : null,
              recording_url:
                typeof fullConv.metadata?.recording_url === "string"
                  ? fullConv.metadata.recording_url
                  : null,
              created_at: conv.start_time || new Date().toISOString(),
            };

            await supabase.from("calls").insert(insertData as never);
            totalSynced++;

            // Send SMS notification if enabled for this org
            try {
              const { data: orgRaw } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", agent.organization_id)
                .single();
              const org = orgRaw as Record<string, unknown> | null;

              const callerNum =
                typeof fullConv.metadata?.caller_number === "string"
                  ? fullConv.metadata.caller_number
                  : "Unknown";

              const callSummary =
                typeof fullConv.metadata?.summary === "string"
                  ? fullConv.metadata.summary
                  : null;

              const callStatus = (insertData.status as string) ?? "completed";

              if (
                org?.sms_notifications_enabled &&
                org?.notification_phone
              ) {
                await sendCallSMS({
                  ownerPhone: org.notification_phone as string,
                  callerNumber: callerNum,
                  duration,
                  summary: callSummary,
                  status: callStatus,
                  agentName: agent.name ?? "Your AI Agent",
                });
              }

              // Check for unresolved calls and send alert
              if (isUnresolvedCall(callStatus, duration)) {
                try {
                  // Get owner email from profiles
                  const { data: ownerProfile } = await supabase
                    .from("profiles")
                    .select("email")
                    .eq("organization_id", agent.organization_id)
                    .eq("role", "client")
                    .limit(1)
                    .maybeSingle();

                  const ownerEmail = ownerProfile?.email;
                  if (ownerEmail) {
                    // Extract a short transcript excerpt (first few exchanges)
                    let transcriptExcerpt: string | null = null;
                    if (Array.isArray(fullConv.transcript)) {
                      const lines = fullConv.transcript
                        .slice(0, 6)
                        .map((t: Record<string, unknown>) => {
                          const role = t.role === "agent" ? "Agent" : "Caller";
                          const msg =
                            typeof t.message === "string"
                              ? t.message.slice(0, 100)
                              : "";
                          return `${role}: ${msg}`;
                        });
                      transcriptExcerpt = lines.join("\n");
                    }

                    // Get the inserted call ID
                    const { data: insertedCall } = await supabase
                      .from("calls")
                      .select("id")
                      .eq("elevenlabs_conversation_id", conv.conversation_id)
                      .maybeSingle();

                    await sendUnresolvedCallAlert({
                      ownerEmail,
                      ownerPhone: (org?.notification_phone as string) ?? undefined,
                      smsEnabled: !!org?.sms_notifications_enabled,
                      callerNumber: callerNum,
                      callTime: conv.start_time || new Date().toISOString(),
                      callId: insertedCall?.id ?? "",
                      status: callStatus,
                      duration,
                      summary: callSummary,
                      transcriptExcerpt,
                      agentName: agent.name ?? "Your AI Agent",
                    });
                  }
                } catch (alertErr) {
                  console.error("Unresolved call alert failed:", alertErr);
                }
              }
            } catch (smsErr) {
              console.error("SMS notification failed:", smsErr);
              // Non-blocking — don't fail the sync
            }
          } catch (convErr) {
            console.error(`Failed to sync ${conv.conversation_id}:`, convErr);
          }
        }
      } catch (agentErr) {
        console.error(`Failed to sync agent ${agent.elevenlabs_agent_id}:`, agentErr);
      }
    }

    return NextResponse.json(
      { synced: totalSynced, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
