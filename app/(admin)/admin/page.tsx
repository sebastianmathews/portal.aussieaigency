import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Phone, DollarSign, Users } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  // Get all organizations with subscription info
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("organization_id, plan, status, minutes_included");

  // Get call counts per org
  const { data: allCalls } = await supabase
    .from("calls")
    .select("organization_id, duration");

  // Build org stats map
  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.organization_id, s])
  );

  const callStats = new Map<
    string,
    { count: number; minutes: number }
  >();

  for (const call of allCalls ?? []) {
    const existing = callStats.get(call.organization_id) ?? {
      count: 0,
      minutes: 0,
    };
    existing.count += 1;
    existing.minutes += (call.duration ?? 0) / 60;
    callStats.set(call.organization_id, existing);
  }

  // Totals
  const totalOrgs = organizations?.length ?? 0;
  const totalCallCount = (allCalls ?? []).length;
  const activeSubscriptions = (subscriptions ?? []).filter(
    (s) => s.status === "active"
  ).length;

  // Estimate revenue from active subs
  const planPrices: Record<string, number> = {
    essential: 297,
    complete: 497,
    enterprise: 997,
  };
  const totalRevenue = (subscriptions ?? [])
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

  const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    active: "success",
    trialing: "warning",
    past_due: "destructive",
    canceled: "secondary",
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and organization management
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Organizations
                </p>
                <p className="text-3xl font-bold mt-1">{totalOrgs}</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Calls
                </p>
                <p className="text-3xl font-bold mt-1">{totalCallCount}</p>
              </div>
              <div className="rounded-full bg-green-50 p-3">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Subscriptions
                </p>
                <p className="text-3xl font-bold mt-1">{activeSubscriptions}</p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </p>
                <p className="text-3xl font-bold mt-1">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-gold-50 p-3">
                <DollarSign className="h-5 w-5 text-gold-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Organizations</CardTitle>
          <CardDescription>
            {totalOrgs} organizations registered on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(organizations ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No organizations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Total Calls
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Minutes Used
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Joined
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(organizations ?? []).map((org) => {
                  const sub = subMap.get(org.id);
                  const stats = callStats.get(org.id);
                  return (
                    <TableRow key={org.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link href={`/admin/org/${org.id}`} className="block">
                          <p className="font-medium text-[#F5A623] hover:underline">{org.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {org.id.slice(0, 8)}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">
                        {sub?.plan ?? "None"}
                      </TableCell>
                      <TableCell>
                        {sub ? (
                          <Badge
                            variant={statusVariant[sub.status] ?? "secondary"}
                          >
                            {sub.status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No sub</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {stats?.count ?? 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {Math.round(stats?.minutes ?? 0)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap">
                        {org.created_at
                          ? new Date(org.created_at).toLocaleDateString(
                              "en-AU",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
