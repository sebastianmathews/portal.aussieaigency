import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCallSMS } from "@/lib/notifications";

/**
 * Internal API to send SMS notifications for completed calls.
 * Protected with service role auth (CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  // Verify service-level auth
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      organizationId,
      callerNumber,
      duration,
      summary,
      status,
      agentName,
    } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organizationId" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get org notification settings (use * to avoid type issues with new columns)
    const { data: orgRaw } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();
    const org = orgRaw as Record<string, unknown> | null;

    if (!org?.sms_notifications_enabled || !org?.notification_phone) {
      return NextResponse.json(
        { sent: false, reason: "SMS notifications not enabled or no phone set" },
        { status: 200 }
      );
    }

    await sendCallSMS({
      ownerPhone: org.notification_phone as string,
      callerNumber: callerNumber ?? "Unknown",
      duration: duration ?? 0,
      summary: summary ?? null,
      status: status ?? "completed",
      agentName: agentName ?? "Your AI Agent",
    });

    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (error) {
    console.error("SMS notification error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
