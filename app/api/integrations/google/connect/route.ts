import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // State contains org ID + CSRF nonce for callback verification
    const { randomBytes } = await import("crypto");
    const nonce = randomBytes(16).toString("hex");
    const state = Buffer.from(
      JSON.stringify({ orgId: profile.organization_id, userId: user.id, nonce })
    ).toString("base64url");

    const authUrl = getGoogleAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Google connect error:", message);

    // Check for missing env vars
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars");
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?google=error&reason=config_error`
    );
  }
}
