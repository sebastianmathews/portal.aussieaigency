"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Loader2, Bot, User, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatTestProps {
  agentId: string;
  agentName: string;
}

export function ChatTest({ agentId, agentName }: ChatTestProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages,
          visitorId: "dashboard-test",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I couldn't process that. Please check your OpenAI API key is configured." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  if (!open) {
    return (
      <Card className="border-2 border-[#F5A623]/20">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-[#F5A623]" />
          </div>
          <h3 className="font-semibold text-[#0A1628] mb-1">Test Your Chat Widget</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try chatting with your AI to see how it responds to customer questions.
            This is exactly what visitors will experience on your website.
          </p>
          <Button variant="gold" onClick={() => setOpen(true)} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Start Test Chat
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-[#F5A623]/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-[#F5A623]" />
            Test Chat — {agentName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); resetChat(); }} className="text-xs">
              Close
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask questions like your customers would. See if your AI answers correctly.
        </p>
      </CardHeader>
      <CardContent>
        {/* Chat messages */}
        <div className="bg-gray-50 rounded-lg p-4 h-[350px] overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Start a conversation</p>
              <p className="text-xs mt-1">Try asking: &quot;What services do you offer?&quot;</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-[#F5A623]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#0A1628] text-white"
                    : "bg-white border border-gray-200 text-[#0A1628]"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-[#F5A623]" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-[#F5A623]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={loading}
            className="h-11 border-[#E8ECF2] focus:border-[#F5A623]"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="h-11 px-4 bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          💡 Tip: If the bot can&apos;t answer something, add it to your <a href="/dashboard/knowledge-base" className="text-[#F5A623] hover:underline">Knowledge Base</a>
        </p>
      </CardContent>
    </Card>
  );
}
