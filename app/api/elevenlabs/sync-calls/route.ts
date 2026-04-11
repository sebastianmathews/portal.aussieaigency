import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentConversations, getConversation } from "@/lib/elevenlabs";
import { sendCallSMS, sendUnresolvedCallAlert, isUnresolvedCall } from "@/lib/notifications";

export async function POST() {
  try {
    // Use user client for auth check
    const userClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for data operations (bypasses RLS for INSERT on calls)
    const supabase = createAdminClient();

    // Get user's organization and agent
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("id, elevenlabs_agent_id, name")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agent?.elevenlabs_agent_id) {
      return NextResponse.json(
        { error: "No agent found to sync" },
        { status: 404 }
      );
    }

    // Fetch conversations from ElevenLabs
    const conversations = await getAgentConversations(
      agent.elevenlabs_agent_id
    );

    let synced = 0;

    for (const conv of conversations) {
      // Check if we already have this conversation
      const { data: existing } = await supabase
        .from("calls")
        .select("id")
        .eq("elevenlabs_conversation_id", conv.conversation_id)
        .maybeSingle();

      if (existing) continue; // Already synced

      // Fetch full conversation details
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

        const transcript = fullConv.transcript ?? [];
        const summary =
          typeof fullConv.metadata?.summary === "string"
            ? fullConv.metadata.summary
            : null;
        const callerNumber =
          typeof fullConv.metadata?.caller_number === "string"
            ? fullConv.metadata.caller_number
            : "Unknown";

        const insertData: Record<string, unknown> = {
          organization_id: orgId,
          agent_id: agent.id,
          twilio_call_sid: `el_${conv.conversation_id}`,
          elevenlabs_conversation_id: conv.conversation_id,
          caller_number: callerNumber,
          status:
            conv.status === "done" || conv.status === "completed"
              ? "completed"
              : conv.status === "failed"
                ? "failed"
                : "completed",
          duration,
          transcript,
          summary,
          created_at: conv.start_time || new Date().toISOString(),
        };

        await supabase.from("calls").insert(insertData as never);
        synced++;

        // Send notifications for new calls
        try {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", orgId)
            .single();
          const org = orgData as Record<string, unknown> | null;

          const callStatus = (insertData.status as string) ?? "completed";

          // SMS notification
          if (org?.sms_notifications_enabled && org?.notification_phone) {
            await sendCallSMS({
              ownerPhone: org.notification_phone as string,
              callerNumber: callerNumber,
              duration,
              summary,
              status: callStatus,
              agentName: agent.name ?? "Your AI Agent",
            }).catch(() => {});
          }

          // Unresolved call alert
          if (isUnresolvedCall(callStatus, duration)) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("email")
              .eq("organization_id", orgId)
              .limit(1)
              .maybeSingle();

            if (ownerProfile?.email) {
              const { data: insertedCall } = await supabase
                .from("calls")
                .select("id")
                .eq("elevenlabs_conversation_id", conv.conversation_id)
                .maybeSingle();

              const alertParams: Parameters<typeof sendUnresolvedCallAlert>[0] = {
                ownerEmail: ownerProfile.email,
                ownerPhone: org?.notification_phone ? String(org.notification_phone) : undefined,
                smsEnabled: !!org?.sms_notifications_enabled,
                callerNumber,
                callTime: conv.start_time || new Date().toISOString(),
                callId: insertedCall?.id ?? "",
                status: callStatus,
                duration,
                summary,
                agentName: agent.name ?? "Your AI Agent",
                transcriptExcerpt: Array.isArray(transcript) && transcript.length > 0
                  ? transcript.slice(0, 3).map((t: Record<string, unknown>) => `${t.role}: ${t.message}`).join("\n")
                  : null,
              };
              await sendUnresolvedCallAlert(alertParams).catch(() => {});
            }
          }
        } catch {
          // Non-blocking — don't fail sync if notifications fail
        }
      } catch (convError) {
        console.error(
          `Failed to sync conversation ${conv.conversation_id}:`,
          convError
        );
      }
    }

    return NextResponse.json(
      {
        synced,
        total: conversations.length,
        message: `Synced ${synced} new call${synced !== 1 ? "s" : ""}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync calls error:", error);
    return NextResponse.json(
      { error: "Failed to sync calls" },
      { status: 500 }
    );
  }
}
