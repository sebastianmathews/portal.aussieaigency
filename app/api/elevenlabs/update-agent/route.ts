import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAgent } from "@/lib/elevenlabs";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      agentId,
      name,
      voiceId,
      greeting,
      systemPrompt,
      faqs,
      escalationNumber,
      businessHours,
      language,
      maxCallDuration,
      callRecording,
      webhookUrl,
    } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this agent
    const { data: membership, error: memberError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = membership?.organization_id;
    if (memberError || !orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 404 }
      );
    }

    const { data: agentRecord, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("elevenlabs_agent_id", agentId)
      .eq("organization_id", orgId)
      .single();

    if (agentError || !agentRecord) {
      return NextResponse.json(
        { error: "Agent not found or access denied" },
        { status: 404 }
      );
    }

    // Update agent via ElevenLabs API with all config
    await updateAgent(agentId, {
      name,
      voiceId,
      greeting,
      systemPrompt,
      faqs,
      escalationNumber,
      language,
      maxCallDuration,
      callRecording,
      webhookUrl,
    });

    // Update local agents table
    const localUpdate: Record<string, unknown> = {};
    if (name) localUpdate.name = name;
    if (voiceId) localUpdate.voice_id = voiceId;
    if (greeting) localUpdate.greeting = greeting;
    if (systemPrompt) localUpdate.system_prompt = systemPrompt;
    if (faqs !== undefined) localUpdate.faqs = faqs;
    if (escalationNumber !== undefined)
      localUpdate.escalation_number = escalationNumber;
    if (businessHours !== undefined)
      localUpdate.business_hours = businessHours;
    if (language !== undefined) localUpdate.language = language;
    if (maxCallDuration !== undefined)
      localUpdate.max_call_duration = maxCallDuration;
    if (callRecording !== undefined)
      localUpdate.call_recording = callRecording;

    localUpdate.updated_at = new Date().toISOString();

    const { data: updatedAgent, error: updateError } = await supabase
      .from("agents")
      .update(localUpdate)
      .eq("elevenlabs_agent_id", agentId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update agent record:", updateError);
      return NextResponse.json(
        { error: "Agent updated in ElevenLabs but failed to update locally" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { agent: updatedAgent },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update agent error:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}
