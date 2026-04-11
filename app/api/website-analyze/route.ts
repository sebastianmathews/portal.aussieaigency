import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeUrl, checkRateLimit, getClientIp } from "@/lib/security";

function getOpenAI() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai").default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** Normalise a user-supplied URL: add https:// if missing, trim whitespace. */
function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

/** Strip HTML to plain text, keeping meaningful content. */
function htmlToText(html: string): string {
  let text = html
    // Remove script, style, nav, footer, header blocks entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Replace block-level tags with newlines for readability
    .replace(/<\/(p|div|li|h[1-6]|tr|br\s*\/?)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&#\d+;/g, "")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  // Cap at 8000 chars to stay within token limits
  if (text.length > 8000) {
    text = text.slice(0, 8000);
  }

  return text;
}

const ANALYSIS_PROMPT = `You are analyzing a business website to create an AI receptionist configuration. Extract the following information from the website content and return as JSON:

{
  "businessName": "exact business name",
  "agentName": "a friendly first name for the AI receptionist, e.g. Sarah, Amy, James",
  "industry": "one of: medical, dental, plumber, electrician, mortgage, insurance, real_estate, legal, other",
  "address": "full business address if found",
  "phone": "business phone number if found",
  "email": "business email if found",
  "website": "the URL",
  "hours": "business hours if found, e.g. Mon-Fri 9am-5pm",
  "services": "comma-separated list of services offered",
  "aboutBusiness": "1-2 sentence description of the business",
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "greeting": "a natural, friendly greeting for the AI receptionist to use when answering calls, including the agent name",
  "systemPrompt": "a complete system prompt for the AI receptionist"
}

Generate 8-12 FAQs based on the website content. Include common questions about:
- Services and what they offer
- Pricing or quotes
- Business hours and location
- How to book an appointment
- Emergency/urgent services (if applicable)
- Payment methods
- Service areas

The greeting should be warm, professional, and Australian-sounding.
The system prompt should instruct the AI to be helpful, collect caller details (name, phone, reason for call), and offer to book appointments.

If you can't find certain information, use reasonable defaults or leave empty.
Return ONLY valid JSON, no markdown fences.`;

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limit: 5 analyses per hour per user ─────────────────────
    const ip = getClientIp(request);
    const rl = checkRateLimit(`website-analyze:${user.id}:${ip}`, 5, 3_600_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached. You can analyse up to 5 websites per hour." },
        { status: 429 }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = await request.json();
    const { url: rawUrl, industry } = body as {
      url?: string;
      industry?: string;
    };

    if (!rawUrl) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // ── Normalise & validate URL ─────────────────────────────────────
    const normalised = normalizeUrl(rawUrl);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalised);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please enter a valid website address." },
        { status: 400 }
      );
    }

    // SSRF protection
    if (!isSafeUrl(parsedUrl.toString())) {
      return NextResponse.json(
        { error: "URL targets a private or internal resource and is not allowed." },
        { status: 400 }
      );
    }

    // ── Fetch website HTML ───────────────────────────────────────────
    let html: string;
    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AussieAIBot/1.0; +https://aussieaigency.com.au)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-AU,en;q=0.9",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Could not access website (HTTP ${response.status}). Please check the URL.` },
          { status: 400 }
        );
      }

      html = await response.text();
    } catch (fetchErr) {
      console.error("Website fetch error:", fetchErr);
      return NextResponse.json(
        { error: "Could not access website. Please check the URL and try again." },
        { status: 400 }
      );
    }

    // ── Extract text ─────────────────────────────────────────────────
    const textContent = htmlToText(html);

    if (textContent.length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough content from this website. The page may be empty or require JavaScript to load." },
        { status: 400 }
      );
    }

    // ── Call OpenAI ──────────────────────────────────────────────────
    let analysisResult: Record<string, unknown>;
    try {
      const openai = getOpenAI();

      const userMessage = [
        `Website URL: ${parsedUrl.toString()}`,
        industry ? `Hint: the business is in the "${industry}" industry.` : "",
        `\nWebsite content:\n${textContent}`,
      ]
        .filter(Boolean)
        .join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2000,
        temperature: 0.4,
      });

      const raw = completion.choices[0]?.message?.content || "";

      // Strip markdown fences if the model wraps them anyway
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      analysisResult = JSON.parse(cleaned);
    } catch (aiErr) {
      console.error("OpenAI analysis error:", aiErr);
      return NextResponse.json(
        { error: "Could not analyse website content. Please try again." },
        { status: 500 }
      );
    }

    // ── Ensure the URL field is always set ────────────────────────────
    analysisResult.website = parsedUrl.toString();

    // ── Return ───────────────────────────────────────────────────────
    return NextResponse.json(
      { success: true, data: analysisResult },
      { status: 200 }
    );
  } catch (error) {
    console.error("Website analyse error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
