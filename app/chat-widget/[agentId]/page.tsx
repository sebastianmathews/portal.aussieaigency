"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidgetPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [agentName, setAgentName] = useState("AI Assistant");
  const [businessName, setBusinessName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(`v_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: updated,
          visitorId: visitorId.current,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.agentName) setAgentName(data.agentName);
        if (data.businessName) setBusinessName(data.businessName);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  if (minimized) {
    return (
      <div style={s.container}>
        <button onClick={() => setMinimized(false)} style={s.bubble}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.widget}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div style={s.headerTitle}>{agentName}</div>
              <div style={s.headerSub}>{businessName || "AI Chat Assistant"}</div>
            </div>
          </div>
          <button onClick={() => setMinimized(true)} style={s.closeBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={s.messages}>
          {messages.length === 0 && (
            <div style={s.welcome}>
              <div style={s.welcomeIcon}>👋</div>
              <p style={{ fontWeight: 600, color: "#0A1628", fontSize: "15px", marginBottom: "4px" }}>
                Hi there!
              </p>
              <p style={{ color: "#6B7280", fontSize: "13px" }}>
                Ask me anything about our services. I&apos;m here to help.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "8px" }}>
              <div style={msg.role === "assistant" ? s.botBubble : s.userBubble}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: "flex", marginBottom: "8px" }}>
              <div style={{ ...s.botBubble, opacity: 0.6 }}>
                <span style={s.dots}>
                  <span style={s.dot} /><span style={{ ...s.dot, animationDelay: "0.2s" }} /><span style={{ ...s.dot, animationDelay: "0.4s" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          style={s.inputArea}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={s.textInput}
            disabled={sending}
          />
          <button type="submit" style={s.sendBtn} disabled={sending || !input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>

        <div style={s.branding}>Powered by Aussie AI Agency</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, fontFamily: "'DM Sans', sans-serif" },
  bubble: { width: "60px", height: "60px", borderRadius: "50%", background: "linear-gradient(135deg, #F5A623, #FFCA5F)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(245, 166, 35, 0.4)" },
  widget: { width: "380px", height: "540px", background: "#FFFFFF", borderRadius: "16px", boxShadow: "0 10px 40px rgba(10, 22, 40, 0.2)", display: "flex", flexDirection: "column" as const, overflow: "hidden" },
  header: { background: "#0A1628", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "36px", height: "36px", borderRadius: "50%", background: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontWeight: 600, fontSize: "15px" },
  headerSub: { color: "#10B981", fontSize: "12px", fontWeight: 500 },
  closeBtn: { background: "none", border: "none", color: "#9BA4B5", cursor: "pointer", padding: "4px" },
  messages: { flex: 1, overflowY: "auto" as const, padding: "16px", display: "flex", flexDirection: "column" as const },
  welcome: { textAlign: "center" as const, padding: "30px 20px" },
  welcomeIcon: { fontSize: "36px", marginBottom: "12px" },
  botBubble: { background: "#F7F8FA", color: "#0A1628", padding: "10px 14px", borderRadius: "12px 12px 12px 4px", fontSize: "14px", lineHeight: "1.5", maxWidth: "80%" },
  userBubble: { background: "#0A1628", color: "#FFFFFF", padding: "10px 14px", borderRadius: "12px 12px 4px 12px", fontSize: "14px", lineHeight: "1.5", maxWidth: "80%" },
  dots: { display: "flex", gap: "4px", padding: "4px 0" },
  dot: { width: "6px", height: "6px", borderRadius: "50%", background: "#9BA4B5", animation: "bounce 1.4s infinite ease-in-out" },
  inputArea: { borderTop: "1px solid #E8ECF2", padding: "12px 16px", display: "flex", gap: "8px" },
  textInput: { flex: 1, padding: "10px 14px", border: "1px solid #E8ECF2", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" },
  sendBtn: { width: "40px", height: "40px", borderRadius: "10px", background: "#F5A623", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  branding: { textAlign: "center" as const, fontSize: "11px", color: "#9BA4B5", padding: "8px", borderTop: "1px solid #F7F8FA" },
};
