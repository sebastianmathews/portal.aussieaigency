"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

type ConversationStatus = "idle" | "connecting" | "connected" | "disconnecting";

interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
}

export default function WidgetPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [minimized, setMinimized] = useState(true);
  const [conversationInstance, setConversationInstance] = useState<{
    endSession: () => Promise<void>;
    setVolume: (opts: { volume: number }) => void;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startConversation = useCallback(async () => {
    try {
      setStatus("connecting");
      setTranscript([]);

      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        onConnect: () => setStatus("connected"),
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
          console.error("Widget conversation error:", error);
          setStatus("idle");
          setConversationInstance(null);
        },
      });

      setConversationInstance(
        conversation as {
          endSession: () => Promise<void>;
          setVolume: (opts: { volume: number }) => void;
        }
      );
    } catch (error) {
      console.error("Failed to start widget conversation:", error);
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

  const handleOpen = () => {
    setMinimized(false);
    if (status === "idle") {
      startConversation();
    }
  };

  const handleClose = () => {
    if (status === "connected") {
      endConversation();
    }
    setMinimized(true);
  };

  // Minimized bubble
  if (minimized) {
    return (
      <div style={styles.container}>
        <button onClick={handleOpen} style={styles.bubble}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.widget}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatarDot}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0A1628"
                strokeWidth="2.5"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <div style={styles.headerTitle}>AI Assistant</div>
              <div style={styles.headerStatus}>
                {status === "connected"
                  ? isSpeaking
                    ? "Speaking..."
                    : "Listening..."
                  : status === "connecting"
                    ? "Connecting..."
                    : "Offline"}
              </div>
            </div>
          </div>
          <button onClick={handleClose} style={styles.closeBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={styles.messages}>
          {transcript.length === 0 && status === "connected" && (
            <div style={styles.emptyState}>
              <p style={{ color: "#9BA4B5", fontSize: "14px" }}>
                Your AI assistant is ready. Start speaking or type a message.
              </p>
            </div>
          )}
          {transcript.length === 0 && status !== "connected" && (
            <div style={styles.emptyState}>
              <p style={{ color: "#9BA4B5", fontSize: "14px" }}>
                {status === "connecting"
                  ? "Connecting to your AI assistant..."
                  : "Click the microphone to start a conversation."}
              </p>
            </div>
          )}
          {transcript.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.msgRow,
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={
                  msg.role === "agent" ? styles.agentBubble : styles.userBubble
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          {status === "connected" && isSpeaking && (
            <div style={styles.msgRow}>
              <div style={{ ...styles.agentBubble, opacity: 0.6 }}>
                <span style={styles.typing}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Voice controls */}
        <div style={styles.inputArea}>
            <div style={styles.voiceArea}>
              {status === "connected" ? (
                <button onClick={endConversation} style={styles.endCallBtn}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Z" />
                  </svg>
                  End Call
                </button>
              ) : (
                <button
                  onClick={startConversation}
                  style={styles.startCallBtn}
                  disabled={status === "connecting"}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0A1628"
                    strokeWidth="2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  {status === "connecting" ? "Connecting..." : "Start Voice Call"}
                </button>
              )}
            </div>
        </div>

        {/* Branding */}
        <div style={styles.branding}>Powered by Aussie AI Agency</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 9999,
    fontFamily: "'DM Sans', sans-serif",
  },
  bubble: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #F5A623, #FFCA5F)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(245, 166, 35, 0.4)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  widget: {
    width: "380px",
    height: "560px",
    background: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(10, 22, 40, 0.2)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  header: {
    background: "#0A1628",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatarDot: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#F5A623",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: "15px",
  },
  headerStatus: {
    color: "#10B981",
    fontSize: "12px",
    fontWeight: 500,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9BA4B5",
    cursor: "pointer",
    padding: "4px",
  },
  messages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "20px",
  },
  msgRow: {
    display: "flex",
  },
  agentBubble: {
    background: "#F7F8FA",
    color: "#0A1628",
    padding: "10px 14px",
    borderRadius: "12px 12px 12px 4px",
    fontSize: "14px",
    lineHeight: "1.5",
    maxWidth: "80%",
  },
  userBubble: {
    background: "#0A1628",
    color: "#FFFFFF",
    padding: "10px 14px",
    borderRadius: "12px 12px 4px 12px",
    fontSize: "14px",
    lineHeight: "1.5",
    maxWidth: "80%",
  },
  typing: {
    display: "flex",
    gap: "4px",
    padding: "4px 0",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#9BA4B5",
    animation: "bounce 1.4s infinite ease-in-out",
  },
  inputArea: {
    borderTop: "1px solid #E8ECF2",
    padding: "12px 16px",
  },
  modeToggle: {
    display: "flex",
    gap: "4px",
    marginBottom: "10px",
    background: "#F7F8FA",
    borderRadius: "8px",
    padding: "3px",
  },
  modeActive: {
    flex: 1,
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "#0A1628",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  modeInactive: {
    flex: 1,
    padding: "6px",
    borderRadius: "6px",
    border: "none",
    background: "transparent",
    color: "#6B7280",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  voiceArea: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 0",
  },
  startCallBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 24px",
    background: "#F5A623",
    color: "#0A1628",
    border: "none",
    borderRadius: "50px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  endCallBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 24px",
    background: "#EF4444",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "50px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  textForm: {
    display: "flex",
    gap: "8px",
  },
  textInput: {
    flex: 1,
    padding: "10px 14px",
    border: "1px solid #E8ECF2",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#F5A623",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  branding: {
    textAlign: "center" as const,
    fontSize: "11px",
    color: "#9BA4B5",
    padding: "8px",
    borderTop: "1px solid #F7F8FA",
  },
};
