import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?google=error&reason=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?google=error&reason=missing_params`
      );
    }

    // Decode state
    let stateData: { orgId: string; userId: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?google=error&reason=invalid_state`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?google=error&reason=no_refresh_token`
      );
    }

    const admin = createAdminClient();

    // Store integration in organizations table
    await admin
      .from("organizations")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected: true,
      } as Record<string, unknown>)
      .eq("id", stateData.orgId);

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?google=connected`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?google=error&reason=exchange_failed`
    );
  }
}
