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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  UserPlus,
  Users,
  Mail,
  Loader2,
  Trash2,
  Crown,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

export default function TeamPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      setOrgId(profile.organization_id);

      // Fetch all members in the same organization
      const { data: teamMembers } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: true });

      setMembers((teamMembers as TeamMember[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return;
    setInviting(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Invitation sent",
        description: `An invite has been sent to ${inviteEmail}.`,
      });

      setInviteEmail("");
      setInviteName("");
      setInviteOpen(false);

      // Refresh member list
      const { data: teamMembers } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      setMembers((teamMembers as TeamMember[]) ?? []);
    } catch (err) {
      toast({
        title: "Failed to invite",
        description:
          err instanceof Error ? err.message : "Could not send invitation",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (memberId === currentUserId) return;

    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Member removed",
        description: "Team member has been removed from your organization.",
      });

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      toast({
        title: "Failed to remove",
        description:
          err instanceof Error ? err.message : "Could not remove member",
        variant: "destructive",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628] font-heading">
            Team
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage who has access to your dashboard
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization. They&apos;ll
                receive an email with a signup link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <Input
                  id="invite-name"
                  placeholder="John Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="john@yourbusiness.com.au"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-[#F5A623]" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in your
            organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No team members yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const isOwner =
                  members.indexOf(member) === 0; // First member is the owner
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-[#F5A623]/10 text-[#F5A623] text-sm font-semibold">
                          {getInitials(member.full_name || member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-[#0A1628]">
                            {member.full_name || "Unnamed"}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-[10px]">
                              You
                            </Badge>
                          )}
                          {isOwner && (
                            <Badge className="text-[10px] bg-[#F5A623]/15 text-[#F5A623] hover:bg-[#F5A623]/15 gap-1">
                              <Crown className="h-2.5 w-2.5" />
                              Owner
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#9BA4B5]">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {member.role}
                      </Badge>
                      {!isCurrentUser && !isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
