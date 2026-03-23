import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AgentForm } from "@/components/agent/agent-form";
import { TestAgent } from "@/components/agent/test-agent";
import { AgentActions } from "@/components/agent/agent-actions";
import { type BusinessHoursData } from "@/components/agent/business-hours";
import { type FAQ } from "@/components/agent/faq-editor";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettingsData } from "@/components/agent/voice-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Bot, Plus, Sparkles } from "lucide-react";

export default async function AgentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
          </p>
        </div>
      </div>
    );
  }

  // Fetch ALL agents for this org
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const agentList = agents ?? [];

  // If no agents, show create prompt
  if (agentList.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0A1628] to-[#1a2d4a] p-10 text-white max-w-lg w-full">
            <div className="relative z-10">
              <div className="rounded-full bg-[#F5A623]/20 p-4 w-fit mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-[#F5A623]" />
              </div>
              <h2 className="text-2xl font-bold font-heading mb-3">
                Create your first AI Agent
              </h2>
              <p className="text-white/60 mb-8 max-w-sm mx-auto">
                Choose from industry templates or start from scratch.
                Your AI receptionist will be ready in minutes.
              </p>
              <Link href="/dashboard/agent/new">
                <Button className="bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] font-semibold gap-2 px-8 py-5 text-base">
                  <Plus className="h-5 w-5" />
                  New Agent
                </Button>
              </Link>
            </div>
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#F5A623]/10 blur-2xl" />
            <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-[#F5A623]/5 blur-xl" />
          </div>
        </div>
      </div>
    );
  }

  // If viewing/editing a specific agent (first one by default)
  const agent = agentList[0];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header with agent list */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628] font-heading">
            Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI voice agents
          </p>
        </div>
        <Link href="/dashboard/agent/new">
          <Button variant="gold" className="gap-2">
            <Plus className="h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      {/* Agent cards */}
      {agentList.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agentList.map((a) => (
            <Card
              key={a.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                a.id === agent.id
                  ? "border-[#F5A623] shadow-sm"
                  : "hover:border-gray-300"
              }`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-[#F5A623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#0A1628]">
                      {a.name}
                    </p>
                    <p className="text-xs text-[#9BA4B5]">
                      {new Date(a.created_at).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.is_active ? (
                    <Badge variant="success" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                  )}
                  <AgentActions agentId={a.id} agentName={a.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Current agent editor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#0A1628] font-heading">
            {agent.name}
          </h2>
          {agent.is_active && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-700">Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {agent.elevenlabs_agent_id && (
            <TestAgent
              agentId={agent.elevenlabs_agent_id}
              agentName={agent.name}
            />
          )}
          <AgentActions agentId={agent.id} agentName={agent.name} />
        </div>
      </div>

      <AgentForm
        agent={{
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
          interruptible: (agent as Record<string, unknown>).interruptible as boolean ?? true,
          timezone: ((agent as Record<string, unknown>).timezone as string) ?? "Australia/Sydney",
        }}
      />
    </div>
  );
}
