"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoiceSelector } from "@/components/agent/voice-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Globe,
  Phone,
  Building2,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  BookOpen,
  LayoutDashboard,
  Mic2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */
interface FAQ {
  question: string;
  answer: string;
}

/* ---------- Constants ---------- */
const INDUSTRIES = [
  { value: "medical-clinic", label: "Medical Clinic" },
  { value: "dental-clinic", label: "Dental Clinic" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "mortgage-broker", label: "Mortgage Broker" },
  { value: "insurance-agent", label: "Insurance Agent" },
  { value: "real-estate", label: "Real Estate Agent" },
  { value: "legal", label: "Law Firm" },
  { value: "other", label: "Other" },
];

const LOADING_MESSAGES = [
  "Reading your website...",
  "Finding your services...",
  "Generating FAQs...",
  "Creating your greeting...",
  "Almost done...",
];

type Step = 1 | 2 | 3 | 4;

/* ========================================================================== */
/*  Setup Wizard Page                                                         */
/* ========================================================================== */
export default function SetupWizardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // ---------- Step 1 state ----------
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");

  // ---------- Step 2 state ----------
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // ---------- Step 3 state ----------
  const [agentName, setAgentName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [services, setServices] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [voiceId, setVoiceId] = useState("");

  // ---------- Global state ----------
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);

  /* ---------- Step 2: cycle loading messages ---------- */
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [step]);

  /* ---------- Step 2: analyze website ---------- */
  const analyzeWebsite = useCallback(async () => {
    setAnalysisError(null);
    setLoadingMsgIndex(0);

    try {
      const res = await fetch("/api/website-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, industry }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Failed to analyze website");
      }

      // The existing API returns { success: true, data: { ... } }
      const data = json.data || json;

      // Populate step 3 fields from the analysis
      setAgentName(data.agentName || "Sarah");
      setGreeting(data.greeting || "");
      setServices(data.services || "");
      setBusinessHours(data.hours || data.businessHours || "");
      setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
      setSystemPrompt(data.systemPrompt || "");

      // Auto-advance to step 3
      setStep(3);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }, [websiteUrl, industry]);

  useEffect(() => {
    if (step === 2) {
      analyzeWebsite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- Step 1 -> Step 2/3 ---------- */
  const handleStep1Next = () => {
    if (websiteUrl.trim()) {
      setStep(2);
    } else {
      // No URL — skip analysis, go straight to step 3 with empty fields
      setStep(3);
    }
  };

  /* ---------- FAQ helpers ---------- */
  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFaqs((prev) =>
      prev.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq))
    );
  };
  const removeFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  };
  const addFaq = () => {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  };

  /* ---------- Step 3: create agent ---------- */
  const handleCreateAgent = async () => {
    if (!voiceId || !agentName.trim()) {
      toast({
        title: "Missing fields",
        description: "Please choose a voice and enter an agent name.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const finalGreeting =
        greeting.trim() ||
        `Hi, thanks for calling! I'm ${agentName.trim()}, your AI assistant. How can I help you today?`;

      const finalSystemPrompt =
        systemPrompt.trim() ||
        `You are ${agentName.trim()}, a professional and friendly AI receptionist.${
          services ? ` The business offers: ${services}.` : ""
        }${
          businessHours ? ` Business hours are: ${businessHours}.` : ""
        } Answer questions helpfully, take messages, and offer to transfer to a human if needed.`;

      const validFaqs = faqs.filter(
        (f) => f.question.trim() && f.answer.trim()
      );

      const res = await fetch("/api/elevenlabs/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          voiceId,
          greeting: finalGreeting,
          systemPrompt: finalSystemPrompt,
          faqs: validFaqs,
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

      setStep(4);
    } catch (err) {
      toast({
        title: "Failed to create agent",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  /* ---------- Skip link ---------- */
  const handleSkip = () => {
    router.push("/dashboard");
  };

  /* ====================================================================== */
  /*  Render                                                                 */
  /* ====================================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0e1f3d] to-[#0A1628] flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-white/5">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                    step === s
                      ? "bg-[#F5A623] text-[#0A1628] scale-110"
                      : step > s
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-white/40"
                  )}
                >
                  {step > s ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    s
                  )}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      "w-8 sm:w-12 h-0.5 transition-colors duration-300",
                      step > s ? "bg-green-500" : "bg-white/10"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-white/40 hidden sm:block">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-2xl">

          {/* ============================================================ */}
          {/*  STEP 1: Tell us about your business                         */}
          {/* ============================================================ */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5A623]/20 mb-5">
                  <Building2 className="h-8 w-8 text-[#F5A623]" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                  Tell us about your business
                </h1>
                <p className="text-white/60 mt-2 text-sm sm:text-base">
                  We&apos;ll use this to set up your AI receptionist perfectly
                </p>
              </div>

              {/* Form */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-6 space-y-5">
                  {/* Industry */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm font-medium">
                      What industry are you in?
                    </Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="h-12 bg-white/10 border-white/10 text-white focus:border-[#F5A623] [&>span]:text-white/60 [&>span]:data-[state=open]:text-white">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind.value} value={ind.value}>
                            {ind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Website URL */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm font-medium">
                      <Globe className="h-3.5 w-3.5 inline mr-1.5" />
                      Your website URL
                      <span className="text-white/40 font-normal ml-1">(optional)</span>
                    </Label>
                    <Input
                      placeholder="https://yourbusiness.com.au"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623]"
                    />
                    <p className="text-xs text-[#F5A623]/80">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Paste your website and we&apos;ll set everything up automatically
                    </p>
                  </div>

                  {/* Business phone */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm font-medium">
                      <Phone className="h-3.5 w-3.5 inline mr-1.5" />
                      Business phone number
                      <span className="text-white/40 font-normal ml-1">(optional)</span>
                    </Label>
                    <Input
                      placeholder="+61 2 9XXX XXXX"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623]"
                    />
                    <p className="text-xs text-white/40">
                      We&apos;ll use this for SMS notifications
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full h-14 text-base gap-2 rounded-xl shadow-lg shadow-[#F5A623]/20"
                  onClick={handleStep1Next}
                  disabled={!industry}
                >
                  Next
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <button
                  onClick={handleSkip}
                  className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors py-2"
                >
                  I&apos;ll set this up later
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/*  STEP 2: Analyzing your website                               */}
          {/* ============================================================ */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center py-12">
                {!analysisError ? (
                  <>
                    {/* Animated loader */}
                    <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
                      <div className="absolute inset-0 rounded-full border-2 border-[#F5A623]/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-t-[#F5A623] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      <Globe className="h-8 w-8 text-[#F5A623]" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading mb-3">
                      Analyzing your website...
                    </h1>

                    {/* Cycling status messages */}
                    <div className="h-6 overflow-hidden">
                      <p
                        key={loadingMsgIndex}
                        className="text-white/60 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        {LOADING_MESSAGES[loadingMsgIndex]}
                      </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-6">
                      {LOADING_MESSAGES.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            i <= loadingMsgIndex
                              ? "bg-[#F5A623]"
                              : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Error state */}
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 mb-5">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white font-heading mb-2">
                      Couldn&apos;t analyze your website
                    </h2>
                    <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
                      {analysisError}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStep(1);
                          setAnalysisError(null);
                        }}
                        className="gap-1.5 border-white/20 text-white hover:bg-white/10"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                      </Button>
                      <Button
                        variant="gold"
                        onClick={() => {
                          setAnalysisError(null);
                          setStep(3);
                        }}
                        className="gap-1.5"
                      >
                        Continue Manually
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/*  STEP 3: Review your AI receptionist                          */}
          {/* ============================================================ */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Header */}
              <div className="text-center mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                  Review your AI receptionist
                </h1>
                <p className="text-white/60 mt-2 text-sm">
                  Tweak anything below, then hit create
                </p>
              </div>

              {/* Agent name */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5 space-y-2">
                  <Label className="text-white/80 text-sm font-medium">
                    Agent Name
                  </Label>
                  <Input
                    placeholder="e.g. Sarah, Amy, James"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value.slice(0, 50))}
                    className="h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623] text-lg"
                    maxLength={50}
                  />
                </CardContent>
              </Card>

              {/* Greeting */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5 space-y-2">
                  <Label className="text-white/80 text-sm font-medium">
                    Greeting
                  </Label>
                  <p className="text-white/40 text-xs">
                    What your AI says when it picks up the phone
                  </p>
                  <Textarea
                    placeholder="Hi, thanks for calling! I'm your AI assistant. How can I help you today?"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    rows={3}
                    className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623] resize-none"
                  />
                </CardContent>
              </Card>

              {/* Services & Hours */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                  <CardContent className="p-5 space-y-2">
                    <Label className="text-white/80 text-sm font-medium">
                      Services
                    </Label>
                    <Textarea
                      placeholder="e.g. General consultations, check-ups, emergency calls..."
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      rows={3}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623] resize-none"
                    />
                  </CardContent>
                </Card>
                <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                  <CardContent className="p-5 space-y-2">
                    <Label className="text-white/80 text-sm font-medium">
                      Business Hours
                    </Label>
                    <Textarea
                      placeholder="e.g. Mon-Fri 9am-5pm, Sat 9am-1pm"
                      value={businessHours}
                      onChange={(e) => setBusinessHours(e.target.value)}
                      rows={3}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-[#F5A623] resize-none"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* FAQs */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-sm font-medium">
                      FAQs ({faqs.length})
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addFaq}
                      className="text-[#F5A623] hover:text-[#F5A623]/80 hover:bg-[#F5A623]/10 gap-1 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add FAQ
                    </Button>
                  </div>

                  {faqs.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-sm">
                      No FAQs yet. Click &quot;Add FAQ&quot; to teach your AI common questions.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {faqs.map((faq, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-white/5 border border-white/5 p-3 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <Input
                              placeholder="Question"
                              value={faq.question}
                              onChange={(e) =>
                                updateFaq(i, "question", e.target.value)
                              }
                              className="flex-1 h-9 bg-white/10 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#F5A623]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFaq(i)}
                              className="h-9 w-9 text-white/30 hover:text-red-400 hover:bg-red-400/10 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Answer"
                            value={faq.answer}
                            onChange={(e) =>
                              updateFaq(i, "answer", e.target.value)
                            }
                            rows={2}
                            className="bg-white/10 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#F5A623] resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Advanced: System Prompt */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-white/60 text-sm font-medium">
                      Advanced: System Prompt
                    </span>
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    )}
                  </button>
                  {showAdvanced && (
                    <div className="px-5 pb-5 space-y-2">
                      <p className="text-white/30 text-xs">
                        This controls how your AI behaves. Edit only if you know what you&apos;re doing.
                      </p>
                      <Textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={8}
                        className="bg-white/10 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#F5A623] resize-none font-mono text-xs"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Voice selector */}
              <Card className="bg-white/[0.07] border-white/10 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mic2 className="h-5 w-5 text-[#F5A623]" />
                    <Label className="text-white/80 text-sm font-medium">
                      Choose a Voice
                    </Label>
                  </div>
                  <p className="text-white/40 text-xs">
                    Select the voice your AI will use on calls. Click play to preview.
                  </p>
                  <div className="[&_input]:bg-white [&_input]:text-[#0A1628] [&_button]:text-[#0A1628] [&_.text-muted-foreground]:text-gray-500 bg-white rounded-lg p-4">
                    <VoiceSelector value={voiceId} onChange={setVoiceId} />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-3 pb-8">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full h-14 text-base gap-2 rounded-xl shadow-lg shadow-[#F5A623]/20"
                  onClick={handleCreateAgent}
                  disabled={creating || !voiceId || !agentName.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating your AI receptionist...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Create My AI Receptionist
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="text-white/40 hover:text-white/60 hover:bg-white/5 gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <button
                    onClick={handleSkip}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    I&apos;ll set this up later
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/*  STEP 4: Success!                                             */}
          {/* ============================================================ */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in duration-500 text-center py-8">
              {/* Confetti */}
              <style jsx>{`
                @keyframes confetti-fall {
                  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(150px) rotate(720deg); opacity: 0; }
                }
                @keyframes confetti-fall-slow {
                  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(170px) rotate(-540deg); opacity: 0; }
                }
                .confetti-container {
                  position: relative;
                  width: 240px;
                  height: 100px;
                  margin: 0 auto;
                  overflow: visible;
                  pointer-events: none;
                }
                .confetti-piece {
                  position: absolute;
                  width: 10px;
                  height: 10px;
                  border-radius: 2px;
                  top: 0;
                  animation: confetti-fall 2s ease-out forwards;
                }
                .confetti-piece:nth-child(odd) {
                  animation-name: confetti-fall-slow;
                  border-radius: 50%;
                  width: 7px;
                  height: 7px;
                }
                .confetti-piece:nth-child(1) { left: 5%; background: #F5A623; animation-delay: 0s; }
                .confetti-piece:nth-child(2) { left: 15%; background: #22c55e; animation-delay: 0.1s; }
                .confetti-piece:nth-child(3) { left: 25%; background: #F5A623; animation-delay: 0.05s; }
                .confetti-piece:nth-child(4) { left: 35%; background: #3b82f6; animation-delay: 0.15s; }
                .confetti-piece:nth-child(5) { left: 45%; background: #F5A623; animation-delay: 0.08s; }
                .confetti-piece:nth-child(6) { left: 55%; background: #22c55e; animation-delay: 0.12s; }
                .confetti-piece:nth-child(7) { left: 65%; background: #3b82f6; animation-delay: 0.2s; }
                .confetti-piece:nth-child(8) { left: 75%; background: #F5A623; animation-delay: 0.18s; }
                .confetti-piece:nth-child(9) { left: 85%; background: #22c55e; animation-delay: 0.25s; }
                .confetti-piece:nth-child(10) { left: 95%; background: #F5A623; animation-delay: 0.1s; }
              `}</style>

              <div className="confetti-container">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="confetti-piece" />
                ))}
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading mb-3">
                  Your AI receptionist is ready!
                </h1>
                <p className="text-white/60 max-w-md mx-auto">
                  <span className="text-[#F5A623] font-semibold">{agentName}</span>{" "}
                  is live and ready to answer calls. Here&apos;s what to do next:
                </p>
              </div>

              {/* Next step cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Link href="/dashboard/agent" className="block">
                  <Card className="h-full bg-white/[0.07] border-white/10 hover:border-[#F5A623]/40 hover:bg-white/[0.1] transition-all cursor-pointer group">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/20 flex items-center justify-center group-hover:bg-[#F5A623]/30 transition-colors">
                        <PhoneCall className="h-7 w-7 text-[#F5A623]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          Test it now
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          Make a test call to your AI
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/knowledge-base" className="block">
                  <Card className="h-full bg-white/[0.07] border-white/10 hover:border-[#F5A623]/40 hover:bg-white/[0.1] transition-all cursor-pointer group">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/20 flex items-center justify-center group-hover:bg-[#F5A623]/30 transition-colors">
                        <BookOpen className="h-7 w-7 text-[#F5A623]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          Train it more
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          Add docs and knowledge
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard" className="block">
                  <Card className="h-full bg-white/[0.07] border-white/10 hover:border-[#F5A623]/40 hover:bg-white/[0.1] transition-all cursor-pointer group">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/20 flex items-center justify-center group-hover:bg-[#F5A623]/30 transition-colors">
                        <LayoutDashboard className="h-7 w-7 text-[#F5A623]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          Go to Dashboard
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          See your overview
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
