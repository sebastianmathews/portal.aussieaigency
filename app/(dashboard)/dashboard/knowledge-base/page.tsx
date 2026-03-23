"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Upload,
  Globe,
  FileText,
  File,
  Link2,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface KnowledgeItem {
  type: "file" | "url";
  name: string;
  content: string;
  url?: string;
  fileType?: string;
  size?: number;
  uploadedAt?: string;
  scrapedAt?: string;
}

export default function KnowledgeBasePage() {
  const supabase = createClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  // FAQ dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // URL dialog
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      const { data: agent } = await supabase
        .from("agents")
        .select("id, faqs, knowledge_items")
        .eq("organization_id", membership.organization_id)
        .limit(1)
        .maybeSingle();

      if (agent) {
        setAgentId(agent.id);
        setFaqs(
          Array.isArray(agent.faqs)
            ? (agent.faqs as unknown as FaqItem[])
            : []
        );
        const items = (agent as Record<string, unknown>).knowledge_items;
        setKnowledgeItems(
          Array.isArray(items) ? (items as unknown as KnowledgeItem[]) : []
        );
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save FAQs
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
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } else {
      setFaqs(updatedFaqs);
      toast({ title: "Saved", description: "Knowledge base updated." });
    }
  };

  // Save knowledge items
  const saveKnowledgeItems = async (items: KnowledgeItem[]) => {
    if (!agentId) return;

    const { error } = await supabase
      .from("agents")
      .update({ knowledge_items: items as unknown as Json })
      .eq("id", agentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } else {
      setKnowledgeItems(items);
      toast({ title: "Saved", description: "Knowledge base updated." });
    }
  };

  // FAQ handlers
  const handleSubmitFaq = () => {
    if (!question.trim() || !answer.trim()) return;
    const updated = [...faqs];
    if (editIndex !== null) {
      updated[editIndex] = {
        question: question.trim(),
        answer: answer.trim(),
      };
    } else {
      updated.push({ question: question.trim(), answer: answer.trim() });
    }
    saveFaqs(updated);
    resetFaqDialog();
  };

  const handleDeleteFaq = (index: number) => {
    saveFaqs(faqs.filter((_, i) => i !== index));
  };

  const openEditFaq = (index: number) => {
    setEditIndex(index);
    setQuestion(faqs[index].question);
    setAnswer(faqs[index].answer);
    setDialogOpen(true);
  };

  const resetFaqDialog = () => {
    setDialogOpen(false);
    setEditIndex(null);
    setQuestion("");
    setAnswer("");
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await saveKnowledgeItems([...knowledgeItems, data.item]);
      toast({
        title: "File uploaded",
        description: `${file.name} added to knowledge base.`,
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description:
          err instanceof Error ? err.message : "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // URL scrape
  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return;
    setScraping(true);

    try {
      const res = await fetch("/api/knowledge-base/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await saveKnowledgeItems([...knowledgeItems, data.item]);
      toast({
        title: "URL added",
        description: `Content from ${data.item.name} added to knowledge base.`,
      });
      setUrlInput("");
      setUrlDialogOpen(false);
    } catch (err) {
      toast({
        title: "Failed to scrape URL",
        description:
          err instanceof Error ? err.message : "Could not fetch URL content",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const handleDeleteKnowledgeItem = (index: number) => {
    saveKnowledgeItems(knowledgeItems.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <h1 className="text-2xl font-bold text-navy-500 font-heading">
          Knowledge Base
        </h1>
        <p className="text-muted-foreground mt-1">
          Train your AI agent with FAQs, documents, and website content
        </p>
      </div>

      <Tabs defaultValue="faqs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="faqs" className="gap-1.5 py-2.5 text-sm">
            <HelpCircle className="h-4 w-4 hidden sm:block" />
            FAQs
            {faqs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {faqs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 py-2.5 text-sm">
            <FileText className="h-4 w-4 hidden sm:block" />
            Files
            {knowledgeItems.filter((i) => i.type === "file").length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {knowledgeItems.filter((i) => i.type === "file").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="urls" className="gap-1.5 py-2.5 text-sm">
            <Globe className="h-4 w-4 hidden sm:block" />
            URLs
            {knowledgeItems.filter((i) => i.type === "url").length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {knowledgeItems.filter((i) => i.type === "url").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* FAQs Tab */}
        <TabsContent value="faqs">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (!open) resetFaqDialog();
                  else setDialogOpen(true);
                }}
              >
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
                      Add a question and answer for your AI agent to learn.
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
                    <Button variant="outline" onClick={resetFaqDialog}>
                      Cancel
                    </Button>
                    <Button
                      variant="gold"
                      onClick={handleSubmitFaq}
                      disabled={
                        saving || !question.trim() || !answer.trim()
                      }
                    >
                      {saving && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editIndex !== null ? "Update" : "Add"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {faqs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="h-10 w-10 mx-auto mb-3 text-[#F5A623] opacity-50" />
                  <p className="font-medium mb-1">No FAQs yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add question-answer pairs for your AI agent.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {faqs.map((faq, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm leading-snug flex items-start gap-2">
                          <BookOpen className="h-4 w-4 text-[#F5A623] mt-0.5 shrink-0" />
                          {faq.question}
                        </CardTitle>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditFaq(i)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteFaq(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#F5A623]" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Upload PDF, TXT, CSV, DOC, or DOCX files. Content will be
                  extracted and added to your agent&apos;s knowledge.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#F5A623]/50 hover:bg-[#F5A623]/[0.02] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-[#F5A623]" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  )}
                  <p className="font-medium text-sm">
                    {uploading
                      ? "Uploading..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, TXT, CSV, DOC, DOCX (max 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.csv,.doc,.docx,.md"
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            {knowledgeItems.filter((i) => i.type === "file").length > 0 && (
              <div className="space-y-2">
                {knowledgeItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => item.type === "file")
                  .map(({ item, idx }) => (
                    <Card key={idx}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-blue-50 p-2">
                            <File className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(item.size)}
                              {item.uploadedAt &&
                                ` · ${new Date(item.uploadedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteKnowledgeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* URLs Tab */}
        <TabsContent value="urls">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="gold" className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Add URL
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Website URL</DialogTitle>
                    <DialogDescription>
                      Enter a URL and we&apos;ll extract the content for your
                      AI agent to learn from.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="url-input">Website URL</Label>
                    <Input
                      id="url-input"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://your-business.com.au/about"
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll fetch the page content and add it to your
                      knowledge base.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setUrlDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="gold"
                      onClick={handleScrapeUrl}
                      disabled={scraping || !urlInput.trim()}
                    >
                      {scraping && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {scraping ? "Fetching..." : "Add URL"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {knowledgeItems.filter((i) => i.type === "url").length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Globe className="h-10 w-10 mx-auto mb-3 text-[#F5A623] opacity-50" />
                  <p className="font-medium mb-1">No URLs added</p>
                  <p className="text-sm text-muted-foreground">
                    Add your website pages so the AI can answer questions about
                    your business.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {knowledgeItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => item.type === "url")
                  .map(({ item, idx }) => (
                    <Card key={idx}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-green-50 p-2">
                            <Globe className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {item.url}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteKnowledgeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
