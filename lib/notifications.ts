import { getTwilioClient } from "@/lib/twilio";

export interface CallSMSParams {
  ownerPhone: string;
  callerNumber: string;
  duration: number;
  summary: string | null;
  status: string;
  agentName: string;
}

/**
 * Format seconds into "X min Y sec" string.
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 sec";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

/**
 * Send an SMS notification to the business owner after a call.
 * Message is capped at 320 chars (2 SMS segments).
 */
export async function sendCallSMS(params: CallSMSParams): Promise<void> {
  const { ownerPhone, callerNumber, duration, summary, status, agentName } =
    params;

  const twilioNumber = process.env.TWILIO_SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!twilioNumber) {
    throw new Error("Missing TWILIO_SMS_FROM_NUMBER or TWILIO_PHONE_NUMBER environment variable");
  }

  const outcome = summary
    ? summary.length > 80
      ? summary.slice(0, 77) + "..."
      : summary
    : status;

  let message =
    `\u{1F4DE} ${agentName} just handled a call\n\n` +
    `Caller: ${callerNumber}\n` +
    `Duration: ${formatDuration(duration)}\n` +
    `Outcome: ${outcome}\n\n` +
    `View details: https://app.aussieaiagency.com.au/dashboard/calls`;

  // Cap at 320 chars (2 SMS segments)
  if (message.length > 320) {
    message = message.slice(0, 317) + "...";
  }

  const client = getTwilioClient();

  await client.messages.create({
    body: message,
    from: twilioNumber,
    to: ownerPhone,
  });
}

// ─── Unresolved Call Alerts ─────────────────────────────────────────────────

export interface UnresolvedCallAlertParams {
  ownerEmail: string;
  ownerPhone?: string;
  smsEnabled: boolean;
  callerNumber: string;
  callTime: string;
  callId: string;
  status: string;
  duration: number;
  summary: string | null;
  transcriptExcerpt: string | null;
  agentName: string;
}

/**
 * Determine if a call is "unresolved" and warrants an alert.
 */
export function isUnresolvedCall(status: string, duration: number): boolean {
  return (
    status === "failed" ||
    status === "transferred" ||
    duration < 15 // hung up quickly
  );
}

/**
 * Send an unresolved call alert via SMS and/or email.
 */
export async function sendUnresolvedCallAlert(
  params: UnresolvedCallAlertParams
): Promise<void> {
  const {
    ownerEmail,
    ownerPhone,
    smsEnabled,
    callerNumber,
    callTime,
    callId,
    status,
    duration,
    summary,
    transcriptExcerpt,
    agentName,
  } = params;

  const callUrl = `https://app.aussieaiagency.com.au/dashboard/calls/${callId}`;
  const formattedTime = new Date(callTime).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ── SMS alert ──
  if (smsEnabled && ownerPhone) {
    try {
      const twilioNumber =
        process.env.TWILIO_SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
      if (twilioNumber) {
        let smsBody =
          `\u26A0\uFE0F Unresolved call from ${callerNumber} at ${formattedTime}. ` +
          `Your AI couldn't fully help them. Follow up? View: ${callUrl}`;

        if (smsBody.length > 320) {
          smsBody = smsBody.slice(0, 317) + "...";
        }

        const client = getTwilioClient();
        await client.messages.create({
          body: smsBody,
          from: twilioNumber,
          to: ownerPhone,
        });
      }
    } catch (err) {
      console.error("Failed to send unresolved call SMS:", err);
    }
  }

  // ── Email alert ──
  try {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey || !ownerEmail) return;

    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(sendgridKey);

    const statusLabel =
      status === "failed"
        ? "Failed"
        : status === "transferred"
          ? "Transferred"
          : duration < 15
            ? "Hung Up (short call)"
            : "Unresolved";

    const transcriptSection = transcriptExcerpt
      ? `
        <tr>
          <td style="padding:16px 24px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Transcript Excerpt</p>
            <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:13px;color:#4b5563;line-height:1.6;border:1px solid #e5e7eb;">
              ${transcriptExcerpt.replace(/\n/g, "<br/>")}
            </div>
          </td>
        </tr>`
      : "";

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unresolved Call Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0A1628;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#F5A623;font-size:20px;font-weight:700;">Aussie AI Agency</h1>
            </td>
          </tr>
          <!-- Alert -->
          <tr>
            <td style="padding:24px;">
              <div style="background:#FEF3C7;border-left:4px solid #F5A623;border-radius:8px;padding:16px;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#92400E;">
                  \u26A0\uFE0F Unresolved Call Alert
                </p>
                <p style="margin:8px 0 0;font-size:13px;color:#78350F;">
                  ${agentName} couldn&apos;t fully assist a caller. You may want to follow up.
                </p>
              </div>
            </td>
          </tr>
          <!-- Details -->
          <tr>
            <td style="padding:0 24px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;width:40%;">Caller</td>
                  <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb;">${callerNumber}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Time</td>
                  <td style="padding:10px 16px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${formattedTime}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Status</td>
                  <td style="padding:10px 16px;font-size:13px;color:#DC2626;font-weight:600;border-bottom:1px solid #e5e7eb;">${statusLabel}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;">Duration</td>
                  <td style="padding:10px 16px;font-size:13px;color:#111827;">${formatDuration(duration)}</td>
                </tr>
              </table>
            </td>
          </tr>
          ${summary ? `
          <tr>
            <td style="padding:0 24px 16px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Summary</p>
              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">${summary}</p>
            </td>
          </tr>` : ""}
          ${transcriptSection}
          <!-- CTA -->
          <tr>
            <td style="padding:16px 24px 32px;" align="center">
              <a href="${callUrl}" style="display:inline-block;background-color:#F5A623;color:#0A1628;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Follow Up Now
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Aussie AI Agency &mdash; Your AI Receptionist
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sgMail.send({
      to: ownerEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || "info@aussieaiagency.com.au",
        name: "Aussie AI Agency",
      },
      subject: `\u26A0\uFE0F Unresolved call from ${callerNumber}`,
      html: htmlContent,
    });
  } catch (err) {
    console.error("Failed to send unresolved call email:", err);
  }
}
