"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Phone, PhoneOff, Volume2, VolumeX, X, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "connecting" | "connected" | "disconnecting";

interface TranscriptMsg {
  role: "agent" | "user";
  text: string;
}

export function FloatingTestWidget() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("AI Agent");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [conv, setConv] = useState<{
    endSession: () => Promise<void>;
    setVolume: (o: { volume: number }) => void;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch agent on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: agent } = await supabase
        .from("agents")
        .select("elevenlabs_agent_id, name")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agent?.elevenlabs_agent_id) {
        setAgentId(agent.elevenlabs_agent_id);
        setAgentName(agent.name);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startCall = useCallback(async () => {
    if (!agentId) return;
    setStatus("connecting");
    setTranscript([]);

    try {
      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("idle");
          setConv(null);
        },
        onMessage: (msg: { source: string; message: string }) => {
          setTranscript((prev) => [
            ...prev,
            { role: msg.source === "ai" ? "agent" : "user", text: msg.message },
          ]);
        },
        onModeChange: (mode: { mode: string }) => {
          setIsSpeaking(mode.mode === "speaking");
        },
        onError: () => {
          setStatus("idle");
          setConv(null);
        },
      });

      setConv(
        conversation as {
          endSession: () => Promise<void>;
          setVolume: (o: { volume: number }) => void;
        }
      );
    } catch {
      setStatus("idle");
    }
  }, [agentId]);

  const endCall = useCallback(async () => {
    if (conv) {
      setStatus("disconnecting");
      await conv.endSession();
      setStatus("idle");
      setConv(null);
    }
  }, [conv]);

  const toggleMute = () => {
    if (conv) {
      const next = !isMuted;
      setIsMuted(next);
      conv.setVolume({ volume: next ? 0 : 1 });
    }
  };

  const handleClose = () => {
    if (status === "connected") endCall();
    setOpen(false);
  };

  // Don't render if no agent
  if (!agentId) return null;

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#0A1628] hover:bg-[#132039] text-white pl-4 pr-5 py-3 rounded-full shadow-[0_4px_20px_rgba(10,22,40,0.3)] transition-all hover:shadow-[0_8px_30px_rgba(10,22,40,0.4)] hover:-translate-y-0.5 group"
        >
          <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center">
            <Phone className="h-4 w-4 text-[#0A1628]" />
          </div>
          <span className="text-sm font-semibold">Test Your AI</span>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-48px))] bg-white rounded-2xl shadow-[0_10px_40px_rgba(10,22,40,0.2)] overflow-hidden flex flex-col" style={{ height: "min(480px, calc(100vh - 48px))" }}>
          {/* Header */}
          <div className="bg-[#0A1628] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5A623] flex items-center justify-center">
                <Bot className="h-5 w-5 text-[#0A1628]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{agentName}</p>
                <p className={cn(
                  "text-xs font-medium",
                  status === "connected"
                    ? isSpeaking ? "text-[#F5A623]" : "text-green-400"
                    : "text-white/50"
                )}>
                  {status === "idle" && "Ready to test"}
                  {status === "connecting" && "Connecting..."}
                  {status === "connected" && (isSpeaking ? "Speaking..." : "Listening...")}
                  {status === "disconnecting" && "Ending..."}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/50 hover:text-white p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Visual indicator */}
          <div className="flex items-center justify-center py-5 bg-[#F7F8FA]">
            <div className={cn(
              "relative flex items-center justify-center rounded-full transition-all duration-300",
              status === "connected"
                ? isSpeaking ? "h-20 w-20" : "h-16 w-16"
                : "h-16 w-16"
            )}>
              {status === "connected" && isSpeaking && (
                <div className="absolute inset-0 animate-ping rounded-full bg-[#F5A623]/20" />
              )}
              <div className={cn(
                "flex items-center justify-center rounded-full transition-all",
                status === "connected"
                  ? isSpeaking
                    ? "h-14 w-14 bg-[#F5A623]"
                    : "h-12 w-12 bg-[#0A1628]"
                  : "h-12 w-12 bg-gray-200"
              )}>
                {status === "connecting" || status === "disconnecting" ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Bot className={cn(
                    "h-6 w-6",
                    status === "connected" ? "text-white" : "text-gray-400"
                  )} />
                )}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {transcript.length === 0 && (
              <p className="text-center text-xs text-[#9BA4B5] py-4">
                {status === "connected"
                  ? "Start speaking — your AI is listening."
                  : "Click Start Call to test your AI agent."}
              </p>
            )}
            {transcript.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "rounded-xl px-3 py-2 text-xs max-w-[80%] leading-relaxed",
                  msg.role === "agent"
                    ? "bg-[#F7F8FA] text-[#0A1628]"
                    : "bg-[#0A1628] text-white"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="border-t border-[#E8ECF2] px-4 py-3 flex items-center justify-center gap-3">
            {status === "idle" ? (
              <button
                onClick={startCall}
                className="flex items-center gap-2 bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] px-6 py-2.5 rounded-full font-semibold text-sm transition-colors shadow-[0_4px_12px_rgba(245,166,35,0.4)]"
              >
                <Phone className="h-4 w-4" />
                Start Call
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  disabled={status !== "connected"}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border transition-colors",
                    isMuted
                      ? "bg-red-50 border-red-200 text-red-500"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={endCall}
                  disabled={status === "connecting" || status === "disconnecting"}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </button>
              </>
            )}
          </div>

          {/* Branding */}
          <div className="text-center text-[10px] text-[#9BA4B5] py-1.5 border-t border-[#F7F8FA]">
            Powered by Aussie AI Agency
          </div>
        </div>
      )}
    </>
  );
}
