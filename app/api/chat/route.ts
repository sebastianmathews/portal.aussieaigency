import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security";

function getOpenAI() {
  // Dynamic import to avoid build-time initialization
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai").default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, messages, visitorId } = body;

    if (!agentId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "agentId and messages are required" },
        { status: 400 }
      );
    }

    // Rate limit per visitor: 30 messages per minute
    const rl = checkRateLimit(`chat:${visitorId || "anon"}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment." },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Fetch agent config
    const { data: agent } = await supabase
      .from("agents")
      .select("name, system_prompt, greeting, faqs, organization_id")
      .eq("elevenlabs_agent_id", agentId)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get org name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", agent.organization_id)
      .single();

    // Build system prompt with FAQs
    let systemPrompt = agent.system_prompt || "";

    // Add chat-specific instructions
    systemPrompt += `\n\nYou are now responding via text chat on the business website. Keep responses concise and helpful. Use short paragraphs. Don't mention phone calls unless asked. Your name is ${agent.name}.`;

    // Append FAQs
    const faqs = Array.isArray(agent.faqs) ? (agent.faqs as Array<{ question: string; answer: string }>) : [];
    if (faqs.length > 0) {
      systemPrompt += "\n\n---\nFrequently Asked Questions:\n\n";
      systemPrompt += faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    }

    // Build messages array for OpenAI
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I apologize, I couldn't process that. Please try again.";

    return NextResponse.json(
      {
        reply,
        agentName: agent.name,
        businessName: org?.name || "",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
