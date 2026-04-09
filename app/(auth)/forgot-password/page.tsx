"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aussieaiagency.com.au";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(10,22,40,0.12)] p-10">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0A1628] font-heading mb-2">
              Check your email
            </h2>
            <p className="text-[#6B7280] mb-6">
              We&apos;ve sent a password reset link to{" "}
              <span className="text-[#F5A623] font-semibold">{email}</span>.
              Click the link to set a new password.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
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
              Reset your password
            </h1>
            <p className="text-[#6B7280] mt-1.5 text-sm">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#F5A623] hover:bg-[#d48d0f] text-[#0A1628] font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.4)]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <p className="text-sm text-[#9BA4B5] text-center mt-5">
            Remember your password?{" "}
            <Link href="/login" className="text-[#F5A623] hover:text-[#d48d0f] font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
