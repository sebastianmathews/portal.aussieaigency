import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml, checkRateLimit, getClientIp } from "@/lib/security";

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

    // Rate limit: 5 transcript emails per minute per user
    const ip = getClientIp(request);
    const rl = checkRateLimit(`transcript:${user.id}:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const body = await request.json();
    const { callId, email } = body;

    if (!callId || !email) {
      return NextResponse.json(
        { error: "callId and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Verify user has access to this call via their organization
    const { data: membership, error: memberError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = membership?.organization_id;
    if (memberError || !orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 404 }
      );
    }

    // Fetch the call transcript
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("id, transcript, summary, caller_number, created_at")
      .eq("id", callId)
      .eq("organization_id", orgId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: "Call not found or access denied" },
        { status: 404 }
      );
    }

    if (!call.transcript) {
      return NextResponse.json(
        { error: "No transcript available for this call" },
        { status: 404 }
      );
    }

    // Send transcript via Resend
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const formattedDate = new Date(call.created_at).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Escape all user-controlled content to prevent XSS
    const safeCaller = escapeHtml(call.caller_number ?? "Unknown");
    const safeSummary = call.summary ? escapeHtml(call.summary) : "";
    const safeTranscript = escapeHtml(
      typeof call.transcript === "string"
        ? call.transcript
        : JSON.stringify(call.transcript, null, 2)
    );

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Aussie AI Agency <noreply@aussieaigency.com.au>",
      to: email,
      subject: `Call Transcript — ${safeCaller} — ${formattedDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A1628;">Call Transcript</h2>
          <p><strong>Caller:</strong> ${safeCaller}</p>
          <p><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
          ${safeSummary ? `<h3 style="color: #0A1628;">Summary</h3><p>${safeSummary}</p>` : ""}
          <h3 style="color: #0A1628;">Full Transcript</h3>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-size: 14px;">${safeTranscript}</div>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">Sent by Aussie AI Agency</p>
        </div>
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Transcript will be sent to ${email}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email transcript error:", error);
    return NextResponse.json(
      { error: "Failed to send transcript" },
      { status: 500 }
    );
  }
}
