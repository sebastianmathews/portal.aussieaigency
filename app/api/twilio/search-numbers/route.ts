import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAvailableNumbers } from "@/lib/twilio";

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
    const { areaCode } = body;

    // Search for Australian numbers
    const numbers = await searchAvailableNumbers("AU", areaCode || undefined);

    return NextResponse.json({ numbers }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Search numbers error:", message);
    return NextResponse.json(
      { error: message || "Failed to search for available numbers" },
      { status: 500 }
    );
  }
}
