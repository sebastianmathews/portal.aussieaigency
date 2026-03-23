import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAgent } from "@/lib/elevenlabs";

export async function POST(request: NextRequest) {
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
      name,
      voiceId,
      greeting,
      systemPrompt,
      language,
      maxCallDuration,
      callRecording,
      escalationNumber,
      faqs,
      voiceSettings,
      interruptible,
      timezone,
    } = body;

    if (!name || !voiceId || !greeting || !systemPrompt) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, voiceId, greeting, systemPrompt",
        },
        { status: 400 }
      );
    }

    // Get user's organization
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

    // Create agent via ElevenLabs API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookUrl = baseUrl
      ? `${baseUrl}/api/webhooks/elevenlabs`
      : undefined;

    const agent = await createAgent({
      name,
      voiceId,
      greeting,
      systemPrompt,
      webhookUrl,
      language,
      maxCallDuration,
      callRecording,
      escalationNumber,
      faqs,
      voiceSettings,
      interruptible,
      timezone,
    });

    // Insert into agents table
    const { data: agentRecord, error: insertError } = await supabase
      .from("agents")
      .insert({
        elevenlabs_agent_id: agent.agent_id,
        organization_id: orgId,
        name,
        voice_id: voiceId,
        greeting,
        system_prompt: systemPrompt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert agent record:", insertError);
      return NextResponse.json(
        { error: "Agent created in ElevenLabs but failed to save locally" },
        { status: 500 }
      );
    }

    // Update organization with the agent ID
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ elevenlabs_agent_id: agent.agent_id })
      .eq("id", orgId);

    if (updateError) {
      console.error("Failed to update organization with agent ID:", updateError);
    }

    return NextResponse.json(
      { agent: agentRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
