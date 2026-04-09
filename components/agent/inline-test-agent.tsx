"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Mic, MicOff, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineTestAgentProps {
  agentId: string;
  agentName: string;
}

type ConversationStatus = "idle" | "connecting" | "connected" | "disconnecting";

/**
 * Inline (non-dialog) version of the test agent component.
 * Renders directly in the page without a modal wrapper.
 */
export function InlineTestAgent({ agentId, agentName }: InlineTestAgentProps) {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationInstance, setConversationInstance] = useState<{
    endSession: () => Promise<void>;
    setVolume: (opts: { volume: number }) => void;
  } | null>(null);
  const [transcript, setTranscript] = useState<
    Array<{ role: "agent" | "user"; text: string }>
  >([]);

  const startConversation = useCallback(async () => {
    try {
      setStatus("connecting");
      setTranscript([]);

      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        onConnect: () => {
          setStatus("connected");
        },
        onDisconnect: () => {
          setStatus("idle");
          setConversationInstance(null);
        },
        onMessage: (message: { source: string; message: string }) => {
          setTranscript((prev) => [
            ...prev,
            {
              role: message.source === "ai" ? "agent" : "user",
              text: message.message,
            },
          ]);
        },
        onModeChange: (mode: { mode: string }) => {
          setIsSpeaking(mode.mode === "speaking");
        },
        onError: (error: unknown) => {
          console.error("Conversation error:", error);
          setStatus("idle");
          setConversationInstance(null);
        },
      });

      setConversationInstance(conversation as {
        endSession: () => Promise<void>;
        setVolume: (opts: { volume: number }) => void;
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setStatus("idle");
    }
  }, [agentId]);

  const endConversation = useCallback(async () => {
    if (conversationInstance) {
      setStatus("disconnecting");
      await conversationInstance.endSession();
      setStatus("idle");
      setConversationInstance(null);
    }
  }, [conversationInstance]);

  const toggleMute = useCallback(() => {
    if (conversationInstance) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      conversationInstance.setVolume({ volume: newMuted ? 0 : 1 });
    }
  }, [conversationInstance, isMuted]);

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-center justify-center">
        <Badge
          variant={
            status === "connected"
              ? "success"
              : status === "connecting" || status === "disconnecting"
                ? "warning"
                : "secondary"
          }
          className="text-sm px-4 py-1"
        >
          {status === "idle" && "Ready to test"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" &&
            (isSpeaking ? "Agent speaking..." : "Listening...")}
          {status === "disconnecting" && "Ending call..."}
        </Badge>
      </div>

      {/* Visual feedback - pulsing circle */}
      <div className="flex items-center justify-center py-4">
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-300",
            status === "connected"
              ? isSpeaking
                ? "h-24 w-24 bg-[#F5A623]/20"
                : "h-20 w-20 bg-[#0A1628]/10"
              : "h-20 w-20 bg-gray-100"
          )}
        >
          {status === "connected" && isSpeaking && (
            <div className="absolute inset-0 animate-ping rounded-full bg-[#F5A623]/10" />
          )}
          <div
            className={cn(
              "flex items-center justify-center rounded-full transition-all",
              status === "connected"
                ? isSpeaking
                  ? "h-14 w-14 bg-[#F5A623]"
                  : "h-14 w-14 bg-[#0A1628]"
                : "h-14 w-14 bg-gray-200"
            )}
          >
            {status === "connecting" || status === "disconnecting" ? (
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            ) : (
              <Bot
                className={cn(
                  "h-7 w-7",
                  status === "connected" ? "text-white" : "text-gray-400"
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto space-y-2 rounded-lg border p-3 bg-gray-50">
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "text-sm rounded-lg px-3 py-2 max-w-[85%]",
                msg.role === "agent"
                  ? "bg-[#0A1628] text-white mr-auto"
                  : "bg-[#F5A623]/15 text-[#0A1628] ml-auto"
              )}
            >
              <span className="text-[10px] font-semibold uppercase opacity-70 block mb-0.5">
                {msg.role === "agent" ? agentName : "You"}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {status === "idle" ? (
          <Button
            onClick={startConversation}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8"
            size="lg"
          >
            <Phone className="h-5 w-5" />
            Start Test Call
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className={cn(
                "h-12 w-12 rounded-full",
                isMuted && "bg-red-50 border-red-200"
              )}
              disabled={status !== "connected"}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5 text-red-500" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={endConversation}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 px-8 h-12 rounded-full"
              disabled={status === "connecting" || status === "disconnecting"}
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </Button>
          </>
        )}
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Powered by Aussie AI Agency
      </p>
    </div>
  );
}
