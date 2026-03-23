import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  // Fetch organization
  const { data: orgMembership } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  let organization = null;
  const orgId = orgMembership?.organization_id;
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .single();
    organization = org;
  }

  const userProfile = {
    id: user.id,
    full_name: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? "",
    role: profile?.role ?? "member",
    avatar_url: null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={userProfile} organization={organization} />

      {/* Main content */}
      <main className="lg:pl-[280px]">
        {/* Spacer for mobile top bar */}
        <div className="h-14 lg:hidden" />
        <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
