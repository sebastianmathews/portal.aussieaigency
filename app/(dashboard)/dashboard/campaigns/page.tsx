"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Megaphone, Plus, Play, Pause, Loader2, Phone, Users, Clock,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  contacts: Array<{ phone: string; name?: string; context?: string }>;
  schedule_time: string | null;
  stats: { total: number; completed: number; answered: number; failed: number };
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  lead_followup: "Lead Follow-up",
  appointment_reminder: "Appointment Reminder",
  reengagement: "Re-engagement",
  survey: "Survey",
  custom: "Custom",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  draft: "secondary",
  scheduled: "warning",
  running: "success",
  paused: "warning",
  completed: "success",
};

export default function CampaignsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("custom");
  const [formAgent, setFormAgent] = useState("");
  const [formScript, setFormScript] = useState("");
  const [formContacts, setFormContacts] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) { setLoading(false); return; }

      const campaignRes = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      const agentRes = await supabase
        .from("agents")
        .select("id, name")
        .eq("organization_id", profile.organization_id);

      setCampaigns((campaignRes.data as unknown as Campaign[]) ?? []);
      setAgents(agentRes.data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!formName || !formAgent) return;
    setCreating(true);

    const contacts = formContacts.split("\n").filter((l) => l.trim()).map((line) => {
      const [phone, name, context] = line.split(",").map((s) => s.trim());
      return { phone, name, context };
    });

    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, type: formType, agentId: formAgent, contacts, scriptContext: formScript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Campaign created", description: `${formName} is ready to launch.` });
      setCampaigns((prev) => [data.campaign, ...prev]);
      setCreateOpen(false);
      setFormName(""); setFormScript(""); setFormContacts("");
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Campaign started", description: `${data.started} calls initiated.` });
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: "running" } : c)));
    } catch (err) {
      toast({ title: "Failed to start", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628] font-heading">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Launch outbound calling campaigns to reach your contacts</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2"><Plus className="h-4 w-4" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Set up an outbound calling campaign with your AI agent.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Campaign Name</Label>
                <Input placeholder="e.g. January Follow-ups" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead_followup">Lead Follow-up</SelectItem>
                      <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                      <SelectItem value="reengagement">Re-engagement</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Agent</Label>
                  <Select value={formAgent} onValueChange={setFormAgent}>
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Script Context</Label>
                <Textarea placeholder="e.g. Following up on quote requests..." value={formScript} onChange={(e) => setFormScript(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Contacts (one per line: phone,name,context)</Label>
                <Textarea placeholder={"+61412345678,John Smith,Quote request\n+61498765432,Sarah M,Mortgage enquiry"} value={formContacts} onChange={(e) => setFormContacts(e.target.value)} rows={5} className="font-mono text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="gold" onClick={handleCreate} disabled={creating || !formName || !formAgent}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-[#F5A623] opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">Create an outbound campaign to follow up with leads, send reminders, or run re-engagement calls.</p>
            <Button variant="gold" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Your First Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-[#F5A623]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#0A1628]">{campaign.name}</h3>
                        <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"}>{campaign.status}</Badge>
                        <Badge variant="secondary" className="text-xs">{TYPE_LABELS[campaign.type] ?? campaign.type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.contacts?.length ?? 0} contacts</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{campaign.stats?.answered ?? 0} answered</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(campaign.created_at).toLocaleDateString("en-AU")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === "draft" && (
                      <Button size="sm" variant="gold" className="gap-1.5" onClick={() => handleStart(campaign.id)}><Play className="h-3.5 w-3.5" />Start</Button>
                    )}
                    {campaign.status === "running" && (
                      <Button size="sm" variant="outline" className="gap-1.5"><Pause className="h-3.5 w-3.5" />Pause</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
