"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Phone,
  BookOpen,
  Users,
  UserPlus,
  Megaphone,
  Settings,
  CreditCard,
  Code2,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { NotificationsDropdown } from "@/components/dashboard/notifications";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface SidebarProps {
  user: UserProfile;
  organization: Organization | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/agent", label: "Agents", icon: Bot },
  { href: "/dashboard/calls", label: "Calls History", icon: Phone },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/widget", label: "Website Widget", icon: Code2 },
  { href: "/dashboard/team", label: "Team", icon: UserPlus },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

function SidebarContent({ user, organization, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F5A623] to-[#FFCA5F] shadow-sm">
          <Bot className="h-5 w-5 text-[#0A1628]" />
        </div>
        <div className="font-heading">
          <span className="text-[15px] font-bold text-[#0A1628]">Aussie</span>
          <span className="text-[15px] font-bold text-[#F5A623]"> AI</span>
          <span className="text-[15px] font-bold text-[#0A1628]"> Agency</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                active
                  ? "bg-[#F5A623]/10 text-[#0A1628]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#0A1628]"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-[#F5A623]" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  active ? "text-[#F5A623]" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Notifications */}
      <div className="px-4 pb-2 flex justify-end">
        <NotificationsDropdown />
      </div>

      {/* Admin link — only for admin role */}
      {user.role === "admin" && (
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
              pathname.startsWith("/admin")
                ? "bg-red-50 text-red-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-[#0A1628]"
            )}
          >
            <Shield className={cn(
              "h-[18px] w-[18px] flex-shrink-0",
              pathname.startsWith("/admin") ? "text-red-500" : "text-gray-400"
            )} />
            Admin Panel
          </Link>
        </div>
      )}

      {/* User info */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarFallback className="bg-[#F5A623]/10 text-[#F5A623] text-xs font-semibold">
              {getInitials(user.full_name || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0A1628] truncate">
              {user.full_name || "User"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {organization?.name || "No organization"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-gray-400 hover:text-[#0A1628] hover:bg-gray-50"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user, organization }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 bg-white/95 backdrop-blur-xl border-b border-gray-200 px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="text-[#0A1628] hover:bg-gray-50"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#F5A623] to-[#FFCA5F]">
            <Bot className="h-4 w-4 text-[#0A1628]" />
          </div>
          <span className="text-sm font-bold text-[#0A1628] font-heading">
            Aussie <span className="text-[#F5A623]">AI</span> Agency
          </span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 z-10 text-gray-400 hover:text-[#0A1628]"
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarContent
              user={user}
              organization={organization}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] lg:block">
        <SidebarContent user={user} organization={organization} />
      </aside>
    </>
  );
}
