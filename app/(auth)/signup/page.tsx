"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
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

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: businessName,
          },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // Create organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: businessName,
            owner_id: data.user.id,
          })
          .select()
          .single();

        if (orgError) {
          console.error("Error creating organization:", orgError);
        }

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            organization_id: orgData?.id,
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
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
      <div className="min-h-screen bg-navy-500 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Phone className="h-8 w-8 text-gold" />
            <span className="text-2xl font-bold text-white">
              Aussie AI Agency
            </span>
          </div>
          <Card className="bg-navy-600/50 border-navy-400/30 shadow-2xl">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-gold mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Check your email
              </h2>
              <p className="text-navy-200 mb-6">
                We&apos;ve sent a confirmation link to{" "}
                <span className="text-gold font-medium">{email}</span>. Click
                the link to activate your account.
              </p>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="border-navy-400/30 text-navy-100 hover:bg-navy-400/30 hover:text-white"
                >
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-500 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Phone className="h-8 w-8 text-gold" />
          <span className="text-2xl font-bold text-white">
            Aussie AI Agency
          </span>
        </div>

        <Card className="bg-navy-600/50 border-navy-400/30 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              Create your account
            </CardTitle>
            <CardDescription className="text-navy-200">
              Get started with your AI receptionist in minutes
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-navy-100">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-navy-700/50 border-navy-400/30 text-white placeholder:text-navy-300 focus:ring-gold focus:border-gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-navy-100">
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Smith's Plumbing"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="bg-navy-700/50 border-navy-400/30 text-white placeholder:text-navy-300 focus:ring-gold focus:border-gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-navy-100">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-navy-700/50 border-navy-400/30 text-white placeholder:text-navy-300 focus:ring-gold focus:border-gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-navy-100">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-navy-700/50 border-navy-400/30 text-white placeholder:text-navy-300 focus:ring-gold focus:border-gold"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold-600 text-navy-500 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
              <p className="text-sm text-navy-200 text-center">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-gold hover:text-gold-400 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
