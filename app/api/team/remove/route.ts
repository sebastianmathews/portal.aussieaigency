import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    // Prevent self-removal
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    // Verify both users are in the same org
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = myProfile?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    const { data: memberProfile } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", memberId)
      .single();

    if (memberProfile?.organization_id !== orgId) {
      return NextResponse.json(
        { error: "Member not found in your organization" },
        { status: 404 }
      );
    }

    // Remove org membership (set org to null)
    const { error: updateError } = await admin
      .from("profiles")
      .update({ organization_id: null })
      .eq("id", memberId);

    if (updateError) {
      console.error("Failed to remove member:", updateError);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Member removed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Team remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
