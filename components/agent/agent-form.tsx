"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { VoiceSelector } from "@/components/agent/voice-selector";
import {
  VoiceSettings,
  DEFAULT_VOICE_SETTINGS,
  type VoiceSettingsData,
} from "@/components/agent/voice-settings";
import {
  BusinessHours,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursData,
} from "@/components/agent/business-hours";
import { FAQEditor, type FAQ } from "@/components/agent/faq-editor";
import {
  Settings2,
  Mic2,
  Clock,
  MessageCircleQuestion,
  Sliders,
  Save,
  Loader2,
  Bot,
  Moon,
} from "lucide-react";

export interface AgentData {
  id: string;
  elevenlabsAgentId: string;
  name: string;
  isActive: boolean;
  voiceId: string;
  greeting: string;
  systemPrompt: string;
  escalationNumber: string;
  businessHours: BusinessHoursData | null;
  faqs: FAQ[];
  language: string;
  maxCallDuration: number;
  webhookUrl: string;
  callRecording: boolean;
  voiceSettings: VoiceSettingsData;
  interruptible: boolean;
  timezone: string;
  afterHoursGreeting: string;
  afterHoursBehaviour: string;
  afterHoursTransferNumber: string;
}

interface AgentFormProps {
  agent: AgentData | null;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "Mandarin" },
  { value: "vi", label: "Vietnamese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "el", label: "Greek" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "sv", label: "Swedish" },
  { value: "tr", label: "Turkish" },
];

export function AgentForm({ agent }: AgentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isNew = !agent;

  // Form state
  const [name, setName] = useState(agent?.name ?? "");
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);
  const [voiceId, setVoiceId] = useState(agent?.voiceId ?? "");
  const [greeting, setGreeting] = useState(agent?.greeting ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
  const [escalationNumber, setEscalationNumber] = useState(
    agent?.escalationNumber ?? ""
  );
  const [callTransferEnabled, setCallTransferEnabled] = useState(
    !!(agent?.escalationNumber)
  );
  const [businessHours, setBusinessHours] = useState<BusinessHoursData>(
    agent?.businessHours ?? DEFAULT_BUSINESS_HOURS
  );
  const [faqs, setFaqs] = useState<FAQ[]>(agent?.faqs ?? []);
  const [language, setLanguage] = useState(agent?.language ?? "en");
  const [maxCallDuration, setMaxCallDuration] = useState(
    agent?.maxCallDuration ?? 300
  );
  const [webhookUrl, setWebhookUrl] = useState(agent?.webhookUrl ?? "");
  const [callRecording, setCallRecording] = useState(
    agent?.callRecording ?? false
  );
  const [interruptible, setInterruptible] = useState(
    agent?.interruptible ?? true
  );
  const [timezone, setTimezone] = useState(
    agent?.timezone ?? "Australia/Sydney"
  );
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsData>(
    agent?.voiceSettings ?? DEFAULT_VOICE_SETTINGS
  );
  const [afterHoursGreeting, setAfterHoursGreeting] = useState(
    agent?.afterHoursGreeting ?? ""
  );
  const [afterHoursBehaviour, setAfterHoursBehaviour] = useState(
    agent?.afterHoursBehaviour ?? "message"
  );
  const [afterHoursTransferNumber, setAfterHoursTransferNumber] = useState(
    agent?.afterHoursTransferNumber ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: "Agent name required",
        description: "Please enter a name for your agent.",
        variant: "destructive",
      });
      return;
    }

    if (!voiceId) {
      toast({
        title: "Voice required",
        description:
          'Please select a voice for your agent in the "Voice & Script" tab.',
        variant: "destructive",
      });
      return;
    }

    if (!greeting.trim()) {
      toast({
        title: "Greeting required",
        description:
          'Please enter a greeting message in the "Voice & Script" tab.',
        variant: "destructive",
      });
      return;
    }

    if (!systemPrompt.trim()) {
      toast({
        title: "System prompt required",
        description:
          'Please enter a system prompt in the "Voice & Script" tab.',
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        voiceId,
        greeting: greeting.trim(),
        systemPrompt: systemPrompt.trim(),
        isActive,
        escalationNumber: escalationNumber.trim(),
        businessHours,
        faqs,
        language,
        maxCallDuration,
        webhookUrl: webhookUrl.trim(),
        callRecording,
        voiceSettings,
        interruptible,
        timezone,
        afterHoursGreeting: afterHoursGreeting.trim(),
        afterHoursBehaviour,
        afterHoursTransferNumber: afterHoursTransferNumber.trim(),
        ...(agent ? { agentId: agent.elevenlabsAgentId } : {}),
      };

      const endpoint = isNew
        ? "/api/elevenlabs/create-agent"
        : "/api/elevenlabs/update-agent";

      const method = isNew ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save agent");
      }

      toast({
        title: isNew ? "Agent created" : "Agent updated",
        description: isNew
          ? "Your AI agent has been created and is ready to receive calls."
          : "Your agent configuration has been saved successfully.",
      });

      router.refresh();
    } catch (err) {
      toast({
        title: "Error saving agent",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger
            value="general"
            className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
          >
            <Settings2 className="h-4 w-4 hidden sm:block" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="voice"
            className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
          >
            <Mic2 className="h-4 w-4 hidden sm:block" />
            Voice & Script
          </TabsTrigger>
          <TabsTrigger
            value="hours"
            className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
          >
            <Clock className="h-4 w-4 hidden sm:block" />
            Hours
          </TabsTrigger>
          <TabsTrigger
            value="faqs"
            className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
          >
            <MessageCircleQuestion className="h-4 w-4 hidden sm:block" />
            FAQs
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-1.5 py-2.5 text-xs sm:text-sm"
          >
            <Sliders className="h-4 w-4 hidden sm:block" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* GENERAL TAB                                                      */}
        {/* ================================================================ */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#F5A623]" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure your agent&apos;s basic information and status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Agent name */}
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah - Front Desk"
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify your agent internally.
                </p>
              </div>

              {/* Active/Inactive toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
                <div className="space-y-0.5">
                  <Label htmlFor="agent-active" className="font-medium">
                    Agent Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive
                      ? "Agent is active and will answer calls."
                      : "Agent is paused and will not answer calls."}
                  </p>
                </div>
                <Switch
                  id="agent-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {/* Call transfer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
                  <div className="space-y-0.5">
                    <Label htmlFor="call-transfer-toggle" className="font-medium">
                      Enable Call Transfer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {callTransferEnabled
                        ? "Your AI will transfer calls it can\u2019t handle to a live person."
                        : "Call transfer to a live person is disabled."}
                    </p>
                  </div>
                  <Switch
                    id="call-transfer-toggle"
                    checked={callTransferEnabled}
                    onCheckedChange={(checked) => {
                      setCallTransferEnabled(checked);
                      if (!checked) setEscalationNumber("");
                    }}
                  />
                </div>

                {callTransferEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="escalation-number">
                      Transfer Calls To
                    </Label>
                    <Input
                      id="escalation-number"
                      type="tel"
                      value={escalationNumber}
                      onChange={(e) => setEscalationNumber(e.target.value)}
                      placeholder="e.g. +61 400 000 000"
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your AI will say &quot;Let me transfer you to my
                      colleague&quot; and connect them to this number.
                    </p>
                  </div>
                )}
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="agent-timezone">Agent Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="agent-timezone" className="max-w-md">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Australia/Sydney",
                      "Australia/Melbourne",
                      "Australia/Brisbane",
                      "Australia/Perth",
                      "Australia/Adelaide",
                      "Australia/Hobart",
                      "Australia/Darwin",
                      "Pacific/Auckland",
                      "America/New_York",
                      "America/Los_Angeles",
                      "Europe/London",
                      "Asia/Singapore",
                      "UTC",
                    ].map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for business hours and time references in conversations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* VOICE & SCRIPT TAB                                               */}
        {/* ================================================================ */}
        <TabsContent value="voice">
          <div className="space-y-6">
            {/* Voice selector card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic2 className="h-5 w-5 text-[#F5A623]" />
                  Voice
                </CardTitle>
                <CardDescription>
                  Choose the voice your agent will use when speaking to callers.
                  Click play to preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceSelector value={voiceId} onChange={setVoiceId} />
              </CardContent>
            </Card>

            {/* Voice settings card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-[#F5A623]" />
                  Voice Tuning
                </CardTitle>
                <CardDescription>
                  Fine-tune how your agent&apos;s voice sounds. Adjust warmth,
                  clarity, expressiveness, and speed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceSettings
                  value={voiceSettings}
                  onChange={setVoiceSettings}
                />
              </CardContent>
            </Card>

            {/* Script card */}
            <Card>
              <CardHeader>
                <CardTitle>Script &amp; Personality</CardTitle>
                <CardDescription>
                  Define how your agent greets callers and behaves during
                  conversations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Greeting */}
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea
                    id="greeting"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    placeholder="e.g. Hi there! Thank you for calling Acme Dental. My name is Sarah, how can I help you today?"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    The first thing your agent will say when answering a call.
                  </p>
                </div>

                {/* Interruptible toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Interruptible</Label>
                    <p className="text-xs text-muted-foreground">
                      {interruptible
                        ? "Callers can interrupt the AI while it's speaking."
                        : "AI will finish speaking before listening to the caller."}
                    </p>
                  </div>
                  <Switch
                    checked={interruptible}
                    onCheckedChange={setInterruptible}
                  />
                </div>

                {/* System prompt */}
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <p className="text-xs text-muted-foreground">
                    Define your agent&apos;s personality, knowledge, and
                    behavior. Be specific about what the agent should and should
                    not do.
                  </p>
                  <Textarea
                    id="system-prompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={`You are Sarah, a friendly and professional AI receptionist for Acme Dental Clinic.\n\nYour responsibilities:\n- Answer questions about our services (cleanings, fillings, cosmetic dentistry)\n- Help callers book, reschedule, or cancel appointments\n- Collect caller name, phone number, and reason for visit\n- Transfer to a human if you cannot resolve the caller's issue\n\nTone: Warm, professional, patient. Speak naturally and conversationally.\n\nImportant rules:\n- Never provide medical advice\n- Always confirm details before ending the call\n- If unsure, offer to transfer to our team`}
                    rows={14}
                    className="resize-none font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* BUSINESS HOURS TAB                                               */}
        {/* ================================================================ */}
        <TabsContent value="hours">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#F5A623]" />
                  Business Hours
                </CardTitle>
                <CardDescription>
                  Set when your agent is available. Outside these hours, callers
                  will hear the after-hours message.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BusinessHours
                  value={businessHours}
                  onChange={setBusinessHours}
                />
              </CardContent>
            </Card>

            {/* After-Hours Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-[#F5A623]" />
                  After-Hours Settings
                </CardTitle>
                <CardDescription>
                  Configure how your agent behaves when callers reach you outside
                  business hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
                  <div className="space-y-0.5">
                    <Label className="font-medium">
                      Use different greeting after hours
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {afterHoursGreeting
                        ? "A custom greeting will be used outside business hours."
                        : "Enable to set a custom after-hours greeting."}
                    </p>
                  </div>
                  <Switch
                    checked={!!afterHoursGreeting}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setAfterHoursGreeting("");
                      } else {
                        setAfterHoursGreeting(
                          "Thanks for calling [Business]. We're currently closed. Our hours are Monday to Friday, 9am to 5pm. I can take a message and we'll call you back first thing."
                        );
                      }
                    }}
                  />
                </div>

                {afterHoursGreeting && (
                  <>
                    {/* After-Hours Greeting */}
                    <div className="space-y-2">
                      <Label htmlFor="after-hours-greeting">
                        After-Hours Greeting
                      </Label>
                      <Textarea
                        id="after-hours-greeting"
                        value={afterHoursGreeting}
                        onChange={(e) => setAfterHoursGreeting(e.target.value)}
                        placeholder="Thanks for calling [Business]. We're currently closed. Our hours are Monday to Friday, 9am to 5pm. I can take a message and we'll call you back first thing."
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This greeting will be used instead of the default when
                        callers reach your agent outside business hours.
                      </p>
                    </div>

                    {/* After-Hours Behaviour */}
                    <div className="space-y-2">
                      <Label htmlFor="after-hours-behaviour">
                        After-Hours Behaviour
                      </Label>
                      <Select
                        value={afterHoursBehaviour}
                        onValueChange={setAfterHoursBehaviour}
                      >
                        <SelectTrigger
                          id="after-hours-behaviour"
                          className="max-w-md"
                        >
                          <SelectValue placeholder="Select behaviour" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="message">
                            Take a message
                          </SelectItem>
                          <SelectItem value="transfer">
                            Transfer to mobile
                          </SelectItem>
                          <SelectItem value="voicemail">
                            Voicemail only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        What should the agent do when a call comes in after
                        hours?
                      </p>
                    </div>

                    {/* Transfer number (only when transfer is selected) */}
                    {afterHoursBehaviour === "transfer" && (
                      <div className="space-y-2">
                        <Label htmlFor="after-hours-transfer">
                          After-Hours Transfer Number
                        </Label>
                        <Input
                          id="after-hours-transfer"
                          type="tel"
                          value={afterHoursTransferNumber}
                          onChange={(e) =>
                            setAfterHoursTransferNumber(e.target.value)
                          }
                          placeholder="e.g. +61 400 000 000"
                          className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground">
                          Calls received after hours will be transferred to this
                          number.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* FAQS TAB                                                         */}
        {/* ================================================================ */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-[#F5A623]" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Teach your agent the answers to common questions about your
                business. These will be included in the agent&apos;s knowledge
                base.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FAQEditor value={faqs} onChange={setFaqs} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* ADVANCED TAB                                                     */}
        {/* ================================================================ */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#F5A623]" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune your agent&apos;s behavior with advanced
                configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Your agent will greet callers and respond in this language. Most Australian businesses use English.
                </p>
              </div>

              {/* Max call duration */}
              <div className="space-y-2">
                <Label htmlFor="max-duration">
                  Max Call Duration (seconds)
                </Label>
                <Input
                  id="max-duration"
                  type="number"
                  min={30}
                  max={3600}
                  step={30}
                  value={maxCallDuration}
                  onChange={(e) =>
                    setMaxCallDuration(parseInt(e.target.value, 10) || 300)
                  }
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Calls will automatically end after this duration.{" "}
                  {maxCallDuration >= 60
                    ? `(${Math.floor(maxCallDuration / 60)} min ${maxCallDuration % 60 > 0 ? `${maxCallDuration % 60} sec` : ""})`
                    : `(${maxCallDuration} sec)`}
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/api/webhook"
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Receive real-time notifications when calls start, end, or are
                  transferred.
                </p>
              </div>

              {/* Call recording toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
                <div className="space-y-0.5">
                  <Label htmlFor="call-recording" className="font-medium">
                    Call Recording
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Record all calls for quality assurance and review.
                  </p>
                </div>
                <Switch
                  id="call-recording"
                  checked={callRecording}
                  onCheckedChange={setCallRecording}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button - sticky at bottom */}
      <div className="sticky bottom-0 z-10 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-gray-50/95 backdrop-blur-sm border-t">
        <div className="flex items-center justify-between max-w-full">
          <p className="text-sm text-muted-foreground hidden sm:block">
            {isNew
              ? "Fill in the required fields and save to create your agent."
              : "Changes will be synced to ElevenLabs automatically."}
          </p>
          <Button
            variant="gold"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="ml-auto min-w-[160px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isNew ? "Creating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isNew ? "Create Agent" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
