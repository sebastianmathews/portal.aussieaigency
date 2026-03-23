import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Clock,
  Calendar,
  User,
  FileText,
  Mail,
} from "lucide-react";
import { formatDuration, formatDate, formatPhone } from "@/lib/utils";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  completed: "success",
  failed: "destructive",
  transferred: "default",
  in_progress: "warning",
};

interface TranscriptEntry {
  role: string;
  content?: string;
  message?: string;
  timestamp?: string | number;
}

export default async function CallDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!call) notFound();

  const transcript: TranscriptEntry[] = Array.isArray(call.transcript)
    ? (call.transcript as unknown as TranscriptEntry[])
    : [];

  const leadData =
    call.lead_data && typeof call.lead_data === "object" ? call.lead_data : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back button */}
      <Link href="/dashboard/calls">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Calls
        </Button>
      </Link>

      {/* Call metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Call Detail</h1>
          <p className="text-muted-foreground mt-1">
            {call.caller_number
              ? formatPhone(call.caller_number)
              : "Unknown caller"}
          </p>
        </div>
        <Badge
          variant={statusVariant[call.status] ?? "secondary"}
          className="text-sm px-3 py-1 w-fit"
        >
          {call.status}
        </Badge>
      </div>

      {/* Metadata cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Caller</p>
              <p className="text-sm font-medium">
                {call.caller_number
                  ? formatPhone(call.caller_number)
                  : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-gold-50 p-2">
              <Clock className="h-4 w-4 text-gold-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">
                {call.duration != null
                  ? formatDuration(call.duration)
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-50 p-2">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="text-sm font-medium">
                {call.created_at
                  ? formatDate(call.created_at, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-purple-50 p-2">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Agent</p>
              <p className="text-sm font-medium">
                {call.agent_id ? "AI Agent" : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transcript */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Transcript</CardTitle>
                <CardDescription>Full conversation log</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <Mail className="h-4 w-4" />
                Send Transcript
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transcript.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No transcript available for this call.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {transcript.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      entry.role === "assistant" ? "" : "flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2.5 max-w-[80%] ${
                        entry.role === "assistant"
                          ? "bg-navy-50 text-navy-500"
                          : "bg-gold-50 text-navy-500"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-60">
                        {entry.role === "assistant" ? "AI Agent" : "Caller"}
                      </p>
                      <p className="text-sm">{entry.content || entry.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {call.summary || "No summary was generated for this call."}
              </p>
            </CardContent>
          </Card>

          {/* Recording */}
          {call.recording_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recording</CardTitle>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full" preload="none">
                  <source src={call.recording_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </CardContent>
            </Card>
          )}

          {/* Lead data */}
          {leadData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {Object.entries(leadData as Record<string, unknown>).map(
                    ([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs font-medium text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </dt>
                        <dd className="text-sm mt-0.5">{String(value ?? "N/A")}</dd>
                        <Separator className="mt-2" />
                      </div>
                    )
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
