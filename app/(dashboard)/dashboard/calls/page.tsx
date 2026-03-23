"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Phone, Search, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { formatDuration, formatDate, formatPhone } from "@/lib/utils";

const statusVariant: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  completed: "success",
  failed: "destructive",
  transferred: "default",
  in_progress: "warning",
};

const PAGE_SIZE = 20;

interface Call {
  id: string;
  caller_number: string | null;
  status: string;
  duration: number | null;
  created_at: string | null;
  summary: string | null;
}

export default function CallsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchCalls = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: orgMembership } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!orgMembership?.organization_id) {
      setLoading(false);
      return;
    }

    const orgId = orgMembership.organization_id;

    let query = supabase
      .from("calls")
      .select("id, caller_number, status, duration, created_at, summary", {
        count: "exact",
      })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as "ringing" | "in_progress" | "completed" | "failed" | "transferred");
    }

    if (search.trim()) {
      query = query.ilike("caller_number", `%${search.trim()}%`);
    }

    const { data, count } = await query;

    setCalls(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, search, supabase]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 font-heading">Calls History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all calls handled by your AI agent
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            try {
              const res = await fetch("/api/elevenlabs/sync-calls", {
                method: "POST",
              });
              const data = await res.json();
              if (res.ok) {
                toast({
                  title: "Calls synced",
                  description: data.message,
                });
                fetchCalls();
              } else {
                throw new Error(data.error);
              }
            } catch (err) {
              toast({
                title: "Sync failed",
                description:
                  err instanceof Error ? err.message : "Could not sync calls",
                variant: "destructive",
              });
            } finally {
              setSyncing(false);
            }
          }}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Calls
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">All Calls</CardTitle>
              <CardDescription>{total} total calls</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading calls...
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No calls found matching your criteria.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Summary</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/calls/${call.id}`)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {call.created_at ? formatDate(call.created_at) : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {call.caller_number
                          ? formatPhone(call.caller_number)
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        {call.duration != null
                          ? formatDuration(call.duration)
                          : "--:--"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[call.status] ?? "secondary"}>
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">
                        {call.summary || "No summary"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/calls/${call.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
