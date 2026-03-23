"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatDate, formatPhone } from "@/lib/utils";

interface Contact {
  id: string;
  caller_number: string | null;
  created_at: string | null;
  lead_data: Record<string, unknown> | null;
}

const PAGE_SIZE = 20;

export default function ContactsPage() {
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!membership?.organization_id) {
      setLoading(false);
      return;
    }

    const orgId = membership.organization_id;

    let query = supabase
      .from("calls")
      .select("id, caller_number, created_at, lead_data", { count: "exact" })
      .eq("organization_id", orgId)
      .not("lead_data", "is", null)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(
        `caller_number.ilike.%${search.trim()}%`
      );
    }

    const { data, count } = await query;
    setContacts((data ?? []) as Contact[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, supabase]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getLeadField = (lead: Record<string, unknown> | null, field: string): string => {
    if (!lead) return "";
    const value = lead[field] ?? lead[field.replace(/_/g, "")] ?? "";
    return String(value);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">Contacts</h1>
        <p className="text-muted-foreground mt-1">
          Leads captured from your AI agent conversations
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">All Contacts</CardTitle>
              <CardDescription>{total} leads captured</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="mx-auto w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-navy-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                No contacts yet
              </h3>
              <p className="max-w-md mx-auto">
                When your AI agent captures lead information during calls, contacts will appear here.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Source Call
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => {
                    const lead = contact.lead_data as Record<string, unknown> | null;
                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {getLeadField(lead, "name") ||
                            getLeadField(lead, "full_name") ||
                            "Unknown"}
                        </TableCell>
                        <TableCell>
                          {contact.caller_number
                            ? formatPhone(contact.caller_number)
                            : getLeadField(lead, "phone") || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {contact.created_at
                            ? formatDate(contact.created_at)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {contact.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-xs truncate text-muted-foreground">
                          {getLeadField(lead, "notes") ||
                            getLeadField(lead, "reason") ||
                            "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

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
