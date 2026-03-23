/**
 * AI-powered call analysis using OpenAI.
 * Runs after each call to extract insights.
 */

interface CallAnalysis {
  lead_score: number; // 1-10
  intent: string; // booking, enquiry, complaint, support, other
  sentiment: string; // positive, neutral, negative
  follow_up_required: boolean;
  ai_summary: string;
  suggested_action: string;
}

export async function analyzeCall(
  transcript: Array<{ role?: string; message?: string; content?: string }>
): Promise<CallAnalysis | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const transcriptText = transcript
    .map((t) => {
      const role = t.role === "assistant" || t.role === "agent" ? "AI" : "Caller";
      const text = t.message || t.content || "";
      return `${role}: ${text}`;
    })
    .join("\n");

  if (transcriptText.length < 20) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai").default;
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze this call transcript and return a JSON object with:
1. lead_score (1-10, where 10 = hot lead ready to buy)
2. intent (one of: booking, enquiry, complaint, support, other)
3. sentiment (positive, neutral, negative)
4. follow_up_required (true/false)
5. ai_summary (1 sentence summary of the call)
6. suggested_action (1 sentence recommended next step)

Return ONLY valid JSON, no markdown.`,
        },
        { role: "user", content: transcriptText },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return null;

    // Parse JSON (handle potential markdown wrapping)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonStr) as CallAnalysis;
  } catch (err) {
    console.error("Call analysis failed:", err);
    return null;
  }
}
