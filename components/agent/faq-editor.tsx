"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageCircleQuestion } from "lucide-react";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQEditorProps {
  value: FAQ[];
  onChange: (faqs: FAQ[]) => void;
}

export function FAQEditor({ value, onChange }: FAQEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const openAddDialog = () => {
    setEditingFaq(null);
    setQuestion("");
    setAnswer("");
    setDialogOpen(true);
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setDialogOpen(true);
  };

  const handleSaveFaq = () => {
    if (!question.trim() || !answer.trim()) return;

    if (editingFaq) {
      // Update existing
      onChange(
        value.map((f) =>
          f.id === editingFaq.id
            ? { ...f, question: question.trim(), answer: answer.trim() }
            : f
        )
      );
    } else {
      // Add new
      const newFaq: FAQ = {
        id: crypto.randomUUID(),
        question: question.trim(),
        answer: answer.trim(),
      };
      onChange([...value, newFaq]);
    }

    setDialogOpen(false);
    setQuestion("");
    setAnswer("");
    setEditingFaq(null);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    onChange(value.filter((f) => f.id !== deletingId));
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Add common questions and answers your agent should know.
          </p>
        </div>
        <Button onClick={openAddDialog} variant="gold" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add FAQ
        </Button>
      </div>

      {/* FAQ list */}
      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-3">
            <MessageCircleQuestion className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-[#0A1628]">No FAQs yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add frequently asked questions so your agent can answer common
            queries about your business.
          </p>
          <Button onClick={openAddDialog} variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-1.5" />
            Add your first FAQ
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((faq, index) => (
            <Card
              key={faq.id}
              className="group hover:border-[#F5A623]/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#0A1628] text-white text-xs font-medium h-5 w-5 shrink-0">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-[#0A1628] truncate">
                        {faq.question}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 ml-7">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(faq)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => confirmDelete(faq.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? "Edit FAQ" : "Add FAQ"}
            </DialogTitle>
            <DialogDescription>
              {editingFaq
                ? "Update this frequently asked question."
                : "Add a new question and answer for your agent."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Question</Label>
              <Input
                id="faq-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are your business hours?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="e.g. We're open Monday to Friday, 9 AM to 5 PM."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleSaveFaq}
              disabled={!question.trim() || !answer.trim()}
            >
              {editingFaq ? "Update" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
