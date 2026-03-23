"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function KnowledgeBasePage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    async function loadFaqs() {
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

      const { data: agent } = await supabase
        .from("agents")
        .select("id, faqs")
        .eq("organization_id", orgId)
        .limit(1)
        .single();

      if (agent) {
        setAgentId(agent.id);
        setFaqs(Array.isArray(agent.faqs) ? (agent.faqs as unknown as FaqItem[]) : []);
      }

      setLoading(false);
    }

    loadFaqs();
  }, [supabase]);

  const saveFaqs = async (updatedFaqs: FaqItem[]) => {
    if (!agentId) return;
    setSaving(true);

    const { error } = await supabase
      .from("agents")
      .update({ faqs: updatedFaqs as unknown as Json })
      .eq("id", agentId);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save FAQ. Please try again.",
        variant: "destructive",
      });
    } else {
      setFaqs(updatedFaqs);
      toast({ title: "Saved", description: "Knowledge base updated." });
    }
  };

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) return;

    const updated = [...faqs];
    if (editIndex !== null) {
      updated[editIndex] = { question: question.trim(), answer: answer.trim() };
    } else {
      updated.push({ question: question.trim(), answer: answer.trim() });
    }

    saveFaqs(updated);
    resetDialog();
  };

  const handleDelete = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    saveFaqs(updated);
  };

  const openEdit = (index: number) => {
    setEditIndex(index);
    setQuestion(faqs[index].question);
    setAnswer(faqs[index].answer);
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditIndex(null);
    setQuestion("");
    setAnswer("");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Teach your AI agent how to answer common questions
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetDialog();
          else setDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editIndex !== null ? "Edit FAQ" : "Add FAQ"}
              </DialogTitle>
              <DialogDescription>
                Add a question and answer pair for your AI agent to learn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are your opening hours?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. We are open Monday to Friday, 9am to 5pm AEST."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleSubmit}
                disabled={saving || !question.trim() || !answer.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editIndex !== null ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {faqs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center mb-4">
              <HelpCircle className="h-8 w-8 text-gold-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No FAQs yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Add frequently asked questions and answers so your AI agent can
              respond accurately to callers.
            </p>
            <Button
              variant="gold"
              className="gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Your First FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-gold-50 p-1.5 mt-0.5 flex-shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-gold-600" />
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {faq.question}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(i)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
