"use client";

import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  Search,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

interface PhoneNumberPickerProps {
  currentNumber: string | null;
  onNumberProvisioned: (phoneNumber: string) => void;
  subscriptionStatus?: string | null;
}

export function PhoneNumberPicker({
  currentNumber,
  onNumberProvisioned,
  subscriptionStatus,
}: PhoneNumberPickerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [areaCode, setAreaCode] = useState("");
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [searching, setSearching] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);

  const searchNumbers = async () => {
    setSearching(true);
    setNumbers([]);

    try {
      const res = await fetch("/api/twilio/search-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCode: areaCode || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search numbers");
      }

      const data = await res.json();
      setNumbers(data.numbers ?? []);

      if (data.numbers?.length === 0) {
        toast({
          title: "No numbers found",
          description: "Try a different area code or leave it empty to see all available numbers.",
        });
      }
    } catch (err) {
      toast({
        title: "Search failed",
        description: err instanceof Error ? err.message : "Could not search for numbers",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const provisionNumber = async (phoneNumber: string) => {
    setProvisioning(phoneNumber);

    try {
      const res = await fetch("/api/twilio/provision-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: "AU", phoneNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to provision number");
      }

      const data = await res.json();

      toast({
        title: "Number activated",
        description: `${data.phoneNumber} is now your AI agent's phone number.`,
      });

      onNumberProvisioned(data.phoneNumber);
      setOpen(false);
    } catch (err) {
      toast({
        title: "Failed to activate number",
        description: err instanceof Error ? err.message : "Could not provision the number",
        variant: "destructive",
      });
    } finally {
      setProvisioning(null);
    }
  };

  const formatPhone = (phone: string) => {
    // Format Australian numbers nicely
    if (phone.startsWith("+61")) {
      const local = phone.slice(3);
      if (local.length === 9) {
        return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
      }
    }
    return phone;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-5 w-5 text-[#F5A623]" />
          Phone Number
        </CardTitle>
        <CardDescription>
          Your AI agent will answer calls on this number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentNumber ? (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-lg">{formatPhone(currentNumber)}</p>
                <p className="text-sm text-muted-foreground">Active - receiving calls</p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Change Number
                </Button>
              </DialogTrigger>
              <NumberPickerDialog
                areaCode={areaCode}
                setAreaCode={setAreaCode}
                numbers={numbers}
                searching={searching}
                provisioning={provisioning}
                searchNumbers={searchNumbers}
                provisionNumber={provisionNumber}
                formatPhone={formatPhone}
              />
            </Dialog>
          </div>
        ) : subscriptionStatus === "trialing" ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/50 text-center">
            <Phone className="h-10 w-10 text-amber-500 mb-3" />
            <p className="font-medium text-[#0A1628] mb-1">Phone numbers available on paid plans</p>
            <p className="text-sm text-muted-foreground mb-1">
              During your free trial, test your AI agent using the web widget on your dashboard.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to get a dedicated Australian phone number for your AI receptionist.
            </p>
            <a href="/dashboard/billing">
              <Button variant="gold" className="gap-2">
                Upgrade to Get a Number
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-200 text-center">
            <AlertCircle className="h-10 w-10 text-[#F5A623] mb-3" />
            <p className="font-medium text-[#0A1628] mb-1">No phone number assigned</p>
            <p className="text-sm text-muted-foreground mb-4">
              Choose an Australian phone number for your AI agent to receive calls on.
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="gold" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get a Phone Number
                </Button>
              </DialogTrigger>
              <NumberPickerDialog
                areaCode={areaCode}
                setAreaCode={setAreaCode}
                numbers={numbers}
                searching={searching}
                provisioning={provisioning}
                searchNumbers={searchNumbers}
                provisionNumber={provisionNumber}
                formatPhone={formatPhone}
              />
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NumberPickerDialog({
  areaCode,
  setAreaCode,
  numbers,
  searching,
  provisioning,
  searchNumbers,
  provisionNumber,
  formatPhone,
}: {
  areaCode: string;
  setAreaCode: (v: string) => void;
  numbers: AvailableNumber[];
  searching: boolean;
  provisioning: string | null;
  searchNumbers: () => void;
  provisionNumber: (phone: string) => void;
  formatPhone: (phone: string) => string;
}) {
  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Choose a Phone Number</DialogTitle>
        <DialogDescription>
          Search for available Australian phone numbers. Your AI agent will answer calls on the number you choose.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="area-code" className="sr-only">
              Area Code
            </Label>
            <Input
              id="area-code"
              placeholder="Area code (e.g. 02, 03) or leave empty"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchNumbers()}
            />
          </div>
          <Button
            onClick={searchNumbers}
            disabled={searching}
            className="gap-2"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>

        {/* Hints */}
        <div className="flex flex-wrap gap-1.5">
          {["02", "03", "07", "08"].map((code) => (
            <Button
              key={code}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setAreaCode(code);
              }}
            >
              {code} -{" "}
              {code === "02"
                ? "Sydney/ACT"
                : code === "03"
                  ? "Melbourne/TAS"
                  : code === "07"
                    ? "Brisbane/QLD"
                    : "Perth/SA"}
            </Button>
          ))}
        </div>

        {/* Results */}
        {numbers.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {numbers.map((num) => (
              <div
                key={num.phoneNumber}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-[#F5A623]/50 hover:bg-[#F5A623]/[0.02] transition-colors"
              >
                <div>
                  <p className="font-medium">{formatPhone(num.phoneNumber)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {num.locality && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {num.locality}
                        {num.region ? `, ${num.region}` : ""}
                      </span>
                    )}
                    <div className="flex gap-1">
                      {num.capabilities.voice && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          Voice
                        </Badge>
                      )}
                      {num.capabilities.sms && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          SMS
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="gold"
                  disabled={provisioning !== null}
                  onClick={() => provisionNumber(num.phoneNumber)}
                  className="gap-1.5"
                >
                  {provisioning === num.phoneNumber ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!searching && numbers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Click Search to find available Australian phone numbers.
          </p>
        )}
      </div>
    </DialogContent>
  );
}
