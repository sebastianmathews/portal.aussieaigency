import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Building2, Phone, Bot, Users, CreditCard, Clock,
  BarChart3,
} from "lucide-react";
import { formatDuration, formatDate, formatPhone } from "@/lib/utils";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch org
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!org) notFound();

  // Fetch related data
  const [membersRes, agentsRes, callsRes, subRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, created_at").eq("organization_id", params.id),
    supabase.from("agents").select("id, name, is_active, voice_id, language, created_at").eq("organization_id", params.id),
    supabase.from("calls").select("id, caller_number, status, duration, created_at, summary, lead_score, sentiment").eq("organization_id", params.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("subscriptions").select("*").eq("organization_id", params.id).maybeSingle(),
  ]);

  const members = membersRes.data ?? [];
  const agents = agentsRes.data ?? [];
  const calls = callsRes.data ?? [];
  const sub = subRes.data;

  const totalMinutes = Math.round(
    calls.reduce((sum, c) => sum + (c.duration ?? 0), 0) / 60
  );
  const avgLeadScore = calls.filter(c => c.lead_score).length > 0
    ? (calls.reduce((sum, c) => sum + (c.lead_score ?? 0), 0) / calls.filter(c => c.lead_score).length).toFixed(1)
    : "N/A";

  const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    active: "success", trialing: "warning", past_due: "destructive", canceled: "secondary",
    completed: "success", failed: "destructive", in_progress: "warning",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link href="/admin">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
      </Link>

      {/* Org header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-[#F5A623]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628] font-heading">{org.name}</h1>
            <p className="text-sm text-muted-foreground">
              Joined {new Date(org.created_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
              {org.industry ? ` · ${org.industry}` : ""}
            </p>
          </div>
        </div>
        {sub && (
          <Badge variant={statusVariant[sub.status] ?? "secondary"} className="text-sm px-3 py-1">
            {sub.plan} — {sub.status}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-blue-50 p-2"><Users className="h-4 w-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Members</p><p className="text-lg font-bold">{members.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-green-50 p-2"><Bot className="h-4 w-4 text-green-600" /></div>
          <div><p className="text-xs text-muted-foreground">Agents</p><p className="text-lg font-bold">{agents.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-purple-50 p-2"><Phone className="h-4 w-4 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Calls</p><p className="text-lg font-bold">{calls.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-gold-50 p-2"><Clock className="h-4 w-4 text-gold-600" /></div>
          <div><p className="text-xs text-muted-foreground">Minutes Used</p><p className="text-lg font-bold">{totalMinutes}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-orange-50 p-2"><BarChart3 className="h-4 w-4 text-orange-600" /></div>
          <div><p className="text-xs text-muted-foreground">Avg Lead Score</p><p className="text-lg font-bold">{avgLeadScore}</p></div>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#F5A623]" />Subscription
          </CardTitle></CardHeader>
          <CardContent>
            {sub ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium capitalize">{sub.plan}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={statusVariant[sub.status] ?? "secondary"}>{sub.status}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{org.twilio_number || "None"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span>{org.timezone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Google Calendar</span><span>{(org as Record<string, unknown>).google_connected ? "Connected" : "Not connected"}</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active subscription</p>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-[#F5A623]" />Team Members
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{m.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">{m.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents */}
      {agents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">AI Agents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-[#F5A623]" />
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">Language: {a.language} · Created {new Date(a.created_at).toLocaleDateString("en-AU")}</p>
                    </div>
                  </div>
                  <Badge variant={a.is_active ? "success" : "secondary"}>{a.is_active ? "Active" : "Paused"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
          <CardDescription>{calls.length} calls (showing latest 20)</CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No calls yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead Score</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead className="hidden md:table-cell">Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="whitespace-nowrap text-sm">{call.created_at ? formatDate(call.created_at) : "N/A"}</TableCell>
                    <TableCell className="font-medium text-sm">{call.caller_number ? formatPhone(call.caller_number) : "Unknown"}</TableCell>
                    <TableCell className="text-sm">{call.duration != null ? formatDuration(call.duration) : "--"}</TableCell>
                    <TableCell><Badge variant={statusVariant[call.status] ?? "secondary"} className="text-xs">{call.status}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {call.lead_score ? (
                        <span className={call.lead_score >= 7 ? "text-green-600 font-semibold" : call.lead_score >= 4 ? "text-yellow-600" : "text-gray-400"}>
                          {call.lead_score}/10
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{call.sentiment || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{call.summary || "—"}</TableCell>
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
