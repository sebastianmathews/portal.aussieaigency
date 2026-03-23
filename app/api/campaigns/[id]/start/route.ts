import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioClient } from "@/lib/twilio";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const admin = createAdminClient();

    // Get campaign
    const { data: campaign } = await admin
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get agent
    const { data: agent } = await admin
      .from("agents")
      .select("elevenlabs_agent_id")
      .eq("id", campaign.agent_id)
      .single();

    if (!agent?.elevenlabs_agent_id) {
      return NextResponse.json({ error: "Agent not configured" }, { status: 400 });
    }

    // Get org's Twilio number
    const { data: org } = await admin
      .from("organizations")
      .select("twilio_number")
      .eq("id", orgId)
      .single();

    if (!org?.twilio_number) {
      return NextResponse.json({ error: "No phone number assigned" }, { status: 400 });
    }

    // Update campaign status
    await admin
      .from("campaigns")
      .update({ status: "running" } as never)
      .eq("id", params.id);

    const contacts = Array.isArray(campaign.contacts)
      ? (campaign.contacts as Array<{ phone: string; name?: string; context?: string }>)
      : [];

    const client = getTwilioClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    let started = 0;

    // Start calls (limited by max_concurrent)
    const batch = contacts.slice(0, campaign.max_concurrent || 1);

    for (const contact of batch) {
      try {
        // Create campaign call record
        await admin.from("campaign_calls").insert({
          campaign_id: params.id,
          contact_phone: contact.phone,
          contact_name: contact.name || null,
          contact_context: contact.context ? { context: contact.context } : null,
          status: "calling",
        } as never);

        // Initiate outbound call via Twilio
        await client.calls.create({
          to: contact.phone,
          from: org.twilio_number,
          url: `${baseUrl}/api/campaigns/${params.id}/twiml?agentId=${agent.elevenlabs_agent_id}&contactName=${encodeURIComponent(contact.name || "")}&context=${encodeURIComponent(campaign.script_context || "")}`,
          statusCallback: `${baseUrl}/api/campaigns/${params.id}/status`,
          statusCallbackEvent: ["completed", "failed", "busy", "no-answer"],
        });

        started++;
      } catch (callErr) {
        console.error(`Failed to call ${contact.phone}:`, callErr);
      }
    }

    return NextResponse.json(
      { started, total: contacts.length, status: "running" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Campaign start error:", error);
    return NextResponse.json({ error: "Failed to start campaign" }, { status: 500 });
  }
}
