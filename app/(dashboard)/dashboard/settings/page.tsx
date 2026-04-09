"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Save, Loader2, Calendar, CheckCircle2, ExternalLink, MessageSquare, PauseCircle, PlayCircle, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PhoneNumberPicker } from "@/components/settings/phone-number-picker";

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "UTC",
];

const INDUSTRIES = [
  "Healthcare",
  "Dental",
  "Real Estate",
  "Legal",
  "Automotive",
  "Hospitality",
  "Beauty & Wellness",
  "Professional Services",
  "Trades & Home Services",
  "Retail",
  "Other",
];

export default function SettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [twilioNumber, setTwilioNumber] = useState("");
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [notificationPhone, setNotificationPhone] = useState("");
  const [servicePaused, setServicePaused] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  useEffect(() => {
    async function loadSettings() {
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

      const fetchedOrgId = membership.organization_id;
      setOrgId(fetchedOrgId);

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", fetchedOrgId)
        .single();

      if (org) {
        setName(org.name ?? "");
        setIndustry(org.industry ?? "");
        setTimezone(org.timezone ?? "Australia/Sydney");
        setTwilioNumber(org.twilio_number ?? "");
        setForwardingNumber(org.forwarding_number ?? "");
        setGoogleConnected(!!(org as Record<string, unknown>).google_connected);
        setSmsNotificationsEnabled(!!(org as Record<string, unknown>).sms_notifications_enabled);
        setNotificationPhone(((org as Record<string, unknown>).notification_phone as string) ?? "");
        setServicePaused(!!(org as Record<string, unknown>).service_paused);
      }

      setLoading(false);
    }

    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        industry,
        timezone,
        forwarding_number: forwardingNumber,
        sms_notifications_enabled: smsNotificationsEnabled,
        notification_phone: notificationPhone || null,
      } as Record<string, unknown>)
      .eq("id", orgId);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your organization settings have been updated.",
      });
    }
  };

  const handleTogglePause = async (paused: boolean) => {
    setTogglingPause(true);
    try {
      const res = await fetch("/api/org/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });

      if (!res.ok) throw new Error("Failed to toggle service");

      setServicePaused(paused);
      toast({
        title: paused ? "Service Paused" : "Service Resumed",
        description: paused
          ? "Your AI receptionist is paused. Calls will not be answered."
          : "Your AI receptionist is now active and answering calls.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update service status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTogglingPause(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings
        </p>
      </div>

      {/* Organization details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-navy-50 p-2">
              <Building2 className="h-5 w-5 text-navy-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Organization</CardTitle>
              <CardDescription>
                Basic information about your business
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind.toLowerCase().replace(/\s+/g, "_")}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Phone number picker */}
      <PhoneNumberPicker
        currentNumber={twilioNumber || null}
        onNumberProvisioned={(phone) => setTwilioNumber(phone)}
      />

      {/* Forwarding number */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Forwarding</CardTitle>
          <CardDescription>
            When the AI agent needs to escalate a call, it will transfer to this number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="forwarding">Forwarding Number</Label>
            <Input
              id="forwarding"
              value={forwardingNumber}
              onChange={(e) => setForwardingNumber(e.target.value)}
              placeholder="+61 4XX XXX XXX"
            />
            <p className="text-xs text-muted-foreground">
              Your mobile or office number for human escalation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-[#F5A623]" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Get an instant text message every time your AI agent handles a call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
            <div className="space-y-0.5">
              <Label htmlFor="sms-toggle" className="font-medium">
                Enable SMS Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                {smsNotificationsEnabled
                  ? "You will receive an SMS after every call."
                  : "SMS notifications are turned off."}
              </p>
            </div>
            <Switch
              id="sms-toggle"
              checked={smsNotificationsEnabled}
              onCheckedChange={setSmsNotificationsEnabled}
            />
          </div>

          {smsNotificationsEnabled && (
            <div className="space-y-2 max-w-md">
              <Label htmlFor="notification-phone">Notification Phone Number</Label>
              <Input
                id="notification-phone"
                type="tel"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                placeholder="+61 4XX XXX XXX"
              />
              <p className="text-xs text-muted-foreground">
                The mobile number where you want to receive call notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${servicePaused ? "bg-amber-50" : "bg-green-50"}`}>
              {servicePaused ? (
                <PauseCircle className="h-5 w-5 text-amber-600" />
              ) : (
                <PlayCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Service Status</CardTitle>
              <CardDescription>
                Pause or resume your AI receptionist
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 max-w-md">
            <div className="space-y-0.5">
              <Label htmlFor="pause-toggle" className="font-medium">
                Pause AI Receptionist
              </Label>
              <p className="text-xs text-muted-foreground">
                {servicePaused
                  ? "Your AI receptionist is currently paused."
                  : "Your AI receptionist is active and answering calls."}
              </p>
            </div>
            <Switch
              id="pause-toggle"
              checked={servicePaused}
              onCheckedChange={handleTogglePause}
              disabled={togglingPause}
            />
          </div>

          {servicePaused && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 max-w-md">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Your AI receptionist is paused
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Calls will not be answered. Resume anytime to reactivate your agents.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-[#F5A623]" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect Google Calendar so your AI agent can automatically book
            appointments for callers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {googleConnected ? (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Google Calendar connected</p>
                  <p className="text-xs text-muted-foreground">
                    Your AI agent can book appointments automatically.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/integrations/google/connect">
                  Reconnect
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-200 text-center">
              <Calendar className="h-10 w-10 text-[#F5A623] mb-3" />
              <p className="font-medium text-[#0A1628] mb-1">
                Connect your Google Calendar
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Allow your AI agent to check availability and book
                appointments directly into your calendar.
              </p>
              <Button variant="gold" className="gap-2" asChild>
                <a href="/api/integrations/google/connect">
                  <ExternalLink className="h-4 w-4" />
                  Connect Google Calendar
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} variant="gold" className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
