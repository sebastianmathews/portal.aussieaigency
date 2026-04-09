import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/security";

/**
 * POST /api/auth/welcome-email
 *
 * Sends a branded welcome email to new users via SendGrid.
 * Protected by an internal secret so only our own server code can call it.
 *
 * Body: { email: string, fullName: string, businessName: string }
 */
export async function POST(request: NextRequest) {
  try {
    // ---- Auth: only allow internal calls authenticated with the service-role key ----
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !expectedToken ||
      !authHeader ||
      authHeader !== `Bearer ${expectedToken}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Parse & validate body ----
    const body = await request.json();
    const { email, fullName, businessName } = body as {
      email?: string;
      fullName?: string;
      businessName?: string;
    };

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "email and fullName are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // ---- Build email ----
    const safeName = escapeHtml(fullName);
    const safeBusiness = businessName ? escapeHtml(businessName) : "";

    const dashboardUrl = "https://app.aussieaiagency.com.au/dashboard";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Aussie AI Agency</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A1628;padding:40px 40px 32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#F5A623;letter-spacing:0.5px;">
                Aussie AI Agency
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#ffffff;opacity:0.8;">
                AI-Powered Phone Receptionists for Australian Business
              </p>
            </td>
          </tr>

          <!-- Welcome Section -->
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <h2 style="margin:0 0 8px 0;font-size:24px;color:#0A1628;">
                Welcome aboard, ${safeName}!
              </h2>
              ${safeBusiness ? `<p style="margin:0 0 16px 0;font-size:15px;color:#555;">We're excited to help <strong>${safeBusiness}</strong> never miss a call again.</p>` : ""}
              <p style="margin:0 0 0 0;font-size:15px;color:#555;line-height:1.6;">
                Thank you for signing up. Your account is ready and your
                <strong style="color:#0A1628;">14-day free trial has started</strong> &mdash;
                no credit card required.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e8e8e8;margin:0;" />
            </td>
          </tr>

          <!-- Steps Section -->
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <h3 style="margin:0 0 24px 0;font-size:18px;color:#0A1628;text-align:center;">
                Get started in 3 simple steps
              </h3>

              <!-- Step 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="56" valign="top">
                    <div style="width:48px;height:48px;border-radius:50%;background-color:#0A1628;color:#F5A623;font-size:22px;font-weight:700;line-height:48px;text-align:center;">
                      1
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <p style="margin:0;font-size:16px;font-weight:600;color:#0A1628;">Create Your AI Agent</p>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#777;line-height:1.4;">Set up your virtual receptionist with a custom greeting and personality.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="56" valign="top">
                    <div style="width:48px;height:48px;border-radius:50%;background-color:#0A1628;color:#F5A623;font-size:22px;font-weight:700;line-height:48px;text-align:center;">
                      2
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <p style="margin:0;font-size:16px;font-weight:600;color:#0A1628;">Get a Phone Number</p>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#777;line-height:1.4;">Choose an Australian number or forward your existing one.</p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td width="56" valign="top">
                    <div style="width:48px;height:48px;border-radius:50%;background-color:#0A1628;color:#F5A623;font-size:22px;font-weight:700;line-height:48px;text-align:center;">
                      3
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <p style="margin:0;font-size:16px;font-weight:600;color:#0A1628;">Train Your Knowledge Base</p>
                    <p style="margin:4px 0 0 0;font-size:13px;color:#777;line-height:1.4;">Upload FAQs, business info, and scripts so your agent sounds just like you.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:24px 40px 40px 40px;text-align:center;">
              <a href="${dashboardUrl}" target="_blank" style="display:inline-block;background-color:#F5A623;color:#0A1628;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;letter-spacing:0.3px;">
                Go to Your Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0A1628;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#ffffff;">
                Need help? Simply reply to this email &mdash; a real human will get back to you.
              </p>
              <p style="margin:0;font-size:12px;color:#ffffff;opacity:0.5;">
                Aussie AI Agency &bull; Melbourne, Australia
              </p>
            </td>
          </tr>

        </table>
        <!-- /Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;

    // ---- Send via SendGrid ----
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    await sgMail.send({
      from: {
        email: "info@aussieaiagency.com.au",
        name: "Aussie AI Agency",
      },
      to: email,
      subject:
        "Welcome to Aussie AI Agency \u2014 Let\u2019s get your AI receptionist live!",
      html: htmlContent,
    });

    return NextResponse.json(
      { success: true, message: `Welcome email sent to ${email}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
