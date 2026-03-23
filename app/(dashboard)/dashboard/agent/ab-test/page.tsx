"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, FlaskConical, Plus, Loader2, BarChart3, TrendingUp,
} from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  variant_a: { greeting: string; system_prompt_snippet: string };
  variant_b: { greeting: string; system_prompt_snippet: string };
  stats_a: { calls: number; leads: number; avg_score: number };
  stats_b: { calls: number; leads: number; avg_score: number };
  status: string;
  created_at: string;
}

export default function ABTestPage() {
  const { toast } = useToast();

  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [testName, setTestName] = useState("");
  const [greetingA, setGreetingA] = useState("");
  const [greetingB, setGreetingB] = useState("");
  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");

  useEffect(() => {
    // For now, load from localStorage as AB tests aren't in DB yet
    const saved = localStorage.getItem("ab_tests");
    if (saved) setTests(JSON.parse(saved));
    setLoading(false);
  }, []);

  const handleCreate = () => {
    if (!testName || !greetingA || !greetingB) return;
    setCreating(true);

    const newTest: ABTest = {
      id: `ab_${Date.now()}`,
      name: testName,
      variant_a: { greeting: greetingA, system_prompt_snippet: promptA },
      variant_b: { greeting: greetingB, system_prompt_snippet: promptB },
      stats_a: { calls: 0, leads: 0, avg_score: 0 },
      stats_b: { calls: 0, leads: 0, avg_score: 0 },
      status: "running",
      created_at: new Date().toISOString(),
    };

    const updated = [newTest, ...tests];
    setTests(updated);
    localStorage.setItem("ab_tests", JSON.stringify(updated));

    toast({ title: "A/B test created", description: `${testName} is now running. Calls will be split 50/50 between variants.` });
    setCreateOpen(false);
    setCreating(false);
    setTestName(""); setGreetingA(""); setGreetingB(""); setPromptA(""); setPromptB("");
  };

  if (loading) {
    return <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link href="/dashboard/agent">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to Agents
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628] font-heading">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">Test different greetings and prompts to see which converts better</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2"><Plus className="h-4 w-4" />New Test</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>Calls will be split 50/50 between variants.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Test Name</Label>
                <Input placeholder="e.g. Greeting tone test" value={testName} onChange={(e) => setTestName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 p-3 rounded-lg border bg-blue-50/50">
                  <Badge variant="secondary">Variant A</Badge>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Greeting</Label>
                    <Textarea placeholder="G'day! Thanks for calling..." value={greetingA} onChange={(e) => setGreetingA(e.target.value)} rows={2} className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prompt Tweak (optional)</Label>
                    <Textarea placeholder="Be extra warm and casual..." value={promptA} onChange={(e) => setPromptA(e.target.value)} rows={2} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-3 p-3 rounded-lg border bg-orange-50/50">
                  <Badge className="bg-[#F5A623]/15 text-[#F5A623]">Variant B</Badge>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Greeting</Label>
                    <Textarea placeholder="Hello! Thank you for calling..." value={greetingB} onChange={(e) => setGreetingB(e.target.value)} rows={2} className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prompt Tweak (optional)</Label>
                    <Textarea placeholder="Be more formal and professional..." value={promptB} onChange={(e) => setPromptB(e.target.value)} rows={2} className="text-xs" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="gold" onClick={handleCreate} disabled={creating || !testName || !greetingA || !greetingB}>Create Test</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-[#F5A623] opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No A/B tests yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">Test different greetings, tones, or scripts to find what converts best for your business.</p>
            <Button variant="gold" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Your First Test</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5 text-[#F5A623]" />
                    <div>
                      <CardTitle className="text-base">{test.name}</CardTitle>
                      <CardDescription className="text-xs">Started {new Date(test.created_at).toLocaleDateString("en-AU")}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={test.status === "running" ? "success" : "secondary"}>{test.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">Variant A</Badge>
                      <span className="text-xs text-muted-foreground">{test.stats_a.calls} calls</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">&ldquo;{test.variant_a.greeting}&rdquo;</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{test.stats_a.leads} leads</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Score: {test.stats_a.avg_score || "—"}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-[#F5A623]/15 text-[#F5A623] text-xs">Variant B</Badge>
                      <span className="text-xs text-muted-foreground">{test.stats_b.calls} calls</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">&ldquo;{test.variant_b.greeting}&rdquo;</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{test.stats_b.leads} leads</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Score: {test.stats_b.avg_score || "—"}</span>
                    </div>
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
