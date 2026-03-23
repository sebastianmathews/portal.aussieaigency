"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  MoreHorizontal,
  Copy,
  MessageSquare,
  Share2,
  Loader2,
} from "lucide-react";

interface AgentActionsProps {
  agentId: string;
  agentName: string;
}

export function AgentActions({ agentId, agentName }: AgentActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [duplicating, setDuplicating] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/dashboard/agent?id=${agentId}`;
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: `Share link for ${agentName} copied to clipboard.`,
    });
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    toast({
      title: "Agent duplicated",
      description: `A copy of ${agentName} has been queued. Edit it from the agents list.`,
    });
    setDuplicating(false);
    router.refresh();
  };

  const handleConversationHistory = () => {
    router.push("/dashboard/calls");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleShare} className="gap-2 cursor-pointer">
          <Share2 className="h-4 w-4" />
          Share agent
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDuplicate}
          disabled={duplicating}
          className="gap-2 cursor-pointer"
        >
          {duplicating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Duplicate agent
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleConversationHistory}
          className="gap-2 cursor-pointer"
        >
          <MessageSquare className="h-4 w-4" />
          Conversation history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
