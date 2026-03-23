import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Completes signup by creating org + profile using admin client
 * (bypasses RLS). Called after supabase.auth.signUp() succeeds.
 */
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
    const { businessName, fullName } = body;

    if (!businessName?.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if profile already exists (trigger may have created it)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    // If profile already has an org, we're done
    if (existingProfile?.organization_id) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Create organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: businessName.trim() })
      .select("id")
      .single();

    if (orgError) {
      console.error("Failed to create organization:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    if (existingProfile) {
      // Profile exists from trigger — just update org_id
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          organization_id: org.id,
          full_name: fullName?.trim() || existingProfile.id,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update profile:", updateError);
      }
    } else {
      // No profile yet — create one
      const { error: profileError } = await admin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? "",
          full_name: fullName?.trim() || "",
          organization_id: org.id,
        });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
      }
    }

    return NextResponse.json({ success: true, organizationId: org.id }, { status: 200 });
  } catch (error) {
    console.error("Signup complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete signup" },
      { status: 500 }
    );
  }
}
