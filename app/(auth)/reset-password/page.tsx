"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(10,22,40,0.12)] p-10">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0A1628] font-heading mb-2">
              Password updated!
            </h2>
            <p className="text-[#6B7280]">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
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
              Set new password
            </h1>
            <p className="text-[#6B7280] mt-1.5 text-sm">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#0A1628] text-sm font-medium">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 border-[#E8ECF2] focus:border-[#F5A623] focus:ring-[#F5A623]/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-[#0A1628] text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
