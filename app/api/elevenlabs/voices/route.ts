import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getVoices } from "@/lib/elevenlabs";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const voices = await getVoices();

    return NextResponse.json({ voices }, { status: 200 });
  } catch (error) {
    console.error("Fetch voices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
