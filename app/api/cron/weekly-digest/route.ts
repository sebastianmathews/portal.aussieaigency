import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "info@aussieaiagency.com.au";
const FROM_NAME = "Aussie AI Agency";
const DASHBOARD_URL = "https://app.aussieaiagency.com.au/dashboard";

/**
 * Weekly digest cron job.
 * Runs every Sunday at 11pm UTC (Monday 9am AEST).
 *
 * Sends a branded HTML email to each org with active/trialing subscription
 * summarising the past 7 days of call activity.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all active / trialing subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id, organization_id, plan")
      .in("status", ["active", "trialing"]);

    if (subError) {
      console.error("Failed to fetch subscriptions:", subError);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let emailsSent = 0;

    for (const sub of subscriptions ?? []) {
      try {
        // Get org name
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", sub.organization_id)
          .single();

        const businessName = org?.name ?? "Your Business";

        // Get profile (org owner) for email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("organization_id", sub.organization_id)
          .limit(1)
          .maybeSingle();

        if (!profile?.email) continue;

        // Get calls from last 7 days
        const { data: currentCalls } = await supabase
          .from("calls")
          .select("id, duration, summary, lead_data, appointment_booked, status")
          .eq("organization_id", sub.organization_id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .lte("created_at", now.toISOString());

        // Get calls from previous 7 days for comparison
        const { data: previousCalls } = await supabase
          .from("calls")
          .select("id")
          .eq("organization_id", sub.organization_id)
          .gte("created_at", fourteenDaysAgo.toISOString())
          .lt("created_at", sevenDaysAgo.toISOString());

        const calls = currentCalls ?? [];
        const prevCallCount = previousCalls?.length ?? 0;

        // Skip if no calls at all (don't send empty digests)
        if (calls.length === 0 && prevCallCount === 0) continue;

        // Calculate stats
        const totalCalls = calls.length;
        const totalMinutes = Math.round(
          calls.reduce((sum, c) => sum + (c.duration ?? 0), 0) / 60
        );
        const leadsCapured = calls.filter(
          (c) => c.lead_data && Object.keys(c.lead_data as Record<string, unknown>).length > 0
        ).length;
        const appointmentsBooked = calls.filter(
          (c) => c.appointment_booked
        ).length;

        // Comparison text
        let comparisonText: string;
        if (prevCallCount === 0 && totalCalls > 0) {
          comparisonText = "First week with calls — great start!";
        } else if (prevCallCount === 0 && totalCalls === 0) {
          comparisonText = "No calls yet — your AI receptionist is ready to go!";
        } else if (totalCalls > prevCallCount) {
          const pct = Math.round(
            ((totalCalls - prevCallCount) / prevCallCount) * 100
          );
          comparisonText = `&uarr; ${pct}% more calls than last week`;
        } else if (totalCalls < prevCallCount) {
          const pct = Math.round(
            ((prevCallCount - totalCalls) / prevCallCount) * 100
          );
          comparisonText = `&darr; ${pct}% fewer calls than last week`;
        } else {
          comparisonText = "Same number of calls as last week";
        }

        // Top 3 call reasons from summaries
        const reasons = extractTopReasons(calls);

        const firstName = profile.full_name
          ? profile.full_name.split(" ")[0]
          : "there";

        const emailHtml = buildDigestHtml({
          firstName,
          businessName,
          totalCalls,
          totalMinutes,
          leadsCapured,
          appointmentsBooked,
          comparisonText,
          topReasons: reasons,
        });

        const subject = `Your Weekly AI Receptionist Report — ${businessName}`;

        await sendEmail(profile.email, subject, emailHtml);
        emailsSent++;
      } catch (orgError) {
        console.error(
          `Failed to send digest for org ${sub.organization_id}:`,
          orgError
        );
      }
    }

    return NextResponse.json(
      { emailsSent, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Weekly digest cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

/**
 * Extract top 3 call reasons from call summaries using simple keyword frequency.
 */
function extractTopReasons(
  calls: Array<{ summary?: string | null }>
): string[] {
  const reasonCounts: Record<string, number> = {};

  for (const call of calls) {
    if (!call.summary) continue;
    // Use the first sentence or full summary as a reason bucket
    const reason = call.summary
      .split(/[.!?]/)[0]
      .trim()
      .substring(0, 80);
    if (reason.length > 0) {
      const normalised = reason.toLowerCase();
      reasonCounts[normalised] = (reasonCounts[normalised] ?? 0) + 1;
    }
  }

  return Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason.charAt(0).toUpperCase() + reason.slice(1));
}

interface DigestData {
  firstName: string;
  businessName: string;
  totalCalls: number;
  totalMinutes: number;
  leadsCapured: number;
  appointmentsBooked: number;
  comparisonText: string;
  topReasons: string[];
}

function buildDigestHtml(data: DigestData): string {
  const navy = "#0A1628";
  const gold = "#F5A623";
  const gray = "#6B7280";
  const lightGold = "#FFF8EC";

  const reasonRows = data.topReasons.length > 0
    ? data.topReasons
        .map(
          (r, i) => `
      <tr>
        <td style="padding: 8px 0; color: ${navy}; font-size: 14px; border-bottom: 1px solid #F3F4F6;">
          <span style="display: inline-block; background: ${gold}; color: ${navy}; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; margin-right: 10px;">${i + 1}</span>
          ${r}
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td style="padding: 8px 0; color: ${gray}; font-size: 14px;">No call summaries available yet</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Header -->
          <tr>
            <td style="background: ${navy}; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="color: ${gold}; font-size: 22px; font-weight: 700; margin: 0;">
                Aussie AI Agency
              </h1>
              <p style="color: #9CA3AF; font-size: 13px; margin: 8px 0 0;">
                Weekly Performance Report
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #FFFFFF; padding: 40px;">
              <p style="color: ${navy}; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
                Hi ${data.firstName},
              </p>
              <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Here&rsquo;s how your AI receptionist performed for <strong style="color: ${navy};">${data.businessName}</strong> this past week.
              </p>

              <!-- Stats Grid -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td width="50%" style="padding: 0 8px 12px 0;">
                    <div style="background: ${lightGold}; border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="color: ${navy}; font-size: 28px; font-weight: 700; margin: 0;">${data.totalCalls}</p>
                      <p style="color: ${gray}; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Calls</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 0 0 12px 8px;">
                    <div style="background: ${lightGold}; border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="color: ${navy}; font-size: 28px; font-weight: 700; margin: 0;">${data.totalMinutes}</p>
                      <p style="color: ${gray}; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Minutes</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 0 8px 0 0;">
                    <div style="background: ${lightGold}; border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="color: ${navy}; font-size: 28px; font-weight: 700; margin: 0;">${data.leadsCapured}</p>
                      <p style="color: ${gray}; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Leads Captured</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 0 0 0 8px;">
                    <div style="background: ${lightGold}; border-radius: 10px; padding: 20px; text-align: center;">
                      <p style="color: ${navy}; font-size: 28px; font-weight: 700; margin: 0;">${data.appointmentsBooked}</p>
                      <p style="color: ${gray}; font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Appointments Booked</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Comparison -->
              <div style="background: #F9FAFB; border-radius: 8px; padding: 14px 20px; margin: 0 0 24px; text-align: center;">
                <p style="color: ${navy}; font-size: 14px; font-weight: 600; margin: 0;">
                  ${data.comparisonText}
                </p>
              </div>

              <!-- Top Reasons -->
              <h3 style="color: ${navy}; font-size: 16px; font-weight: 700; margin: 0 0 12px;">
                Top Call Reasons
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                ${reasonRows}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${DASHBOARD_URL}" style="display: inline-block; background: ${gold}; color: ${navy}; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      View Full Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center;">
              <p style="color: ${gray}; font-size: 12px; line-height: 1.5; margin: 0;">
                Aussie AI Agency &mdash; AI receptionists for Australian businesses.
              </p>
              <p style="color: #9CA3AF; font-size: 11px; margin: 8px 0 0;">
                You&rsquo;re receiving this weekly digest because you have an active subscription.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set");
  }

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: "text/html", value: htmlContent }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${errorText}`);
  }
}
