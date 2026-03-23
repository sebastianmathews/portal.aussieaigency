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
    const { email, fullName } = body;

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get inviter's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    // Check if email already has an account
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile?.organization_id === orgId) {
      return NextResponse.json(
        { error: "This person is already a member of your organization" },
        { status: 400 }
      );
    }

    if (existingProfile?.organization_id) {
      return NextResponse.json(
        { error: "This email is already associated with another organization" },
        { status: 400 }
      );
    }

    // Create an invited user via Supabase admin
    const { data: invitedUser, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email.trim(), {
        data: {
          full_name: fullName?.trim() || "",
          invited_to_org: orgId,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/callback`,
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500 }
      );
    }

    // Pre-create profile with org membership
    if (invitedUser?.user) {
      await admin.from("profiles").upsert({
        id: invitedUser.user.id,
        email: email.trim().toLowerCase(),
        full_name: fullName?.trim() || "",
        organization_id: orgId,
        role: "client",
      });
    }

    return NextResponse.json(
      { success: true, message: `Invitation sent to ${email}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
