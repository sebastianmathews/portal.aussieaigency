import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEvent =
  | "call.completed"
  | "call.transferred"
  | "lead.captured"
  | "appointment.booked";

/**
 * Dispatch webhook events to all registered webhook URLs for an organization.
 * Fire-and-forget with a 5-second timeout per request.
 */
export async function dispatchWebhooks(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: webhooks } = await (supabase as any)
      .from("webhooks")
      .select("id, url, events")
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) return;

    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    const typedWebhooks = webhooks as Array<{ id: string; url: string; events: string[] | null }>;
    const promises = typedWebhooks
      .filter((wh) => {
        // If no events specified, deliver all events
        const events = wh.events as string[] | null;
        if (!events || events.length === 0) return true;
        return events.includes(event);
      })
      .map((wh) =>
        fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: AbortSignal.timeout(5000),
        }).catch((err) => {
          console.error(
            `Webhook dispatch failed for ${wh.id} (${wh.url}):`,
            err
          );
        })
      );

    // Fire-and-forget: don't await in caller context
    Promise.allSettled(promises).catch(() => {
      // Silently handle any top-level errors
    });
  } catch (err) {
    console.error("dispatchWebhooks error:", err);
  }
}
