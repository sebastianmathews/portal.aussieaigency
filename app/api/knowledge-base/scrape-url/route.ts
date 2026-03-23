import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeUrl, checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Rate limit: 10 URL scrapes per minute per user
    const ip = getClientIp(request);
    const rl = checkRateLimit(`scrape:${user.id}:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Must start with http:// or https://" },
        { status: 400 }
      );
    }

    // SSRF protection: block private/internal IPs and metadata endpoints
    if (!isSafeUrl(parsedUrl.toString())) {
      return NextResponse.json(
        { error: "URL targets a private or internal resource and is not allowed." },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AussieAIBot/1.0; +https://aussieaigency.com.au)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (HTTP ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Extract text content from HTML
    let textContent = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Limit content
    textContent = textContent.slice(0, 50000);

    if (textContent.length < 20) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from this URL" },
        { status: 400 }
      );
    }

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").trim()
      : parsedUrl.hostname;

    return NextResponse.json(
      {
        success: true,
        item: {
          type: "url",
          name: title,
          url: parsedUrl.toString(),
          content: textContent,
          scrapedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("URL scrape error:", error);
    return NextResponse.json(
      { error: "Failed to fetch and process URL" },
      { status: 500 }
    );
  }
}
