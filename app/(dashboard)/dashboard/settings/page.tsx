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
import { Building2, Save, Loader2 } from "lucide-react";
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
      }

      setLoading(false);
    }

    loadSettings();
  }, [supabase]);

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
      })
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
        <h1 className="text-2xl font-bold text-navy-500">Settings</h1>
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
