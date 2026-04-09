"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENT_TEMPLATES, getTemplate, type TemplateVars } from "@/lib/data/agent-templates";
import { VoiceSelector } from "@/components/agent/voice-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Loader2,
  Sparkles,
  Mic2,
  FileText,
  Phone,
  PhoneCall,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "template" | "questions" | "voice" | "creating" | "success";

export default function NewAgentPage() {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voiceId, setVoiceId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [creating, setCreating] = useState(false);

  const template = selectedTemplate ? getTemplate(selectedTemplate) : null;

  const handleSelectTemplate = (id: string | null) => {
    setSelectedTemplate(id);
    setAnswers({});
    setAgentName("");
    if (id) {
      setStep("questions");
    } else {
      // Blank agent — skip questions, go straight to voice + name
      setStep("voice");
    }
  };

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canProceedFromQuestions = () => {
    if (!template) return false;
    return template.questions
      .filter((q) => q.required)
      .every((q) => answers[q.id]?.trim());
  };

  const handleCreate = async () => {
    if (!voiceId || !agentName.trim()) return;

    setCreating(true);
    setStep("creating");

    try {
      let greeting: string;
      let systemPrompt: string;
      let faqs: { question: string; answer: string }[] = [];

      if (template) {
        const vars: TemplateVars = {
          businessName: answers.businessName || "",
          agentName: agentName.trim(),
          phone: answers.phone || "",
          website: answers.website || "",
          address: answers.address || "",
          hours: answers.hours || "",
          services: answers.services || "",
          extra: answers.extra || "",
        };
        greeting = template.greeting(vars.businessName, vars.agentName);
        systemPrompt = template.systemPrompt(vars);
        faqs = template.faqs(vars);
      } else {
        greeting = `Hi, thanks for calling! I'm ${agentName.trim()}, your AI assistant. How can I help you today?`;
        systemPrompt = `You are ${agentName.trim()}, a professional and friendly AI receptionist. Answer questions helpfully, take messages, and offer to transfer to a human if needed.`;
      }

      const res = await fetch("/api/elevenlabs/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          voiceId,
          greeting,
          systemPrompt,
          faqs,
          language: "en",
          maxCallDuration: 300,
          callRecording: true,
          interruptible: true,
          timezone: "Australia/Sydney",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create agent");
      }

      setStep("success");
      setCreating(false);
    } catch (err) {
      toast({
        title: "Failed to create agent",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
      setStep("voice");
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/agent">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#0A1628] font-heading">
          Create New Agent
        </h1>
        <p className="text-[#6B7280] mt-1">
          {step === "template" && "Choose a template to get started quickly, or start from scratch."}
          {step === "questions" && "Tell us about your business so we can set up your AI agent perfectly."}
          {step === "voice" && "Choose a voice and name for your AI agent."}
          {step === "creating" && "Setting up your AI agent..."}
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["template", "questions", "voice"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                step === s || (step === "creating" && s === "voice")
                  ? "bg-[#F5A623] text-[#0A1628]"
                  : ["template", "questions", "voice"].indexOf(step) > i || step === "creating"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
              )}
            >
              {["template", "questions", "voice"].indexOf(step) > i || step === "creating"
                ? "✓"
                : i + 1}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "w-12 h-0.5",
                  ["template", "questions", "voice"].indexOf(step) > i || step === "creating"
                    ? "bg-green-200"
                    : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Template */}
      {step === "template" && (
        <div className="space-y-6">
          {/* Blank agent option */}
          <button
            onClick={() => handleSelectTemplate(null)}
            className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 p-5 hover:border-[#F5A623]/40 hover:bg-[#F5A623]/[0.02] transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Bot className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-[#0A1628]">Blank Agent</p>
              <p className="text-sm text-[#6B7280]">
                Start from scratch with a fully custom configuration
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-[#9BA4B5] uppercase tracking-wider">
              or choose a template
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Template grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {AGENT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className="flex items-start gap-4 rounded-xl border-2 border-gray-100 p-5 hover:border-[#F5A623]/40 hover:shadow-md transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {tmpl.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#0A1628]">{tmpl.name}</p>
                    <Sparkles className="h-3.5 w-3.5 text-[#F5A623] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-[#6B7280] mt-0.5 line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Answer Questions */}
      {step === "questions" && template && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <p className="font-semibold text-[#0A1628]">
                    {template.name} Template
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Fill in your business details to personalise your AI agent
                  </p>
                </div>
              </div>

              {template.questions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#0A1628]">
                    {q.label}
                    {q.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  {q.type === "textarea" ? (
                    <Textarea
                      placeholder={q.placeholder}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      rows={3}
                      className="resize-none border-[#E8ECF2] focus:border-[#F5A623]"
                    />
                  ) : (
                    <Input
                      placeholder={q.placeholder}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="h-11 border-[#E8ECF2] focus:border-[#F5A623]"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preview what will be generated */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-[#F5A623]" />
                <p className="font-semibold text-sm text-[#0A1628]">
                  What we&apos;ll generate for you
                </p>
              </div>
              <ul className="text-sm text-[#6B7280] space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Professional greeting customised for {answers.businessName || "your business"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  System prompt with your services, hours, and policies
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {template.faqs({ businessName: "", agentName: "", phone: "", website: "", address: "", hours: "", services: "", extra: "" }).length} pre-built FAQs for your industry
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Lead capture and appointment booking flow
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep("template")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="gold"
              onClick={() => setStep("voice")}
              disabled={!canProceedFromQuestions()}
              className="gap-1.5"
            >
              Choose Voice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Voice + Name */}
      {step === "voice" && (
        <div className="space-y-6">
          {/* Agent name */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#0A1628] mb-1">
                Name your agent
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                Choose a name that reflects your agent&apos;s purpose
              </p>
              <div className="relative max-w-md">
                <Input
                  placeholder="e.g. Sarah, Amy, James"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.slice(0, 50))}
                  className="h-12 text-lg border-[#E8ECF2] focus:border-[#F5A623] pr-16"
                  maxLength={50}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9BA4B5]">
                  {agentName.length}/50
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Voice selection */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Mic2 className="h-5 w-5 text-[#F5A623]" />
                <h3 className="font-semibold text-[#0A1628]">
                  Choose a voice
                </h3>
              </div>
              <p className="text-sm text-[#6B7280] mb-4">
                Select the voice your agent will use. Click play to preview.
              </p>
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(template ? "questions" : "template")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="gold"
              onClick={handleCreate}
              disabled={!voiceId || !agentName.trim() || creating}
              className="gap-1.5 min-w-[160px]"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Creating state */}
      {step === "creating" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 text-[#F5A623] animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-[#0A1628] font-heading mb-2">
            Setting up {agentName}...
          </h2>
          <p className="text-[#6B7280] max-w-md">
            We&apos;re creating your AI agent{template ? ` with the ${template.name} template` : ""},
            configuring the voice, and setting things up. This takes just a moment.
          </p>
        </div>
      )}

      {/* Success celebration */}
      {step === "success" && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {/* Confetti CSS animation */}
          <style jsx>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
            }
            @keyframes confetti-fall-slow {
              0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(140px) rotate(-540deg); opacity: 0; }
            }
            .confetti-container {
              position: relative;
              width: 200px;
              height: 120px;
              margin: 0 auto;
              overflow: visible;
              pointer-events: none;
            }
            .confetti-piece {
              position: absolute;
              width: 8px;
              height: 8px;
              border-radius: 2px;
              top: 0;
              animation: confetti-fall 1.8s ease-out forwards;
            }
            .confetti-piece:nth-child(odd) {
              animation-name: confetti-fall-slow;
              border-radius: 50%;
              width: 6px;
              height: 6px;
            }
            .confetti-piece:nth-child(1) { left: 10%; background: #F5A623; animation-delay: 0s; animation-duration: 1.6s; }
            .confetti-piece:nth-child(2) { left: 25%; background: #0A1628; animation-delay: 0.1s; animation-duration: 1.8s; }
            .confetti-piece:nth-child(3) { left: 40%; background: #F5A623; animation-delay: 0.05s; animation-duration: 1.5s; }
            .confetti-piece:nth-child(4) { left: 55%; background: #22c55e; animation-delay: 0.15s; animation-duration: 1.7s; }
            .confetti-piece:nth-child(5) { left: 70%; background: #F5A623; animation-delay: 0.08s; animation-duration: 1.9s; }
            .confetti-piece:nth-child(6) { left: 85%; background: #0A1628; animation-delay: 0.12s; animation-duration: 1.6s; }
            .confetti-piece:nth-child(7) { left: 5%; background: #22c55e; animation-delay: 0.2s; animation-duration: 2s; }
            .confetti-piece:nth-child(8) { left: 35%; background: #F5A623; animation-delay: 0.18s; animation-duration: 1.4s; }
            .confetti-piece:nth-child(9) { left: 60%; background: #0A1628; animation-delay: 0.25s; animation-duration: 1.8s; }
            .confetti-piece:nth-child(10) { left: 90%; background: #22c55e; animation-delay: 0.1s; animation-duration: 1.5s; }
            .confetti-piece:nth-child(11) { left: 15%; background: #F5A623; animation-delay: 0.3s; animation-duration: 1.7s; }
            .confetti-piece:nth-child(12) { left: 75%; background: #F5A623; animation-delay: 0.22s; animation-duration: 1.9s; }
          `}</style>

          <div className="confetti-container mb-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="confetti-piece" />
            ))}
          </div>

          <h2 className="text-3xl font-bold text-[#0A1628] font-heading mb-2">
            {"\uD83C\uDF89"} {agentName} is ready to go!
          </h2>
          <p className="text-[#6B7280] mb-8 max-w-md">
            Your agent is live and ready to answer calls once you connect a phone number.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 w-full max-w-2xl mb-8">
            <Link href="/dashboard/agent" className="block">
              <Card className="h-full border-2 border-transparent hover:border-[#F5A623]/40 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center group-hover:bg-[#F5A623]/20 transition-colors">
                    <PhoneCall className="h-6 w-6 text-[#F5A623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A1628] text-sm">Make a Test Call</p>
                    <p className="text-xs text-[#6B7280] mt-1">Try out your new agent</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/settings" className="block">
              <Card className="h-full border-2 border-transparent hover:border-[#F5A623]/40 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center group-hover:bg-[#F5A623]/20 transition-colors">
                    <Phone className="h-6 w-6 text-[#F5A623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A1628] text-sm">Get a Phone Number</p>
                    <p className="text-xs text-[#6B7280] mt-1">Connect a number to go live</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/knowledge-base" className="block">
              <Card className="h-full border-2 border-transparent hover:border-[#F5A623]/40 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center group-hover:bg-[#F5A623]/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-[#F5A623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A1628] text-sm">Train Knowledge Base</p>
                    <p className="text-xs text-[#6B7280] mt-1">Add docs and FAQs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Link href="/dashboard/agent">
            <Button variant="outline" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
