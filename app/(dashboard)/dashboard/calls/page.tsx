"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
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
import {
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";
import { formatDuration, formatDate, formatPhone } from "@/lib/utils";
import { SentimentBadge } from "@/components/ui/sentiment-badge";

const statusVariant: Record<
  string,
  "default" | "success" | "destructive" | "warning" | "secondary"
> = {
  completed: "success",
  failed: "destructive",
  transferred: "default",
  in_progress: "warning",
};

const PAGE_SIZE = 20;

interface TranscriptEntry {
  role?: string;
  message?: string;
  content?: string;
  source?: string;
}

interface Call {
  id: string;
  caller_number: string | null;
  status: string;
  duration: number | null;
  created_at: string | null;
  summary: string | null;
  transcript: TranscriptEntry[] | null;
  sentiment: string | null;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchCalls = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      .select(
        "id, caller_number, status, duration, created_at, summary, transcript, sentiment",
        { count: "exact" }
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq(
        "status",
        statusFilter as
          | "ringing"
          | "in_progress"
          | "completed"
          | "failed"
          | "transferred"
      );
    }

    if (search.trim()) {
      query = query.ilike("caller_number", `%${search.trim()}%`);
    }

    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt("created_at", endDate.toISOString());
    }

    const { data, count } = await query;

    setCalls((data as Call[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getMessageCount = (transcript: TranscriptEntry[] | null): number => {
    if (!transcript || !Array.isArray(transcript)) return 0;
    return transcript.length;
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRow(expandedRow === id ? null : id);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const hasActiveFilters =
    statusFilter !== "all" || search || dateFrom || dateTo;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 font-heading">
            Calls History
          </h1>
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
                  err instanceof Error
                    ? err.message
                    : "Could not sync calls",
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">All Calls</CardTitle>
                <CardDescription>{total} total calls</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
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
                {/* Status filter */}
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
                {/* Toggle filters */}
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="flex flex-wrap items-end gap-4 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Date From
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setPage(0);
                      }}
                      className="pl-9 w-[160px]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Date To
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setPage(0);
                      }}
                      className="pl-9 w-[160px]"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
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
                    <TableHead className="w-[40px]" />
                    <TableHead>Date</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Sentiment</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Summary
                    </TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => {
                    const msgCount = getMessageCount(call.transcript);
                    const isExpanded = expandedRow === call.id;

                    return (
                      <React.Fragment key={call.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            router.push(`/dashboard/calls/${call.id}`)
                          }
                        >
                          <TableCell>
                            <button
                              onClick={(e) => toggleExpand(call.id, e)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {call.created_at
                              ? formatDate(call.created_at)
                              : "N/A"}
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
                            <span className="text-sm text-muted-foreground">
                              {msgCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                statusVariant[call.status] ?? "secondary"
                              }
                            >
                              {call.status === "completed"
                                ? "Successful"
                                : call.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <SentimentBadge sentiment={call.sentiment} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground text-sm">
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

                        {/* Expanded inline transcript */}
                        {isExpanded && (
                          <TableRow key={`${call.id}-expanded`}>
                            <TableCell colSpan={9} className="bg-gray-50 p-0">
                              <div className="px-6 py-4">
                                {call.transcript &&
                                Array.isArray(call.transcript) &&
                                call.transcript.length > 0 ? (
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                      Transcript Preview
                                    </p>
                                    {(
                                      call.transcript as TranscriptEntry[]
                                    ).map((entry, i) => {
                                      const isAgent =
                                        entry.role === "assistant" ||
                                        entry.role === "agent" ||
                                        entry.source === "ai";
                                      const text =
                                        entry.content ||
                                        entry.message ||
                                        "";
                                      return (
                                        <div
                                          key={i}
                                          className={`flex gap-2 ${isAgent ? "" : "flex-row-reverse"}`}
                                        >
                                          <div
                                            className={`rounded-lg px-3 py-2 max-w-[75%] text-sm ${
                                              isAgent
                                                ? "bg-white border text-[#0A1628]"
                                                : "bg-[#0A1628] text-white"
                                            }`}
                                          >
                                            <span className="text-[10px] font-semibold uppercase opacity-50 block mb-0.5">
                                              {isAgent ? "AI Agent" : "Caller"}
                                            </span>
                                            {text}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No transcript available for this call.
                                  </p>
                                )}
                                <div className="mt-3 pt-3 border-t flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(
                                        `/dashboard/calls/${call.id}`
                                      );
                                    }}
                                  >
                                    View Full Details
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
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
