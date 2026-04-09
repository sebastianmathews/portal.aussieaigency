import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const FROM_EMAIL = "info@aussieaiagency.com.au";
const FROM_NAME = "Aussie AI Agency";
const UPGRADE_URL = "https://app.aussieaiagency.com.au/dashboard/billing";

/**
 * Cron job to send trial expiry reminder emails.
 * Runs daily at 9am AEST (11pm UTC).
 *
 * Sends emails at 7, 3, and 1 day(s) before trial expiry.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all trialing subscriptions joined with the org owner's profile for email/name
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(
        "id, organization_id, current_period_end, plan"
      )
      .eq("status", "trialing")
      .not("current_period_end", "is", null);

    if (error) {
      console.error("Failed to fetch trialing subscriptions:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const now = new Date();
    let emailsSent = 0;

    for (const sub of subscriptions ?? []) {
      if (!sub.current_period_end) continue;

      const endDate = new Date(sub.current_period_end);
      const daysLeft = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only send at 7, 3, and 1 day milestones
      if (daysLeft !== 7 && daysLeft !== 3 && daysLeft !== 1) continue;

      // Get the profile (org owner) for this subscription's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("organization_id", sub.organization_id)
        .limit(1)
        .maybeSingle();

      if (!profile?.email) continue;

      const firstName = profile.full_name
        ? profile.full_name.split(" ")[0]
        : "there";
      const plan =
        sub.plan
          ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)
          : "Essential";

      const emailHtml = buildEmailHtml(daysLeft, firstName, plan);
      const subject = getSubject(daysLeft);

      try {
        await sendEmail(profile.email, subject, emailHtml);
        emailsSent++;
      } catch (emailErr) {
        console.error(
          `Failed to send trial reminder to ${profile.email}:`,
          emailErr
        );
      }
    }

    return NextResponse.json(
      { emailsSent, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Trial reminders cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

function getSubject(daysLeft: number): string {
  switch (daysLeft) {
    case 7:
      return "Your free trial ends in 7 days";
    case 3:
      return "Only 3 days left on your free trial";
    case 1:
      return "Last day of your free trial";
    default:
      return "Your free trial is ending soon";
  }
}

function buildEmailHtml(
  daysLeft: number,
  firstName: string,
  plan: string
): string {
  const navy = "#0A1628";
  const gold = "#F5A623";
  const lightGold = "#FFF8EC";
  const gray = "#6B7280";

  let heading: string;
  let bodyContent: string;

  switch (daysLeft) {
    case 7:
      heading = "Your free trial ends in 7 days";
      bodyContent = `
        <p style="color: ${navy}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${firstName},
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Just a friendly heads up &mdash; your ${plan} plan free trial wraps up in <strong style="color: ${navy};">7 days</strong>.
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          You&rsquo;ve been setting up your AI receptionist, and we&rsquo;d love for you to keep the momentum going. Your agent is ready to handle calls, capture leads, and save you hours every week.
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Upgrade now to make sure there&rsquo;s no interruption to your service.
        </p>
      `;
      break;

    case 3:
      heading = "Only 3 days left on your trial";
      bodyContent = `
        <p style="color: ${navy}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${firstName},
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Your ${plan} plan trial expires in <strong style="color: ${navy};">3 days</strong>. Here&rsquo;s what you&rsquo;ll lose if you don&rsquo;t upgrade:
        </p>
        <div style="background: ${lightGold}; border-radius: 8px; padding: 16px 20px; margin: 0 0 20px;">
          <ul style="color: ${navy}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 18px;">
            <li>Your AI receptionist will stop answering calls</li>
            <li>Website chat widget will go offline</li>
            <li>Lead capture and call summaries will pause</li>
            <li>Your phone number may be released</li>
          </ul>
        </div>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Don&rsquo;t let your setup go to waste &mdash; upgrade today and keep everything running smoothly.
        </p>
      `;
      break;

    case 1:
      heading = "Last day of your free trial";
      bodyContent = `
        <p style="color: ${navy}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${firstName},
        </p>
        <p style="color: #DC2626; font-size: 15px; line-height: 1.6; margin: 0 0 16px; font-weight: 600;">
          Your ${plan} plan trial expires today.
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          After today, your AI receptionist will stop taking calls and your widget will go offline. All your settings and training data will be saved, so you can pick up right where you left off.
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Upgrade now to keep your AI receptionist live &mdash; it takes less than a minute.
        </p>
      `;
      break;

    default:
      heading = "Your trial is ending soon";
      bodyContent = `
        <p style="color: ${navy}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${firstName},
        </p>
        <p style="color: ${gray}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Your free trial is ending soon. Upgrade to keep your AI receptionist running.
        </p>
      `;
  }

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
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #FFFFFF; padding: 40px;">
              <h2 style="color: ${navy}; font-size: 20px; font-weight: 700; margin: 0 0 20px;">
                ${heading}
              </h2>
              ${bodyContent}
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${UPGRADE_URL}" style="display: inline-block; background: ${gold}; color: ${navy}; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Upgrade Now
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
                You&rsquo;re receiving this because you signed up for a free trial.
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
