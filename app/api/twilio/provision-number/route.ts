import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAvailableNumbers, provisionNumber } from "@/lib/twilio";
import { checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 3 provisions per hour (expensive Twilio operation)
    const ip = getClientIp(request);
    const rl = checkRateLimit(`provision:${user.id}:${ip}`, 3, 3600_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { countryCode, areaCode, phoneNumber: requestedNumber } = body;

    if (!countryCode) {
      return NextResponse.json(
        { error: "countryCode is required" },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: membership, error: memberError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = membership?.organization_id;
    if (memberError || !orgId) {
      return NextResponse.json(
        { error: "No organization found for user" },
        { status: 404 }
      );
    }

    // If a specific number was requested, use it directly
    // Otherwise search and pick the first available
    let numberToProvision: string;

    if (requestedNumber) {
      numberToProvision = requestedNumber;
    } else {
      const availableNumbers = await searchAvailableNumbers(
        countryCode,
        areaCode || undefined
      );

      if (availableNumbers.length === 0) {
        return NextResponse.json(
          { error: "No available numbers found for the specified criteria" },
          { status: 404 }
        );
      }

      numberToProvision = availableNumbers[0].phoneNumber;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const webhookUrl = `${baseUrl}/api/webhooks/twilio/incoming`;

    const provisioned = await provisionNumber(
      numberToProvision,
      webhookUrl
    );

    // Update organization with the new Twilio number
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        twilio_number: provisioned.phoneNumber,
      })
      .eq("id", orgId);

    if (updateError) {
      console.error("Failed to update organization:", updateError);
      return NextResponse.json(
        { error: "Number provisioned but failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        phoneNumber: provisioned.phoneNumber,
        sid: provisioned.sid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Provision number error:", error);
    return NextResponse.json(
      { error: "Failed to provision phone number" },
      { status: 500 }
    );
  }
}
