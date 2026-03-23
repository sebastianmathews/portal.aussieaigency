"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bot, Loader2, CheckCircle2, Shield, Clock, Headphones } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aussieaiagency.com.au";

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter — $297/mo",
  growth: "Growth — $497/mo",
  scale: "Scale — $997/mo",
};

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F5A623]" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const isTrial = searchParams.get("trial") === "true";
  const planId = searchParams.get("plan");

  // Pre-fill from marketing site form (query params)
  const [fullName, setFullName] = useState(searchParams.get("name") ?? "");
  const [businessName, setBusinessName] = useState(searchParams.get("business") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: businessName,
            plan: planId || "starter",
            trial: isTrial,
          },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // Create org + profile via server-side API (bypasses RLS)
        const completeRes = await fetch("/api/auth/signup-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName,
            fullName,
          }),
        });

        if (!completeRes.ok) {
          console.error("Failed to complete signup setup");
        }
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(10,22,40,0.12)] p-10">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0A1628] font-heading mb-2">
              Check your email
            </h2>
            <p className="text-[#6B7280] mb-6">
              We&apos;ve sent a confirmation link to{" "}
              <span className="text-[#F5A623] font-semibold">{email}</span>.
              Click it to activate your account and start your free trial.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          {/* Logo */}
          <Link href={SITE_URL} className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F5A623] to-[#FFCA5F] rounded-xl flex items-center justify-center shadow-sm">
              <Bot className="h-5 w-5 text-[#0A1628]" />
            </div>
            <span className="font-heading font-bold text-lg text-[#0A1628]">
              Aussie<span className="text-[#F5A623]">AI</span>Agency
            </span>
          </Link>

          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(10,22,40,0.12)] p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#0A1628] font-heading">
                {isTrial ? "Start your 14-day free trial" : "Create your account"}
              </h1>
              <p className="text-[#6B7280] mt-1.5 text-sm">
                {isTrial
                  ? "No credit card required. Cancel anytime."
                  : "Get your AI receptionist up and running in minutes."}
              </p>
            </div>

            {/* Plan badge */}
            {planId && PLAN_NAMES[planId] && (
              <div className="mb-6 flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-lg px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-[#F5A623]" />
                <span className="text-sm font-medium text-[#0A1628]">
                  {PLAN_NAMES[planId]}
                </span>
                {isTrial && (
                  <span className="text-xs text-[#F5A623] font-semibold ml-auto">
                    14 days free
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[#0A1628] text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 border-[#E8ECF2] focus:border-[#F5A623] focus:ring-[#F5A623]/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-[#0A1628] text-sm font-medium">
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Smith's Plumbing"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="h-11 border-[#E8ECF2] focus:border-[#F5A623] focus:ring-[#F5A623]/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#0A1628] text-sm font-medium">
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@smithsplumbing.com.au"
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
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Creating account...
                  </>
                ) : isTrial ? (
                  "Start Free Trial"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="text-sm text-[#9BA4B5] text-center mt-5">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#F5A623] hover:text-[#d48d0f] font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-xs text-[#9BA4B5] text-center mt-4">
            By signing up, you agree to our{" "}
            <a href={`${SITE_URL}/legal/terms`} className="underline hover:text-[#6B7280]">
              Terms
            </a>{" "}
            and{" "}
            <a href={`${SITE_URL}/legal/privacy`} className="underline hover:text-[#6B7280]">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Right panel — trust signals (hidden on mobile) */}
      <div className="hidden lg:flex w-[480px] bg-[#0A1628] items-center justify-center p-12">
        <div className="max-w-[340px]">
          <h2 className="text-2xl font-bold text-white font-heading mb-3">
            Your AI receptionist is{" "}
            <span className="text-[#F5A623]">minutes away</span>
          </h2>
          <p className="text-white/60 text-sm mb-10 leading-relaxed">
            Join hundreds of Australian businesses using AI to never miss a call again.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Setup in under 5 minutes</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Choose a voice, set your greeting, and go live.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">No credit card required</p>
                <p className="text-white/50 text-sm mt-0.5">
                  14-day free trial. Cancel anytime, no questions asked.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">24/7 AI answering</p>
                <p className="text-white/50 text-sm mt-0.5">
                  Never miss a lead, even outside business hours.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-2 text-[#F5A623] text-sm font-semibold">
              <span className="text-lg">★★★★★</span>
            </div>
            <p className="text-white/80 text-sm mt-2 italic">
              &quot;Set it up in one afternoon. Now our AI handles 200+ calls a month
              while we focus on growing the business.&quot;
            </p>
            <p className="text-white/40 text-xs mt-2">
              — Sarah M., Mortgage Broker, Sydney
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
