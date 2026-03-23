"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aussieaiagency.com.au";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <Link href={SITE_URL} className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#F5A623] to-[#FFCA5F] rounded-xl flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5 text-[#0A1628]" />
          </div>
          <span className="font-heading font-bold text-lg text-[#0A1628]">
            Aussie<span className="text-[#F5A623]">AI</span>Agency
          </span>
        </Link>

        <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(10,22,40,0.12)] p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0A1628] font-heading">
              Welcome back
            </h1>
            <p className="text-[#6B7280] mt-1.5 text-sm">
              Sign in to manage your AI receptionist
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#0A1628] text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-[#E8ECF2] focus:border-[#F5A623] focus:ring-[#F5A623]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#0A1628] text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-[#E8ECF2] focus:border-[#F5A623] focus:ring-[#F5A623]/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.4)]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-sm text-[#9BA4B5] text-center mt-5">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#F5A623] hover:text-[#d48d0f] font-semibold"
            >
              Start free trial
            </Link>
          </p>
        </div>

        <p className="text-xs text-[#9BA4B5] text-center mt-6">
          <a href={SITE_URL} className="hover:text-[#6B7280]">
            ← Back to aussieaiagency.com.au
          </a>
        </p>
      </div>
    </div>
  );
}
