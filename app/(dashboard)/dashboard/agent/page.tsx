import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentForm } from "@/components/agent/agent-form";
import { TestAgent } from "@/components/agent/test-agent";
import { type BusinessHoursData } from "@/components/agent/business-hours";
import { type FAQ } from "@/components/agent/faq-editor";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettingsData } from "@/components/agent/voice-settings";
import { Bot, Sparkles } from "lucide-react";

export default async function AgentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id;

  if (!orgId) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="rounded-full bg-red-50 p-4 mb-4">
            <Bot className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-navy-500">
            No Organization Found
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            You need to be part of an organization to configure an AI agent.
            Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Fetch existing agent for this org
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isNew = !agent;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">
            {isNew ? "Create Your AI Agent" : "Agent Configuration"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isNew
              ? "Set up your AI voice agent to start handling calls"
              : "Manage your AI agent's voice, behavior, and settings"}
          </p>
        </div>
        {!isNew && (
          <div className="hidden sm:flex items-center gap-3">
            {agent?.elevenlabs_agent_id && (
              <TestAgent
                agentId={agent.elevenlabs_agent_id}
                agentName={agent.name}
              />
            )}
            {agent?.is_active && (
              <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700">
                  Agent Active
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup wizard banner for new agents */}
      {isNew && (
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-[#0A1628] to-[#1a2d4a] p-6 text-white">
          <div className="relative z-10 flex items-start gap-4">
            <div className="rounded-full bg-[#F5A623]/20 p-3 shrink-0">
              <Sparkles className="h-6 w-6 text-[#F5A623]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Welcome to your AI Agent setup
              </h2>
              <p className="text-white/70 mt-1 text-sm max-w-xl">
                Configure your agent&apos;s voice, personality, business hours,
                and FAQs. Once saved, your agent will be ready to handle
                incoming calls 24/7.
              </p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#F5A623]/10 blur-2xl" />
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-[#F5A623]/5 blur-xl" />
        </div>
      )}

      {/* Agent form */}
      <AgentForm
        agent={
          agent
            ? {
                id: agent.id,
                elevenlabsAgentId: agent.elevenlabs_agent_id ?? "",
                name: agent.name,
                isActive: agent.is_active ?? true,
                voiceId: agent.voice_id ?? "",
                greeting: agent.greeting ?? "",
                systemPrompt: agent.system_prompt ?? "",
                escalationNumber: agent.escalation_number ?? "",
                businessHours: (agent.business_hours as unknown as BusinessHoursData) ?? null,
                faqs: (agent.faqs as unknown as FAQ[]) ?? [],
                language: agent.language ?? "en",
                maxCallDuration: agent.max_call_duration ?? 300,
                webhookUrl: agent.webhook_url ?? "",
                callRecording: agent.call_recording ?? false,
                voiceSettings: (agent.voice_settings as unknown as VoiceSettingsData) ?? DEFAULT_VOICE_SETTINGS,
              }
            : null
        }
      />
    </div>
  );
}
