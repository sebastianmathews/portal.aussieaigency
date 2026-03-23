import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Phone, Clock, Bot, CalendarCheck } from "lucide-react";
import { formatDuration, formatDate, formatPhone } from "@/lib/utils";
import { DashboardChart } from "@/components/dashboard/chart";
import { Onboarding } from "@/components/dashboard/onboarding";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  completed: "success",
  failed: "destructive",
  transferred: "default",
  in_progress: "warning",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get org membership
  const { data: orgMembership } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = orgMembership?.organization_id;
  if (!orgId) redirect("/login");

  // Fetch stats
  const { count: totalCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const { data: durationData } = await supabase
    .from("calls")
    .select("duration")
    .eq("organization_id", orgId);

  const totalMinutes = Math.round(
    (durationData ?? []).reduce((sum, c) => sum + (c.duration ?? 0), 0) / 60
  );

  const { count: activeAgents } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const { count: appointments } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .not("lead_data", "is", null);

  // Fetch recent calls
  const { data: recentCalls } = await supabase
    .from("calls")
    .select("id, caller_number, status, duration, created_at, summary")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch call volume for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: weekCalls } = await supabase
    .from("calls")
    .select("created_at")
    .eq("organization_id", orgId)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Build chart data
  const chartData: { day: string; calls: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString("en-AU", { weekday: "short" });
    const dateStr = d.toISOString().split("T")[0];
    const count = (weekCalls ?? []).filter(
      (c) => c.created_at?.startsWith(dateStr)
    ).length;
    chartData.push({ day: dayStr, calls: count });
  }

  // Get subscription for minutes included
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, minutes_included, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .single();

  const minutesIncluded = subscription?.minutes_included ?? 500;

  // Onboarding checks
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("twilio_number")
    .eq("id", orgId)
    .single();

  const { data: agentCheck } = await supabase
    .from("agents")
    .select("id, faqs, knowledge_items")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();

  const hasAgent = !!agentCheck;
  const hasPhone = !!org?.twilio_number;
  const faqCount = Array.isArray(agentCheck?.faqs) ? (agentCheck.faqs as unknown[]).length : 0;
  const kbCount = Array.isArray((agentCheck as Record<string, unknown>)?.knowledge_items)
    ? ((agentCheck as Record<string, unknown>).knowledge_items as unknown[]).length
    : 0;
  const hasKnowledge = faqCount > 0 || kbCount > 0;

  const stats = [
    {
      title: "Total Calls",
      value: totalCalls ?? 0,
      icon: Phone,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Minutes Used",
      value: totalMinutes,
      icon: Clock,
      color: "text-gold-600",
      bg: "bg-gold-50",
    },
    {
      title: "Active Agents",
      value: activeAgents ?? 0,
      icon: Bot,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Leads Captured",
      value: appointments ?? 0,
      icon: CalendarCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your AI receptionist performance
        </p>
      </div>

      {/* Onboarding wizard (hides when all steps done) */}
      <Onboarding
        userName={profile?.full_name ?? ""}
        hasAgent={hasAgent}
        hasPhone={hasPhone}
        hasKnowledge={hasKnowledge}
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Call volume chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Call Volume</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} />
          </CardContent>
        </Card>

        {/* Minutes usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Minutes Usage</CardTitle>
            <CardDescription>
              {totalMinutes} / {minutesIncluded} minutes used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={totalMinutes} max={minutesIncluded} />
            <p className="text-sm text-muted-foreground">
              {Math.max(0, minutesIncluded - totalMinutes)} minutes remaining
              this billing cycle
            </p>
            {subscription && (
              <Badge variant="success">
                {subscription.status === "active" ? "Active Plan" : subscription.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
          <CardDescription>Last 10 calls received</CardDescription>
        </CardHeader>
        <CardContent>
          {(recentCalls ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No calls yet. Calls will appear here once your AI agent starts receiving them.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentCalls ?? []).map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="whitespace-nowrap">
                      {call.created_at ? formatDate(call.created_at) : "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {call.caller_number ? formatPhone(call.caller_number) : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {call.duration
                        ? formatDuration(call.duration)
                        : "--:--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[call.status] ?? "secondary"}>
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">
                      {call.summary || "No summary available"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
