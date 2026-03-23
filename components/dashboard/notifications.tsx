"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Phone, UserPlus, CreditCard, AlertCircle } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";

interface Notification {
  id: string;
  type: "call" | "lead" | "subscription" | "alert";
  title: string;
  description: string;
  href: string;
  time: string;
  read: boolean;
}

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      // Get recent calls (last 24h) as notifications
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentCalls } = await supabase
        .from("calls")
        .select("id, caller_number, status, created_at, summary, lead_data")
        .eq("organization_id", profile.organization_id)
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      const notifs: Notification[] = [];

      for (const call of recentCalls ?? []) {
        const hasLead = call.lead_data && typeof call.lead_data === "object";

        notifs.push({
          id: `call-${call.id}`,
          type: hasLead ? "lead" : "call",
          title: hasLead ? "New lead captured" : "Call completed",
          description: `${call.caller_number ? formatPhone(call.caller_number) : "Unknown"} — ${call.summary?.slice(0, 60) || call.status}`,
          href: `/dashboard/calls/${call.id}`,
          time: call.created_at ?? "",
          read: false,
        });
      }

      setNotifications(notifs);
    }

    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return Phone;
      case "lead": return UserPlus;
      case "subscription": return CreditCard;
      default: return AlertCircle;
    }
  };

  const getTimeAgo = (time: string) => {
    const diff = Date.now() - new Date(time).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-[18px] w-[18px] text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#F5A623] text-[10px] font-bold text-[#0A1628] flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-32px))] p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#0A1628]">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
              className="text-xs text-[#F5A623] hover:text-[#d48d0f] font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon = getIcon(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => {
                    setNotifications((prev) =>
                      prev.map((n) => n.id === notif.id ? { ...n, read: true } : n)
                    );
                    setOpen(false);
                    router.push(notif.href);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-0",
                    !notif.read && "bg-[#F5A623]/[0.03]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    notif.type === "lead" ? "bg-green-50" : "bg-blue-50"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      notif.type === "lead" ? "text-green-600" : "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#0A1628] truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {getTimeAgo(notif.time)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {notif.description}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#F5A623] flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
