"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Webhook, Trash2, Loader2, Plus, Zap } from "lucide-react";

const WEBHOOK_EVENTS = [
  { value: "call.completed", label: "Call Completed" },
  { value: "call.transferred", label: "Call Transferred" },
  { value: "lead.captured", label: "Lead Captured" },
  { value: "appointment.booked", label: "Appointment Booked" },
];

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export function WebhookManager() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/webhooks");
      if (res.ok) {
        const json = await res.json();
        setWebhooks(json.data ?? []);
      }
    } catch {
      // Silent fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const handleAdd = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a webhook URL.",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: selectedEvents,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add webhook");
      }

      toast({ title: "Webhook added", description: "Your webhook has been registered." });
      setUrl("");
      setSelectedEvents([]);
      fetchWebhooks();
    } catch (err) {
      toast({
        title: "Failed to add webhook",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/webhooks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Webhook removed" });
      fetchWebhooks();
    } catch {
      toast({
        title: "Failed to delete webhook",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Webhook className="h-5 w-5 text-[#F5A623]" />
          Webhooks
        </CardTitle>
        <CardDescription>
          Get notified in real-time when something happens. Works with Zapier, Make, or any automation tool.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new webhook */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Events (select which events to receive)</Label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event.value}
                  type="button"
                  onClick={() => toggleEvent(event.value)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedEvents.includes(event.value)
                      ? "bg-[#0A1628] text-white border-[#0A1628]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {event.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Leave empty to receive all events.
            </p>
          </div>

          <Button
            variant="gold"
            size="sm"
            onClick={handleAdd}
            disabled={adding || !url.trim()}
            className="gap-1.5"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Webhook
          </Button>
        </div>

        {/* Registered webhooks list */}
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Webhook className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No webhooks registered yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.events ?? []).length === 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        All events
                      </Badge>
                    ) : (
                      (wh.events as string[]).map((ev) => (
                        <Badge
                          key={ev}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {ev}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(wh.id)}
                  disabled={deletingId === wh.id}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  {deletingId === wh.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Helper text */}
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Works with Zapier
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Use our webhook URL as a trigger in Zapier, Make, or any automation
              tool. When an event occurs, we&apos;ll POST a JSON payload to your
              URL with the event type and data.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
