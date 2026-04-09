import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next =
    type === "recovery"
      ? "/reset-password"
      : searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors when called from Server Component context
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After session is established, ensure org + profile exist
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const admin = createAdminClient();

          // Check if profile already has an org
          const { data: existingProfile } = await admin
            .from("profiles")
            .select("id, organization_id")
            .eq("id", user.id)
            .maybeSingle();

          if (!existingProfile?.organization_id) {
            // Get business name from user metadata (set during signup)
            const businessName =
              (user.user_metadata?.business_name as string) ||
              (user.user_metadata?.full_name as string) ||
              "My Business";

            const fullName =
              (user.user_metadata?.full_name as string) || "";

            // Create organization
            const { data: org } = await admin
              .from("organizations")
              .insert({ name: businessName })
              .select("id")
              .single();

            if (org) {
              if (existingProfile) {
                // Profile exists (from trigger) — link to org
                await admin
                  .from("profiles")
                  .update({
                    organization_id: org.id,
                    full_name: fullName || existingProfile.id,
                  })
                  .eq("id", user.id);
              } else {
                // No profile yet — create one
                await admin.from("profiles").insert({
                  id: user.id,
                  email: user.email ?? "",
                  full_name: fullName,
                  organization_id: org.id,
                });
              }

              // Send branded welcome email (fire-and-forget for new signups only)
              try {
                const welcomeUrl = `${origin}/api/auth/welcome-email`;
                fetch(welcomeUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    email: user.email,
                    fullName: fullName || "there",
                    businessName,
                  }),
                }).catch((emailErr) =>
                  console.error("Welcome email fire-and-forget failed:", emailErr)
                );
              } catch (emailErr) {
                console.error("Welcome email error:", emailErr);
              }
            }
          }
        }
      } catch (setupErr) {
        console.error("Post-signup setup error:", setupErr);
        // Don't block the redirect — user can still access dashboard
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
